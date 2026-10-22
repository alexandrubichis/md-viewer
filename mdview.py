#!/usr/bin/python3
"""MD Viewer: a simple Markdown viewer for GNOME."""

import json
import os
import sys

import gi

gi.require_version("Gtk", "4.0")
gi.require_version("Adw", "1")
gi.require_version("WebKit", "6.0")
from gi.repository import Adw, Gdk, Gio, GLib, Gtk, WebKit  # noqa: E402

APP_ID = "io.github.alexandrubichis.MdView"
APP_NAME = "MD Viewer"
VERSION = "1.2.1"

HERE = os.path.dirname(os.path.realpath(__file__))
ASSETS = os.path.join(HERE, "assets")
DEV_ICONS = os.path.join(HERE, "data", "icons")

MD_SUFFIXES = (".md", ".markdown", ".mdown", ".mkd", ".mkdn")
MD_MIME_TYPES = ("text/markdown", "text/x-markdown")

# Adwaita "view" colors, so the page matches the rest of the window.
PAGE_BG = {False: "#ffffff", True: "#1d1d20"}

# System accent colors need libadwaita 1.6 (GNOME 47). Older versions,
# such as Ubuntu 24.04's 1.5, always use the Adwaita blue.
HAS_ACCENT = hasattr(Adw.StyleManager, "get_accent_color_rgba")
DEFAULT_ACCENT = "#3584e4"
DEFAULT_LINK = {False: "#1c71d8", True: "#78aeed"}

ZOOM_MIN, ZOOM_MAX, ZOOM_STEP = 0.5, 3.0, 0.1

PAGE_WIDTHS = ("narrow", "normal", "wide", "full")
THEMES = {
    "system": Adw.ColorScheme.DEFAULT,
    "light": Adw.ColorScheme.FORCE_LIGHT,
    "dark": Adw.ColorScheme.FORCE_DARK,
}
# Settings that are one of a fixed set of choices, each shown as a radio
# group in the app menu through a stateful action ("page_width" -> "app.page-width").
CHOICES = {"page_width": PAGE_WIDTHS, "theme": tuple(THEMES)}

SETTINGS_PATH = os.path.join(GLib.get_user_config_dir(), "mdview", "settings.json")
DEFAULT_SETTINGS = {
    "theme": "system",
    "page_width": "normal",
    "window_width": 860,
    "window_height": 920,
    "maximized": False,
}

# Context menu entries worth keeping; navigation entries make no sense here.
KEEP_MENU_ACTIONS = {
    WebKit.ContextMenuAction.COPY,
    WebKit.ContextMenuAction.COPY_LINK_TO_CLIPBOARD,
    WebKit.ContextMenuAction.COPY_IMAGE_TO_CLIPBOARD,
    WebKit.ContextMenuAction.COPY_IMAGE_URL_TO_CLIPBOARD,
    WebKit.ContextMenuAction.SELECT_ALL,
    WebKit.ContextMenuAction.INSPECT_ELEMENT,
}


def is_markdown(gfile):
    return (gfile.get_basename() or "").lower().endswith(MD_SUFFIXES)


def load_settings():
    settings = dict(DEFAULT_SETTINGS)
    try:
        with open(SETTINGS_PATH, encoding="utf-8") as f:
            saved = json.load(f)
    except (OSError, ValueError):
        return settings
    if isinstance(saved, dict):
        for key, default in DEFAULT_SETTINGS.items():
            if type(saved.get(key)) is type(default):
                settings[key] = saved[key]
    for key, choices in CHOICES.items():
        if settings[key] not in choices:
            settings[key] = DEFAULT_SETTINGS[key]
    return settings


def save_settings(settings):
    try:
        os.makedirs(os.path.dirname(SETTINGS_PATH), exist_ok=True)
        tmp = SETTINGS_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
        os.replace(tmp, SETTINGS_PATH)
    except OSError as e:
        print(f"mdview: could not save settings: {e}", file=sys.stderr)


