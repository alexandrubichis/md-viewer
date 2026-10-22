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

window.mdview = {
  render(md, keepScroll) {
    const y = window.scrollY;
    const html = marked.parse(stripFrontMatter(md));
    content.innerHTML = DOMPurify.sanitize(html);
    addHeadingIds();
    highlightCode();
    markTaskLists();
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
};
