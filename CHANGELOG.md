# Changelog

All notable changes to MD Viewer are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.3.0] - 2026-11-06

### Added
- Back and forward through followed links, returning to the same scroll
  position: header bar buttons, <kbd>Alt</kbd>+<kbd>←</kbd> /
  <kbd>Alt</kbd>+<kbd>→</kbd>, or the mouse side buttons. Links to headings
  in the same document are part of the history too.
- Find in document (<kbd>Ctrl</kbd>+<kbd>F</kbd>) with a match count.
  <kbd>Enter</kbd> / <kbd>Shift</kbd>+<kbd>Enter</kbd> or
  <kbd>Ctrl</kbd>+<kbd>G</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>G</kbd>
  go to the next / previous match.

### Changed
- <kbd>Esc</kbd> closes the find bar first, then the window.
- A link to a missing file shows a notification instead of replacing the
  current document with an error page.

## [1.2.1] - 2026-10-22

### Fixed
- Works on Ubuntu 24.04 (libadwaita 1.5). The system accent color is used on
  libadwaita 1.6 and newer; older versions use the standard Adwaita blue.

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

[1.3.0]: https://github.com/alexandrubichis/md-viewer/compare/v1.2.1...v1.3.0
[1.2.1]: https://github.com/alexandrubichis/md-viewer/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/alexandrubichis/md-viewer/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/alexandrubichis/md-viewer/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/alexandrubichis/md-viewer/releases/tag/v1.0.0