def display_dir(gfile):
    parent = gfile.get_parent()
    if parent is None or parent.get_path() is None:
        return gfile.get_uri()
    path = parent.get_path()
    home = GLib.get_home_dir()
    if path == home or path.startswith(home + os.sep):
        path = "~" + path[len(home):]
    return path


class Window(Adw.ApplicationWindow):
    def __init__(self, app):
        settings = app.settings
        super().__init__(
            application=app,
            default_width=settings["window_width"],
            default_height=settings["window_height"],
        )
        if settings["maximized"]:
            self.maximize()
        self.connect("close-request", lambda *_: app.remember_window(self))
        self.file = None
        self._text = ""
        self._base_uri = None
        self._page_ready = False
        self._monitor = None
        self._reload_id = 0

        with open(os.path.join(ASSETS, "template.html"), encoding="utf-8") as f:
            assets_uri = Gio.File.new_for_path(ASSETS).get_uri()
            self._template = f.read().replace("{{ASSETS}}", assets_uri)

        self._build_ui()
        self._add_actions()

        style = Adw.StyleManager.get_default()
        style.connect("notify::dark", lambda *_: self._push_theme())
        if HAS_ACCENT:
            style.connect("notify::accent-color", lambda *_: self._push_theme())
        self._push_theme()

    # UI

    def _build_ui(self):
        self.title = Adw.WindowTitle(title=APP_NAME)

        header = Adw.HeaderBar(title_widget=self.title)
        open_button = Gtk.Button(
            icon_name="document-open-symbolic",
            tooltip_text="Open… (Ctrl+O)",
            action_name="win.open",
        )
        header.pack_start(open_button)

        menu = Gio.Menu()
        section = Gio.Menu()
        section.append("Open…", "win.open")
        section.append("Reload", "win.reload")
        menu.append_section(None, section)
        section = Gio.Menu()
        section.append("Zoom In", "win.zoom-in")
        section.append("Zoom Out", "win.zoom-out")
        section.append("Reset Zoom", "win.zoom-reset")
        menu.append_section(None, section)
        section = Gio.Menu()
        for label, name in (
            ("Narrow", "narrow"),
            ("Normal", "normal"),
            ("Wide", "wide"),
            ("Full Width", "full"),
        ):
            section.append(label, f"app.page-width::{name}")
        menu.append_section("Page Width", section)
        section = Gio.Menu()
        for label, name in (
            ("Follow System", "system"),
            ("Light", "light"),
            ("Dark", "dark"),
        ):
            section.append(label, f"app.theme::{name}")
        menu.append_section("Style", section)
        section = Gio.Menu()
        section.append(f"About {APP_NAME}", "app.about")
        menu.append_section(None, section)
        header.pack_end(
            Gtk.MenuButton(
                icon_name="open-menu-symbolic",
                menu_model=menu,
                primary=True,
                tooltip_text="Main Menu",
            )
        )

        self.view = WebKit.WebView(vexpand=True, hexpand=True)
        settings = self.view.get_settings()
        settings.set_enable_developer_extras("MDVIEW_DEBUG" in os.environ)
        settings.set_enable_back_forward_navigation_gestures(False)
        settings.set_javascript_can_open_windows_automatically(False)
        self.view.connect("load-changed", self._on_load_changed)
        self.view.connect("decide-policy", self._on_decide_policy)
        self.view.connect("context-menu", self._on_context_menu)

        open_button2 = Gtk.Button(
            label="Open File…",
            action_name="win.open",
            halign=Gtk.Align.CENTER,
            css_classes=["pill", "suggested-action"],
        )
        welcome = Adw.StatusPage(
            icon_name=APP_ID,
            title=APP_NAME,
            description="Open a Markdown file or drop one here",
            child=open_button2,
        )
        self.error_page = Adw.StatusPage(icon_name="dialog-error-symbolic")

        self.stack = Gtk.Stack()
        self.stack.add_named(welcome, "welcome")
        self.stack.add_named(self.error_page, "error")
        self.stack.add_named(self.view, "document")

        toolbar = Adw.ToolbarView(content=self.stack)
        toolbar.add_top_bar(header)
        self.set_content(toolbar)

        # Capture phase, so dropped files reach us before the web view.
        drop = Gtk.DropTarget.new(Gdk.FileList, Gdk.DragAction.COPY)
        drop.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        drop.connect("drop", self._on_drop)
        self.add_controller(drop)

        # Ctrl + mouse wheel zooms; capture phase again, so the page doesn't scroll.
        scroll = Gtk.EventControllerScroll(
            flags=Gtk.EventControllerScrollFlags.VERTICAL
            | Gtk.EventControllerScrollFlags.DISCRETE
        )
        scroll.set_propagation_phase(Gtk.PropagationPhase.CAPTURE)
        scroll.connect("scroll", self._on_scroll)
        self.add_controller(scroll)

    def _add_actions(self):
        for name, callback in (
            ("open", self._on_open),
            ("reload", lambda *_: self.reload()),
            ("zoom-in", lambda *_: self._zoom(ZOOM_STEP)),
            ("zoom-out", lambda *_: self._zoom(-ZOOM_STEP)),
            ("zoom-reset", lambda *_: self._zoom(None)),
        ):
            action = Gio.SimpleAction(name=name)
            action.connect("activate", callback)
            self.add_action(action)

    # Opening files

    def open_file(self, gfile):
        try:
            data, _etag = gfile.load_contents(None)[1:]
        except GLib.Error as e:
            self._show_error(gfile, e.message)
            return
        self.file = gfile
        self._text = data.decode("utf-8", errors="replace").lstrip("﻿")
        self._watch(gfile)

        name = gfile.get_basename()
        self.title.set_title(name)
        self.title.set_subtitle(display_dir(gfile))
        self.set_title(name)

        self._base_uri = gfile.get_uri()
        self._page_ready = False
        self.view.load_html(self._template, self._base_uri)
        self.stack.set_visible_child_name("document")

    def reload(self):
        if self.file is None:
            return
        try:
            data = self.file.load_contents(None)[1]
        except GLib.Error:
            return  # Keep showing the last good version.
        self._text = data.decode("utf-8", errors="replace").lstrip("﻿")
        if self._page_ready:
            self._push_render(keep_scroll=True)

    def _show_error(self, gfile, message):
        self.error_page.set_title("Could Not Open File")
        self.error_page.set_description(f"{gfile.get_basename()}: {message}")
        self.title.set_title(APP_NAME)
        self.title.set_subtitle("")
        self.stack.set_visible_child_name("error")

    def _on_open(self, *_):
        md_filter = Gtk.FileFilter(name="Markdown")
        for mime in MD_MIME_TYPES:
            md_filter.add_mime_type(mime)
        for suffix in MD_SUFFIXES:
            md_filter.add_suffix(suffix[1:])
        all_filter = Gtk.FileFilter(name="All Files")
        all_filter.add_pattern("*")
        filters = Gio.ListStore.new(Gtk.FileFilter)
        filters.append(md_filter)
        filters.append(all_filter)

        dialog = Gtk.FileDialog(filters=filters, default_filter=md_filter)
        if self.file is not None and self.file.get_parent() is not None:
            dialog.set_initial_folder(self.file.get_parent())
        dialog.open(self, None, self._on_open_finish)

    def _on_open_finish(self, dialog, result):
        try:
            gfile = dialog.open_finish(result)
        except GLib.Error:
            return  # Dismissed.
        self.open_file(gfile)

    def _on_drop(self, _target, value, _x, _y):
        files = value.get_files()
        if not files:
            return False
        self.open_file(files[0])
        if len(files) > 1:
            self.get_application().open(files[1:], "")
        return True

    # Live reload

    def _watch(self, gfile):
        if self._monitor is not None:
            self._monitor.cancel()
            self._monitor = None
        parent = gfile.get_parent()
        if parent is None:
            return
        # Watch the folder, not the file: many editors save by writing a
        # new file and renaming it over the old one.
        try:
            self._monitor = parent.monitor_directory(
                Gio.FileMonitorFlags.WATCH_MOVES, None
            )
        except GLib.Error:
            return
        self._monitor.connect("changed", self._on_dir_changed)

    def _on_dir_changed(self, _monitor, gfile, other, event):
        if self.file is None:
            return
        if not (gfile.equal(self.file) or (other is not None and other.equal(self.file))):
            return
        if event == Gio.FileMonitorEvent.DELETED:
            return
        if self._reload_id:
            GLib.source_remove(self._reload_id)
        self._reload_id = GLib.timeout_add(150, self._on_reload_timeout)

    def _on_reload_timeout(self):
        self._reload_id = 0
        self.reload()
        return GLib.SOURCE_REMOVE

    # Web view

    def _run_js(self, script):
        self.view.evaluate_javascript(script, -1, None, None, None, None, None)

    def _push_render(self, keep_scroll):
        args = f"{json.dumps(self._text)}, {json.dumps(keep_scroll)}"
        self._run_js(f"mdview.render({args});")

    def _push_theme(self):
        style = Adw.StyleManager.get_default()
        dark = style.get_dark()
        if HAS_ACCENT:
            accent = style.get_accent_color_rgba().to_string()
            link = Adw.AccentColor.to_standalone_rgba(style.get_accent_color(), dark)
            link = link.to_string()
        else:
            accent, link = DEFAULT_ACCENT, DEFAULT_LINK[dark]

        bg = Gdk.RGBA()
        bg.parse(PAGE_BG[dark])
        self.view.set_background_color(bg)
        if self._page_ready:
            args = ", ".join(json.dumps(a) for a in (dark, accent, link))
            self._run_js(f"mdview.setTheme({args});")

    def push_page_width(self):
        if self._page_ready:
            width = self.get_application().settings["page_width"]
            self._run_js(f"mdview.setWidth({json.dumps(width)});")

    def _on_load_changed(self, _view, event):
        if event == WebKit.LoadEvent.FINISHED:
            self._page_ready = True
            self._push_theme()
            self.push_page_width()
            self._push_render(keep_scroll=False)

    def _on_decide_policy(self, _view, decision, decision_type):
        if decision_type == WebKit.PolicyDecisionType.RESPONSE:
            return False
        uri = decision.get_navigation_action().get_request().get_uri()
        if (
            decision_type == WebKit.PolicyDecisionType.NAVIGATION_ACTION
            and uri.split("#", 1)[0] in (self._base_uri, "about:blank")
        ):
            return False  # Our own page, or an anchor link within it.
        decision.ignore()
        self._follow_link(uri)
        return True

    def _follow_link(self, uri):
        scheme = (GLib.Uri.peek_scheme(uri) or "").lower()
        if scheme == "file":
            gfile = Gio.File.new_for_uri(uri.split("#", 1)[0])
            if is_markdown(gfile):
                self.open_file(gfile)
            else:
                Gtk.FileLauncher(file=gfile).launch(self, None, None)
        elif scheme in ("http", "https", "mailto", "ftp"):
            Gtk.UriLauncher(uri=uri).launch(self, None, None)

    def _on_context_menu(self, _view, menu, _hit):
        for item in list(menu.get_items()):
            if item.get_stock_action() not in KEEP_MENU_ACTIONS:
                menu.remove(item)
        return menu.get_n_items() == 0  # True suppresses an empty menu.

    def _on_scroll(self, controller, _dx, dy):
        ctrl = controller.get_current_event_state() & Gdk.ModifierType.CONTROL_MASK
        if not ctrl or dy == 0 or self.stack.get_visible_child_name() != "document":
            return False
        self._zoom(-ZOOM_STEP if dy > 0 else ZOOM_STEP)
        return True

    def _zoom(self, delta):
        if delta is None:
            level = 1.0
        else:
            level = self.view.get_zoom_level() + delta
        self.view.set_zoom_level(round(min(max(level, ZOOM_MIN), ZOOM_MAX), 2))


