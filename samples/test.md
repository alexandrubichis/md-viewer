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
sudo apt install ./mdview_1.0.0_all.deb
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

## Image

![Sample image](image.svg)

---

Press <kbd>Ctrl</kbd> + <kbd>O</kbd> to open another file.

<script>document.body.innerHTML = "raw scripts are removed"</script>
<img src="x" onerror="document.body.innerHTML='inline handlers are removed'">
