# MD Viewer

A simple Markdown viewer for GNOME. Open a `.md` file and read it in a clean
window. No browser, no editor.

- Follows the system light/dark style and accent color, like other GNOME apps
- Tables, task lists and syntax-highlighted code
- Reloads automatically when the file is saved, keeping your place
- Links open in your browser; links to other `.md` files open in the viewer
- Open files with <kbd>Ctrl</kbd>+<kbd>O</kbd> or by dropping them on the window

## Install

Download `mdview_<version>_all.deb` from the
[Releases](https://github.com/alexandrubichis/md-viewer/releases) page and
double-click it, or run:

```sh
sudo apt install ./mdview_1.0.0_all.deb
```

apt installs the dependencies (GTK 4, libadwaita, WebKitGTK 6) automatically.
Requires Ubuntu 24.10 or newer (libadwaita 1.6+).

Then open a Markdown file with **Open With → MD Viewer**, or from a terminal:

```sh
mdview README.md
```

## Keyboard shortcuts

| Shortcut                    | Action        |
|-----------------------------|---------------|
| <kbd>Ctrl</kbd>+<kbd>O</kbd> | Open file    |
| <kbd>F5</kbd> / <kbd>Ctrl</kbd>+<kbd>R</kbd> | Reload |
| <kbd>Ctrl</kbd>+<kbd>+</kbd> / <kbd>-</kbd> / <kbd>0</kbd> | Zoom in / out / reset |
| <kbd>Ctrl</kbd>+<kbd>W</kbd> / <kbd>Esc</kbd> | Close window |
| <kbd>Ctrl</kbd>+<kbd>Q</kbd> | Quit         |

## Development

Install the runtime dependencies, then run the app straight from the source tree:

```sh
sudo apt install python3-gi gir1.2-gtk-4.0 gir1.2-adw-1 gir1.2-webkit-6.0
./mdview.py samples/test.md
```

Use the system Python (`/usr/bin/python3`). Conda or other Python installs
can't load the system GTK libraries.

Build the `.deb` package (needs only `dpkg-deb`):

```sh
./build-deb.sh    # writes dist/mdview_<version>_all.deb
```

Save screenshots of a rendered file, for checking changes:

```sh
tools/snapshot.py samples/test.md /tmp/shot dark   # or light
```

## Credits

Markdown rendering uses [marked](https://github.com/markedjs/marked),
[DOMPurify](https://github.com/cure53/DOMPurify) and
[highlight.js](https://highlightjs.org/), included in `assets/vendor/`.