class Application(Adw.Application):
    def __init__(self):
        super().__init__(
            application_id=APP_ID, flags=Gio.ApplicationFlags.HANDLES_OPEN
        )
        self.settings = dict(DEFAULT_SETTINGS)

    def do_startup(self):
        Adw.Application.do_startup(self)
        GLib.set_application_name(APP_NAME)
        self.settings = load_settings()
        if os.path.isdir(DEV_ICONS):  # Running from the source tree.
            display = Gdk.Display.get_default()
            Gtk.IconTheme.get_for_display(display).add_search_path(DEV_ICONS)

        for name, callback in (
            ("about", self._on_about),
            ("quit", self._on_quit),
            ("wider", lambda *_: self._step_page_width(1)),
            ("narrower", lambda *_: self._step_page_width(-1)),
        ):
            action = Gio.SimpleAction(name=name)
            action.connect("activate", callback)
            self.add_action(action)

        for key in CHOICES:
            action = Gio.SimpleAction.new_stateful(
                key.replace("_", "-"),
                GLib.VariantType.new("s"),
                GLib.Variant.new_string(self.settings[key]),
            )
            action.connect("change-state", self._on_choice)
            self.add_action(action)
        Adw.StyleManager.get_default().set_color_scheme(THEMES[self.settings["theme"]])

        for action, accels in (
            ("win.open", ["<Ctrl>o"]),
            ("win.reload", ["F5", "<Ctrl>r"]),
            ("win.zoom-in", ["<Ctrl>plus", "<Ctrl>equal", "<Ctrl>KP_Add"]),
            ("win.zoom-out", ["<Ctrl>minus", "<Ctrl>KP_Subtract"]),
            ("win.zoom-reset", ["<Ctrl>0", "<Ctrl>KP_0"]),
            ("app.wider", ["<Ctrl>bracketright"]),
            ("app.narrower", ["<Ctrl>bracketleft"]),
            ("window.close", ["<Ctrl>w", "Escape"]),
            ("app.quit", ["<Ctrl>q"]),
        ):
            self.set_accels_for_action(action, accels)

    def do_activate(self):
        Window(self).present()

    def do_open(self, files, _n_files, _hint):
        for gfile in files:
            existing = next(
                (w for w in self.get_windows() if w.file is not None and w.file.equal(gfile)),
                None,
            )
            if existing is not None:
                existing.present()
                continue
            window = Window(self)
            window.open_file(gfile)
            window.present()

    def remember_window(self, window):
        self.settings["maximized"] = window.is_maximized()
        if not window.is_maximized():
            width, height = window.get_default_size()
            if width > 0 and height > 0:
                self.settings["window_width"] = width
                self.settings["window_height"] = height
        save_settings(self.settings)
        return False  # Let the window close.

    def _on_quit(self, *_):
        # Close windows one by one so each one saves its size.
        for window in list(self.get_windows()):
            window.close()

    def _on_choice(self, action, value):
        key, choice = action.get_name().replace("-", "_"), value.get_string()
        if choice not in CHOICES[key]:
            return
        action.set_state(value)
        self.settings[key] = choice
        save_settings(self.settings)
        if key == "theme":
            # Windows follow through StyleManager's notify::dark.
            Adw.StyleManager.get_default().set_color_scheme(THEMES[choice])
        else:
            for window in self.get_windows():
                if isinstance(window, Window):
                    window.push_page_width()

    def _step_page_width(self, step):
        index = PAGE_WIDTHS.index(self.settings["page_width"]) + step
        if 0 <= index < len(PAGE_WIDTHS):
            self.change_action_state("page-width", GLib.Variant.new_string(PAGE_WIDTHS[index]))

    def _on_about(self, *_):
        Adw.AboutDialog(
            application_name=APP_NAME,
            application_icon=APP_ID,
            version=VERSION,
            developer_name="Alexandru Bichis",
            comments="A simple Markdown viewer",
        ).present(self.get_active_window())


def main():
    return Application().run(sys.argv)


if __name__ == "__main__":
    sys.exit(main())
