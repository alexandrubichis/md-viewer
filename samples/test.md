---
title: Front matter is hidden
---

# MD Viewer sample

A short paragraph with **bold**, *italic*, ~~strikethrough~~, `inline code`,
a [web link](https://www.gnome.org), a [link to a heading](#code-blocks) and
a [link to another file](other.md).

> Quotes get an accent-colored bar.
>
> They can span several paragraphs.

## Lists

- First item
- Second item
  - Nested item
  - Another nested item
- Third item

1. Step one
2. Step two
3. Step three

### Task list

- [x] Write the viewer
- [x] Follow the system theme
- [ ] Build the `.deb`

## Code blocks

```python
def greet(name: str) -> str:
    """Return a friendly greeting."""
    return f"Hello, {name}!"
```

```sh
sudo apt install ./mdview_1.2.0_all.deb
```

```
Plain block with no language.
```

## Table

| Feature        | Status | Notes                    |
|----------------|:------:|--------------------------|
| Tables         | ✅     | With horizontal scroll   |
| Live reload    | ✅     | Keeps the scroll position |
| Math           | ⏳     | Planned for version 2    |

### Wide table

| Version | Date       | Platform        | Toolkit           | Renderer          | Package format  | Highlights                                   |
|---------|------------|-----------------|-------------------|-------------------|-----------------|----------------------------------------------|
| 1.0.0   | 2026-10-22 | Ubuntu 24.10+   | GTK 4, libadwaita | WebKitGTK 6       | .deb            | First release                                |
| 1.1.0   | 2026-10-22 | Ubuntu 24.10+   | GTK 4, libadwaita | WebKitGTK 6       | .deb            | Ctrl + mouse wheel zoom                      |
| 1.2.0   | 2026-10-22 | Ubuntu 24.10+   | GTK 4, libadwaita | WebKitGTK 6       | .deb            | Page width setting, wide tables and code     |

```python
settings = {"page_width": "normal", "window_width": 860, "window_height": 920, "maximized": False, "comment": "a long line"}
```

## Image

![Sample image](image.svg)

---

Press <kbd>Ctrl</kbd> + <kbd>O</kbd> to open another file.

<script>document.body.innerHTML = "raw scripts are removed"</script>
<img src="x" onerror="document.body.innerHTML='inline handlers are removed'">
