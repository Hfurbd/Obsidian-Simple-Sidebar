# Obsidian-Simple-Sidebar
Adds a small box with a Home button, clock and customizeable text to the lest sidebar of obsidian
# Simple Sidebar Header v5.1

A customizable LifeOS header injected into Obsidian's native File Explorer. It contains only:

- A Home button.
- The customizeable label.
- A digital clock.

## Mobile support

it works there too

## Install / upgrade

1. Extract this archive into `<vault>/.obsidian/plugins`
2. enable **LifeOS Header**.
3. If needed, run **LifeOS: Refresh header** from the command palette.

## Settings

### Home note and clock

- Choose Home note from a searchable picker. Paths can be entered without `.md`, for example `Home` or `Dashboards/Home`.
- 12-hour or 24-hour clock.
- Show or hide the clock.

### Icon and layout

- Lucide icon name supported by Obsidian, e.g. `house`, `home`, `house-plug`, `orbit`, `command`, `star`.
- Optional custom icon image from your vault: SVG, PNG, JPG/JPEG, WebP, or GIF.
- Header placement: above the tree, inside the top of the tree, or below the tree.
- Sidebar target: all File Explorers, left only, right only. The side preference is applied on desktop; mobile displays in its available File Explorer view.
- Content alignment: left, center, right.
- Home button shape: square, soft square, rounded, circle, pill.
- Header panel shape: square, soft square, rounded.

### Colors

Independent solid-color pickers for:

- Header background and border.
- Home button background and border.
- Home icon.
- LifeOS title.
- Clock.

### Sizing

Desktop and mobile can have separate values for:

- LifeOS font size.
- Clock font size.
- Home button size.
- Icon size.

Additional controls include button/text gap and panel padding.

## Notes

- Custom icon image files are stored in your vault; the plugin stores their vault-relative path.
- If that image is renamed or moved, choose it again in settings.
- The header is designed for the native File Explorer. It does not insert itself into third-party file browser views.
- Manual verification in the user's specific desktop/mobile Obsidian builds is still required.
