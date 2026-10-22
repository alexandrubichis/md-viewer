#!/usr/bin/python3
"""Dev tool: open a Markdown file, save screenshots, then quit.

Usage: tools/snapshot.py FILE.md OUT_PREFIX [light|dark] [narrow|normal|wide|full]
Writes OUT_PREFIX-page.png (the whole document) and OUT_PREFIX-window.png.
Uses a 1200x900 window and doesn't change the saved settings.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

import mdview  # noqa: E402
from mdview import Adw, Gio, GLib, Gtk, WebKit  # noqa: E402


def main():
    md_path, out = sys.argv[1], sys.argv[2]
    scheme = sys.argv[3] if len(sys.argv) > 3 else None
    width = sys.argv[4] if len(sys.argv) > 4 else "normal"

    app = mdview.Application()
    app.set_flags(app.get_flags() | Gio.ApplicationFlags.NON_UNIQUE)

    def on_startup(_app):
        app.settings.update(
            page_width=width, window_width=1200, window_height=900, maximized=False
        )
        if scheme:
            forced = Adw.ColorScheme.FORCE_DARK if scheme == "dark" else Adw.ColorScheme.FORCE_LIGHT
            Adw.StyleManager.get_default().set_color_scheme(forced)

    def save_window(win):
        paintable = Gtk.WidgetPaintable.new(win)
        snap = Gtk.Snapshot()
        paintable.snapshot(snap, win.get_width(), win.get_height())
        texture = win.get_renderer().render_texture(snap.to_node(), None)
        texture.save_to_png(f"{out}-window.png")

    def on_page_snapshot(view, result, win):
        view.get_snapshot_finish(result).save_to_png(f"{out}-page.png")
        save_window(win)
        app.quit()

    def take():
        win = app.get_active_window()
        win.view.get_snapshot(
            WebKit.SnapshotRegion.FULL_DOCUMENT,
            WebKit.SnapshotOptions.NONE,
            None,
            on_page_snapshot,
            win,
        )
        return GLib.SOURCE_REMOVE

    def on_open(*_):
        win = app.get_active_window() or app.get_windows()[0]
        win.view.get_settings().set_enable_write_console_messages_to_stdout(True)
        GLib.timeout_add(2500, take)

    app.connect("startup", on_startup)
    app.connect_after("open", on_open)  # After the window exists.
    return app.run([sys.argv[0], md_path])


if __name__ == "__main__":
    sys.exit(main())
