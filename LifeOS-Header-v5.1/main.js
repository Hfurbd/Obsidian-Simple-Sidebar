const { Plugin, PluginSettingTab, Setting, SuggestModal, Notice, setIcon, Platform } = require("obsidian");

const DEFAULT_SETTINGS = {
  homeNote: "Home",
  clockFormat: "12h",
  showClock: true,
  icon: "house",
  customIconPath: "",
  alignment: "left",
  placement: "above-tree",
  target: "all",
  buttonShape: "soft-square",
  panelShape: "rounded",
  panelBackground: "#080D18",
  panelBorder: "#263451",
  buttonBackground: "#17112A",
  buttonBorder: "#B000FF",
  iconColor: "#F2E9FF",
  titleColor: "#F0F2FA",
  clockColor: "#5792FF",
  titleFontSize: 22,
  clockFontSize: 11,
  buttonSize: 50,
  iconSize: 23,
  horizontalGap: 12,
  panelPadding: 11,
  mobileSeparateSizing: true,
  mobileTitleFontSize: 20,
  mobileClockFontSize: 10,
  mobileButtonSize: 46,
  mobileIconSize: 21
};

const COLOR_SETTINGS = [
  ["panelBackground", "Header background", "Solid background of the LifeOS header."],
  ["panelBorder", "Header border", "Border around the header panel."],
  ["buttonBackground", "Home button background", "Solid background behind the Home icon."],
  ["buttonBorder", "Home button border", "Border around the Home button."],
  ["iconColor", "Home icon color", "Color of the Home icon."],
  ["titleColor", "LifeOS text color", "Color of the LifeOS label."],
  ["clockColor", "Clock color", "Color of the digital clock."]
];

function cleanPath(value) {
  return String(value || "").trim().replace(/^\/+|\/+$/g, "");
}

function withoutMarkdownExtension(value) {
  return cleanPath(value).replace(/\.md$/i, "");
}

function validHex(value, fallback) {
  const candidate = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate : fallback;
}

function boundedNumber(value, fallback, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}

class HomeNoteSuggestModal extends SuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("Search for your Home note…");
    this.setInstructions([
      { command: "↑↓", purpose: "Navigate" },
      { command: "↵", purpose: "Select Home note" }
    ]);
  }

  getSuggestions(query) {
    const needle = String(query || "").toLowerCase();
    return this.app.vault.getMarkdownFiles()
      .filter(file => !needle || file.basename.toLowerCase().includes(needle) || file.path.toLowerCase().includes(needle))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  renderSuggestion(file, element) {
    element.createDiv({ text: file.basename, cls: "lifeos-note-suggestion-name" });
    element.createDiv({ text: file.parent?.path || "Vault root", cls: "lifeos-note-suggestion-path" });
  }

  onChooseSuggestion(file) {
    if (file) this.onChoose(file);
  }
}

class ImageSuggestModal extends SuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder("Search for an icon image in your vault…");
  }

  getSuggestions(query) {
    const needle = String(query || "").toLowerCase();
    const supported = ["svg", "png", "jpg", "jpeg", "webp", "gif"];
    return this.app.vault.getFiles()
      .filter(file => supported.includes(file.extension.toLowerCase()))
      .filter(file => !needle || file.path.toLowerCase().includes(needle))
      .sort((a, b) => a.path.localeCompare(b.path));
  }

  renderSuggestion(file, element) {
    element.createDiv({ text: file.name, cls: "lifeos-note-suggestion-name" });
    element.createDiv({ text: file.path, cls: "lifeos-note-suggestion-path" });
  }

  onChooseSuggestion(file) {
    if (file) this.onChoose(file);
  }
}

class LifeOSHeaderSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  addSlider(container, name, desc, key, min, max, unit = "px") {
    new Setting(container)
      .setName(name)
      .setDesc(desc)
      .addSlider(slider => slider
        .setLimits(min, max, 1)
        .setValue(this.plugin.settings[key])
        .setDynamicTooltip()
        .onChange(async value => {
          this.plugin.settings[key] = Math.round(value);
          await this.plugin.saveSettings();
        }))
      .addExtraButton(button => button
        .setIcon("rotate-ccw")
        .setTooltip("Reset to default")
        .onClick(async () => {
          this.plugin.settings[key] = DEFAULT_SETTINGS[key];
          await this.plugin.saveSettings();
          this.display();
        }));
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "LifeOS Header" });
    containerEl.createEl("p", {
      text: "Customize the Home button, LifeOS label and clock shown inside the native File Explorer. The header is injected into every available File Explorer view, including mobile, rather than relying on a desktop-only left-sidebar selector.",
      cls: "setting-item-description"
    });

    containerEl.createEl("h3", { text: "Home note and clock" });
    new Setting(containerEl)
      .setName("Home note")
      .setDesc("Choose the Markdown note opened by the Home button. The .md extension is hidden.")
      .addText(text => text
        .setPlaceholder("Home")
        .setValue(withoutMarkdownExtension(this.plugin.settings.homeNote))
        .onChange(async value => {
          this.plugin.settings.homeNote = withoutMarkdownExtension(value);
          await this.plugin.saveSettings();
        }))
      .addButton(button => button.setButtonText("Choose note").onClick(() => this.plugin.openHomePicker()));

    new Setting(containerEl)
      .setName("Clock format")
      .addDropdown(dropdown => dropdown
        .addOption("12h", "12-hour")
        .addOption("24h", "24-hour")
        .setValue(this.plugin.settings.clockFormat)
        .onChange(async value => {
          this.plugin.settings.clockFormat = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Show clock")
      .setDesc("Hide or show the clock without removing the LifeOS label.")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showClock)
        .onChange(async value => {
          this.plugin.settings.showClock = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "Icon and layout" });
    new Setting(containerEl)
      .setName("Home icon (Lucide name)")
      .setDesc("Enter a Lucide icon name supported by Obsidian, for example house, home, house-plug, orbit, command, or star. A custom image below takes precedence.")
      .addText(text => text
        .setPlaceholder("house")
        .setValue(this.plugin.settings.icon)
        .onChange(async value => {
          this.plugin.settings.icon = value.trim() || "house";
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Custom icon image")
      .setDesc("Optionally choose an SVG, PNG, JPG, WebP or GIF stored in your vault. Clear it to use the Lucide icon name above.")
      .addText(text => text
        .setPlaceholder("No custom image selected")
        .setValue(this.plugin.settings.customIconPath || "")
        .setDisabled(true))
      .addButton(button => button.setButtonText("Choose image").onClick(() => this.plugin.openImagePicker()))
      .addExtraButton(button => button
        .setIcon("x")
        .setTooltip("Clear custom image")
        .onClick(async () => {
          this.plugin.settings.customIconPath = "";
          await this.plugin.saveSettings();
          this.display();
        }));

    new Setting(containerEl)
      .setName("Header placement")
      .setDesc("Choose where the header sits relative to the File Explorer tree.")
      .addDropdown(dropdown => dropdown
        .addOption("above-tree", "Above the file tree (recommended)")
        .addOption("tree-top", "Inside the tree, at the top")
        .addOption("tree-bottom", "Below the file tree")
        .setValue(this.plugin.settings.placement)
        .onChange(async value => {
          this.plugin.settings.placement = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Sidebar location")
      .setDesc("Choose which File Explorer sidebar receives the header. On mobile, the header appears in the available File Explorer view regardless of this desktop-side preference.")
      .addDropdown(dropdown => dropdown
        .addOption("all", "Every File Explorer")
        .addOption("left", "Left sidebar only")
        .addOption("right", "Right sidebar only")
        .setValue(this.plugin.settings.target)
        .onChange(async value => {
          this.plugin.settings.target = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Content alignment")
      .addDropdown(dropdown => dropdown
        .addOption("left", "Left")
        .addOption("center", "Center")
        .addOption("right", "Right")
        .setValue(this.plugin.settings.alignment)
        .onChange(async value => {
          this.plugin.settings.alignment = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Home button shape")
      .addDropdown(dropdown => dropdown
        .addOption("square", "Square")
        .addOption("soft-square", "Soft square")
        .addOption("rounded", "Rounded")
        .addOption("circle", "Circle")
        .addOption("pill", "Pill")
        .setValue(this.plugin.settings.buttonShape)
        .onChange(async value => {
          this.plugin.settings.buttonShape = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName("Header panel shape")
      .addDropdown(dropdown => dropdown
        .addOption("square", "Square")
        .addOption("soft-square", "Soft square")
        .addOption("rounded", "Rounded")
        .setValue(this.plugin.settings.panelShape)
        .onChange(async value => {
          this.plugin.settings.panelShape = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl("h3", { text: "Colors" });
    containerEl.createEl("p", {
      text: "Choose solid colors. The plugin does not add gradients; changes apply to the header without requiring a theme CSS edit.",
      cls: "setting-item-description"
    });
    for (const [key, name, desc] of COLOR_SETTINGS) {
      new Setting(containerEl)
        .setName(name)
        .setDesc(desc)
        .addColorPicker(color => color
          .setValue(validHex(this.plugin.settings[key], DEFAULT_SETTINGS[key]))
          .onChange(async value => {
            this.plugin.settings[key] = validHex(value, DEFAULT_SETTINGS[key]);
            await this.plugin.saveSettings();
          }))
        .addExtraButton(button => button
          .setIcon("rotate-ccw")
          .setTooltip("Reset to default")
          .onClick(async () => {
            this.plugin.settings[key] = DEFAULT_SETTINGS[key];
            await this.plugin.saveSettings();
            this.display();
          }));
    }

    containerEl.createEl("h3", { text: "Desktop sizing" });
    this.addSlider(containerEl, "LifeOS font size", "Size of the LifeOS label.", "titleFontSize", 12, 34);
    this.addSlider(containerEl, "Clock font size", "Size of the digital clock.", "clockFontSize", 8, 18);
    this.addSlider(containerEl, "Home button size", "Width and height of the Home button.", "buttonSize", 32, 76);
    this.addSlider(containerEl, "Icon size", "Size of the icon inside the Home button.", "iconSize", 12, 42);
    this.addSlider(containerEl, "Gap", "Space between the Home button and LifeOS text.", "horizontalGap", 2, 28);
    this.addSlider(containerEl, "Panel padding", "Space inside the header panel.", "panelPadding", 0, 28);

    containerEl.createEl("h3", { text: "Mobile sizing" });
    new Setting(containerEl)
      .setName("Use separate mobile sizes")
      .setDesc("When enabled, the following sizes apply on narrow screens and mobile devices.")
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.mobileSeparateSizing)
        .onChange(async value => {
          this.plugin.settings.mobileSeparateSizing = value;
          await this.plugin.saveSettings();
        }));
    this.addSlider(containerEl, "Mobile LifeOS font size", "Mobile label size.", "mobileTitleFontSize", 12, 32);
    this.addSlider(containerEl, "Mobile clock font size", "Mobile clock size.", "mobileClockFontSize", 8, 18);
    this.addSlider(containerEl, "Mobile Home button size", "Mobile button width and height.", "mobileButtonSize", 32, 72);
    this.addSlider(containerEl, "Mobile icon size", "Mobile Home icon size.", "mobileIconSize", 12, 40);

    containerEl.createEl("h3", { text: "Maintenance" });
    new Setting(containerEl)
      .setName("Refresh header")
      .setDesc("Re-scan available File Explorer views. Useful after changing sidebar layout or switching to mobile.")
      .addButton(button => button.setButtonText("Refresh").onClick(() => this.plugin.refreshHeaders()));
  }
}

module.exports = class LifeOSHeaderPlugin extends Plugin {
  async onload() {
    const stored = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, stored || {});
    this.normalizeSettings();
    this.addSettingTab(new LifeOSHeaderSettingTab(this.app, this));

    this.addCommand({
      id: "lifeos-open-home",
      name: "LifeOS: Open Home note",
      callback: () => this.openHome()
    });
    this.addCommand({
      id: "lifeos-refresh-header",
      name: "LifeOS: Refresh header",
      callback: () => this.refreshHeaders()
    });

    this.registerEvent(this.app.workspace.on("layout-change", () => this.queueRefresh()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.queueRefresh()));
    this.registerEvent(this.app.vault.on("create", () => this.queueRefresh()));
    this.registerEvent(this.app.vault.on("delete", () => this.queueRefresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.queueRefresh()));

    this.observer = new MutationObserver(() => this.queueRefresh());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.register(() => this.observer.disconnect());

    this.registerDomEvent(window, "resize", () => this.queueRefresh());
    this.registerInterval(window.setInterval(() => this.updateClocks(), 15000));
    this.app.workspace.onLayoutReady(() => this.queueRefresh());
  }

  normalizeSettings() {
    const s = this.settings;
    s.homeNote = withoutMarkdownExtension(s.homeNote || "Home");
    s.clockFormat = s.clockFormat === "24h" ? "24h" : "12h";
    s.showClock = s.showClock !== false;
    s.icon = String(s.icon || "house").trim() || "house";
    s.customIconPath = String(s.customIconPath || "").trim();
    s.alignment = ["left", "center", "right"].includes(s.alignment) ? s.alignment : DEFAULT_SETTINGS.alignment;
    s.placement = ["above-tree", "tree-top", "tree-bottom"].includes(s.placement) ? s.placement : DEFAULT_SETTINGS.placement;
    s.target = ["all", "left", "right"].includes(s.target) ? s.target : DEFAULT_SETTINGS.target;
    s.buttonShape = ["square", "soft-square", "rounded", "circle", "pill"].includes(s.buttonShape) ? s.buttonShape : DEFAULT_SETTINGS.buttonShape;
    s.panelShape = ["square", "soft-square", "rounded"].includes(s.panelShape) ? s.panelShape : DEFAULT_SETTINGS.panelShape;
    for (const [key] of COLOR_SETTINGS) s[key] = validHex(s[key], DEFAULT_SETTINGS[key]);
    const limits = {
      titleFontSize: [12, 34], clockFontSize: [8, 18], buttonSize: [32, 76], iconSize: [12, 42],
      horizontalGap: [2, 28], panelPadding: [0, 28], mobileTitleFontSize: [12, 32],
      mobileClockFontSize: [8, 18], mobileButtonSize: [32, 72], mobileIconSize: [12, 40]
    };
    for (const [key, [min, max]] of Object.entries(limits)) {
      s[key] = boundedNumber(s[key], DEFAULT_SETTINGS[key], min, max);
    }
    s.mobileSeparateSizing = s.mobileSeparateSizing !== false;
  }

  async saveSettings() {
    this.normalizeSettings();
    await this.saveData(this.settings);
    this.refreshHeaders();
  }

  openImagePicker() {
    new ImageSuggestModal(this.app, async file => {
      this.settings.customIconPath = file.path;
      await this.saveSettings();
      new Notice(`LifeOS icon set to ${file.name}`);
    }).open();
  }

  openHomePicker() {
    new HomeNoteSuggestModal(this.app, async file => {
      this.settings.homeNote = withoutMarkdownExtension(file.path);
      await this.saveSettings();
      new Notice(`Home note set to ${file.basename}`);
    }).open();
  }

  getFileExplorerViews() {
    const views = [];
    const addView = (root, view = null, treeOverride = null) => {
      if (!root) return;
      const tree = treeOverride || root.querySelector?.(".nav-files-container");
      if (!tree || views.some(item => item.tree === tree)) return;
      views.push({ root, tree, view });
    };

    for (const leaf of this.app.workspace.getLeavesOfType("file-explorer")) {
      addView(leaf.view?.containerEl, leaf.view);
    }

    // Scan mounted tree containers directly as well. This is important on
    // mobile, where the sidebar is a drawer and has no desktop split class.
    document.querySelectorAll(".nav-files-container").forEach(tree => {
      const root = tree.closest(".workspace-leaf-content") || tree.closest(".view-content") || tree.parentElement;
      addView(root, null, tree);
    });

    // Side targeting is a desktop-only preference. On mobile, show the header
    // in the available File Explorer no matter which drawer Obsidian uses.
    const mobileDevice = Boolean(
      Platform?.isMobile || Platform?.isIosApp || Platform?.isAndroidApp ||
      (window.matchMedia && window.matchMedia("(pointer: coarse)").matches)
    );
    if (!mobileDevice && this.settings.target !== "all") {
      return views.filter(item => {
        const left = item.root.closest(".mod-left-split, .workspace-split.mod-left-split");
        const right = item.root.closest(".mod-right-split, .workspace-split.mod-right-split");
        return this.settings.target === "left" ? Boolean(left) : Boolean(right);
      });
    }
    return views;
  }

  queueRefresh() {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    requestAnimationFrame(() => {
      this.refreshQueued = false;
      this.refreshHeaders();
    });
  }

  refreshHeaders() {
    for (const item of this.getFileExplorerViews()) this.injectInto(item.root, item.tree);
    this.updateClocks();
  }

  injectInto(root, tree) {
    if (!root?.isConnected || !tree?.isConnected) return;

    let header = tree.parentElement?.querySelector(":scope > .lifeos-header-v5") || tree.querySelector(":scope > .lifeos-header-v5");
    if (!header) header = this.createHeader();

    this.applyHeaderSettings(header);
    const parent = this.getPlacementParent(root, tree);
    if (!parent) return;
    const expectedBefore = this.settings.placement === "above-tree" ? tree : null;
    if (this.settings.placement === "above-tree") {
      if (header.parentElement !== parent || header.nextElementSibling !== expectedBefore) parent.insertBefore(header, tree);
    } else if (this.settings.placement === "tree-top") {
      if (header.parentElement !== tree || tree.firstElementChild !== header) tree.prepend(header);
    } else {
      if (header.parentElement !== parent || header.nextElementSibling !== null) parent.appendChild(header);
    }
  }

  getPlacementParent(root, tree) {
    if (this.settings.placement === "tree-top") return tree;
    return tree.parentElement || root;
  }

  createHeader() {
    const header = document.createElement("div");
    header.className = "lifeos-header-v5";

    const row = header.createDiv({ cls: "lifeos-header-v5-row" });
    const home = row.createEl("button", {
      cls: "lifeos-header-v5-home",
      attr: { type: "button", "aria-label": "Open Home note", title: "Open Home note" }
    });
    home.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      this.openHome();
    });
    const textStack = row.createDiv({ cls: "lifeos-header-v5-text" });
    textStack.createDiv({ cls: "lifeos-header-v5-title", text: "LifeOS" });
    textStack.createDiv({ cls: "lifeos-header-v5-clock" });
    return header;
  }

  getButtonRadius() {
    const map = { square: "0px", "soft-square": "8px", rounded: "14px", circle: "50%", pill: "999px" };
    return map[this.settings.buttonShape] || "8px";
  }

  getPanelRadius() {
    const map = { square: "0px", "soft-square": "8px", rounded: "14px" };
    return map[this.settings.panelShape] || "14px";
  }

  applyHeaderSettings(header) {
    const s = this.settings;
    header.style.setProperty("--lifeos-panel-bg", s.panelBackground);
    header.style.setProperty("--lifeos-panel-border", s.panelBorder);
    header.style.setProperty("--lifeos-button-bg", s.buttonBackground);
    header.style.setProperty("--lifeos-button-border", s.buttonBorder);
    header.style.setProperty("--lifeos-icon-color", s.iconColor);
    header.style.setProperty("--lifeos-title-color", s.titleColor);
    header.style.setProperty("--lifeos-clock-color", s.clockColor);
    header.style.setProperty("--lifeos-title-size", `${s.titleFontSize}px`);
    header.style.setProperty("--lifeos-clock-size", `${s.clockFontSize}px`);
    header.style.setProperty("--lifeos-button-size", `${s.buttonSize}px`);
    header.style.setProperty("--lifeos-icon-size", `${s.iconSize}px`);
    header.style.setProperty("--lifeos-gap", `${s.horizontalGap}px`);
    header.style.setProperty("--lifeos-padding", `${s.panelPadding}px`);
    header.style.setProperty("--lifeos-button-radius", this.getButtonRadius());
    header.style.setProperty("--lifeos-panel-radius", this.getPanelRadius());
    header.style.setProperty("--lifeos-mobile-title-size", `${s.mobileTitleFontSize}px`);
    header.style.setProperty("--lifeos-mobile-clock-size", `${s.mobileClockFontSize}px`);
    header.style.setProperty("--lifeos-mobile-button-size", `${s.mobileButtonSize}px`);
    header.style.setProperty("--lifeos-mobile-icon-size", `${s.mobileIconSize}px`);
    header.style.setProperty("justify-content", s.alignment === "center" ? "center" : s.alignment === "right" ? "flex-end" : "flex-start");
    header.dataset.alignment = s.alignment;
    header.dataset.showClock = s.showClock ? "true" : "false";
    header.dataset.mobileSeparate = s.mobileSeparateSizing ? "true" : "false";

    const button = header.querySelector(".lifeos-header-v5-home");
    if (button) {
      const imageFile = s.customIconPath ? this.app.vault.getAbstractFileByPath(s.customIconPath) : null;
      const hasImage = Boolean(imageFile && imageFile.extension && ["svg", "png", "jpg", "jpeg", "webp", "gif"].includes(imageFile.extension.toLowerCase()));
      const iconKey = hasImage ? `image:${imageFile.path}` : `lucide:${s.icon}`;
      if (button.dataset.lifeosIconKey !== iconKey) {
        button.replaceChildren();
        if (hasImage) {
          const image = document.createElement("img");
          image.className = "lifeos-header-v5-custom-icon";
          image.alt = "";
          image.src = this.app.vault.getResourcePath(imageFile);
          button.appendChild(image);
        } else {
          try { setIcon(button, s.icon); } catch (e) { setIcon(button, "house"); }
        }
        button.dataset.lifeosIconKey = iconKey;
      }
      button.setAttribute("aria-label", "Open Home note");
      button.setAttribute("title", `Open ${s.homeNote || "Home"}`);
    }
  }

  resolveHomeNote() {
    const configured = withoutMarkdownExtension(this.settings.homeNote || "Home");
    if (!configured) return null;
    const exact = this.app.vault.getAbstractFileByPath(`${configured}.md`);
    if (exact && exact.extension === "md") return exact;
    const matches = this.app.vault.getMarkdownFiles().filter(file =>
      file.path.replace(/\.md$/i, "").toLowerCase() === configured.toLowerCase() ||
      (!configured.includes("/") && file.basename.toLowerCase() === configured.toLowerCase())
    );
    return matches.length === 1 ? matches[0] : null;
  }

  async openHome() {
    const file = this.resolveHomeNote();
    if (!file) {
      new Notice("Choose your Home note in Settings → LifeOS Header.");
      this.openHomePicker();
      return;
    }
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
  }

  updateClocks() {
    const now = new Date();
    const value = now.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: this.settings.clockFormat !== "24h"
    });
    document.querySelectorAll(".lifeos-header-v5-clock").forEach(el => {
      if (el.textContent !== value) el.textContent = value;
    });
  }
};
