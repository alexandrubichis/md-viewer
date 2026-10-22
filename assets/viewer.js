"use strict";

const content = document.getElementById("content");

marked.use({ gfm: true });

function stripFrontMatter(md) {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)\r?\n/, "");
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

// GitHub-style heading ids, so "#some-heading" links work.
function addHeadingIds() {
  const seen = new Map();
  for (const h of content.querySelectorAll("h1, h2, h3, h4, h5, h6")) {
    const base = slugify(h.textContent) || "section";
    const n = seen.get(base) || 0;
    seen.set(base, n + 1);
    h.id = n ? `${base}-${n}` : base;
  }
}

function highlightCode() {
  for (const el of content.querySelectorAll('pre code[class*="language-"]')) {
    const lang = el.className.match(/language-(\S+)/)[1];
    if (hljs.getLanguage(lang)) hljs.highlightElement(el);
  }
}

function markTaskLists() {
  for (const box of content.querySelectorAll('li > input[type="checkbox"]')) {
    box.parentElement.classList.add("task");
  }
}

function wrapTables() {
  for (const table of content.querySelectorAll("table")) {
    const wrap = document.createElement("div");
    wrap.className = "table-wrap";
    table.replaceWith(wrap);
    wrap.append(table);
  }
}

// Tables and code blocks that don't fit the text column grow wider
// (up to WIDE_MAX, centered on the column) instead of scrolling sideways.
const WIDE_MAX = 1100;
const GUTTER = 24;

function fitWideBlocks() {
  const style = getComputedStyle(content);
  const column =
    content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const limit = Math.max(column, Math.min(window.innerWidth - 2 * GUTTER, WIDE_MAX));

  for (const el of content.querySelectorAll(":scope > pre, :scope > .table-wrap")) {
    el.style.marginLeft = "";
    el.style.width = "max-content";
    const natural = Math.ceil(el.getBoundingClientRect().width);
    el.style.width = "";
    if (natural <= column) continue;
    const width = Math.min(natural, limit);
    el.style.width = `${width}px`;
    el.style.marginLeft = `${-(width - column) / 2}px`;
  }
}

let fitPending = false;
window.addEventListener("resize", () => {
  if (fitPending) return;
  fitPending = true;
  requestAnimationFrame(() => {
    fitPending = false;
    fitWideBlocks();
  });
});

window.mdview = {
  render(md, keepScroll) {
    const y = window.scrollY;
    const html = marked.parse(stripFrontMatter(md));
    content.innerHTML = DOMPurify.sanitize(html);
    addHeadingIds();
    highlightCode();
    markTaskLists();
    wrapTables();
    fitWideBlocks();
    if (keepScroll) {
      window.scrollTo(0, y);
    } else if (location.hash) {
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
    }
  },

  setTheme(dark, accent, link) {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--link", link);
    document.getElementById("hljs-light").media = dark ? "not all" : "all";
    document.getElementById("hljs-dark").media = dark ? "all" : "not all";
  },

  setWidth(name) {
    document.documentElement.dataset.width = name;
    fitWideBlocks();
  },
};
