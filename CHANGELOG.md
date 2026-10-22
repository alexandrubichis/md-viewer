# Changelog

All notable changes to MD Viewer are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-10-22

### Added
- Page width setting in the main menu: Narrow, Normal, Wide or Full Width.
  <kbd>Ctrl</kbd>+<kbd>]</kbd> makes the page wider, <kbd>Ctrl</kbd>+<kbd>[</kbd>
  narrower.
- Style setting in the main menu: Follow System, Light or Dark.
- Tables and code blocks that don't fit the text column grow wider (centered,
  up to 1100px) instead of scrolling sideways.
- Settings and the window size are remembered between sessions
  (`~/.config/mdview/settings.json`).

### Changed
- The default text column is slightly wider (760px instead of 720px).

## [1.1.0] - 2026-10-22

### Added
- Zoom in and out with <kbd>Ctrl</kbd> + mouse wheel (or touchpad scroll).

## [1.0.0] - 2026-10-22

### Added
- Markdown viewer window built with GTK 4, libadwaita and WebKitGTK 6.
- Follows the system light/dark style and accent color.
- Tables, task lists, strikethrough and syntax-highlighted code blocks.
- Live reload when the file is saved, keeping the scroll position.
- Open files from the command line, with <kbd>Ctrl</kbd>+<kbd>O</kbd>, by
  drag-and-drop, or with **Open With** in Files.
- Links open in the default browser; links to `.md` files open in the viewer.
- Zoom with <kbd>Ctrl</kbd>+<kbd>+</kbd> / <kbd>-</kbd> / <kbd>0</kbd>.
- Raw HTML in documents is sanitized; scripts don't run.
- `.deb` package with app icon, menu entry and App Center metadata.

[1.2.0]: https://github.com/alexandrubichis/md-viewer/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/alexandrubichis/md-viewer/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/alexandrubichis/md-viewer/releases/tag/v1.0.0
