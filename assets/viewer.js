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

// Code blocks that don't fit the text column grow wider (up to WIDE_MAX,
// centered on the column). Tables and diagrams keep the column width chosen
// in Page Width and scroll sideways when they don't fit.
const WIDE_MAX = 1100;
const GUTTER = 24;

function columnWidth() {
  const style = getComputedStyle(content);
  return content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
}

function fitBlocks() {
  const column = columnWidth();
  const limit = Math.max(column, Math.min(window.innerWidth - 2 * GUTTER, WIDE_MAX));

  for (const el of content.querySelectorAll(":scope > pre")) {
    el.style.marginLeft = "";
    el.style.width = "max-content";
    const natural = Math.ceil(el.getBoundingClientRect().width);
    el.style.width = "";
    if (natural <= column) continue;
    const width = Math.min(natural, limit);
    el.style.width = `${width}px`;
    el.style.marginLeft = `${-(width - column) / 2}px`;
  }
  for (const div of content.querySelectorAll(".diagram")) fitDiagram(div, column);
}

// Mermaid diagrams: ```mermaid blocks become <div class="diagram">. The
// library is large (2.5 MB), so it's loaded only for documents that use it.
const ASSETS = new URL(".", document.currentScript.src).href;
let mermaidReady = null;
let diagramCount = 0;
let drawGeneration = 0; // A newer render or theme change cancels older drawing.
let restoreScroll = null; // Re-applied once diagrams have changed the layout.

function loadMermaid() {
  mermaidReady ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${ASSETS}vendor/mermaid.min.js`;
    script.onload = () => resolve(window.mermaid);
    script.onerror = () => {
      mermaidReady = null;
      reject(new Error("Could not load the diagram library."));
    };
    document.head.append(script);
  });
  return mermaidReady;
}

function prepareDiagrams() {
  for (const code of content.querySelectorAll("pre > code.language-mermaid")) {
    const div = document.createElement("div");
    div.className = "diagram";
    div.dataset.source = code.textContent;
    div.addEventListener("dblclick", () => openDiagram(div));
    code.parentElement.replaceWith(div);
  }
}

function showDiagramError(div, error) {
  const pre = document.createElement("pre");
  pre.textContent = div.dataset.source;
  const message = document.createElement("pre");
  message.className = "diagram-error";
  message.textContent = `Diagram error: ${String(error?.message || error).trim()}`;
  div.classList.add("error");
  div.replaceChildren(pre, message);
}

function showDiagram(div, svg) {
  const scroll = document.createElement("div");
  scroll.className = "diagram-scroll";
  scroll.innerHTML = svg;
  const expand = document.createElement("button");
  expand.className = "icon-button diagram-expand";
  expand.title = "Open Full Size";
  expand.innerHTML = icon(ICONS.expand);
  expand.addEventListener("click", () => openDiagram(div));
  div.classList.remove("error");
  div.replaceChildren(scroll, expand);
}

async function drawDiagrams() {
  const generation = ++drawGeneration;
  const diagrams = [...content.querySelectorAll(".diagram")];
  if (!diagrams.length) {
    restoreScroll = null;
    closeDiagram();
    return;
  }
  let mermaid;
  try {
    mermaid = await loadMermaid();
  } catch (error) {
    diagrams.forEach((div) => showDiagramError(div, error));
    return;
  }
  if (generation !== drawGeneration) return;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: document.documentElement.dataset.theme === "dark" ? "dark" : "default",
    fontFamily: getComputedStyle(document.body).fontFamily,
    gantt: { useWidth: columnWidth() }, // Otherwise Gantt charts take the window width.
  });
  for (const div of diagrams) {
    const id = `diagram-${++diagramCount}`;
    try {
      await mermaid.parse(div.dataset.source);
      const { svg } = await mermaid.render(id, div.dataset.source);
      if (generation !== drawGeneration) return;
      showDiagram(div, svg);
    } catch (error) {
      document.getElementById(`d${id}`)?.remove(); // Mermaid's leftover error box.
      if (generation !== drawGeneration) return;
      showDiagramError(div, error);
    }
  }
  fitBlocks();
  restoreScroll?.();
  restoreScroll = null;
  refreshViewer();
}

// Mermaid SVGs scale down to fit their container, which makes the text of a
// wide diagram unreadable. Shrink one to at most DIAGRAM_MIN_SCALE; beyond
// that, the diagram scrolls sideways inside its block.
const DIAGRAM_MIN_SCALE = 0.75;

function fitDiagram(div, column) {
  const svg = div.querySelector(".diagram-scroll > svg");
  if (!svg) return;
  svg.dataset.maxWidth ??= svg.style.maxWidth;
  const natural = parseFloat(svg.dataset.maxWidth) || 0;
  const smallest = natural * DIAGRAM_MIN_SCALE;
  const scrolls = smallest > column;
  div.classList.toggle("scrolls", scrolls);
  svg.style.width = scrolls ? `${Math.ceil(smallest)}px` : "";
  svg.style.maxWidth = scrolls ? "none" : svg.dataset.maxWidth;
}

// Full-size diagram viewer: covers the page with one diagram that can be
// zoomed and dragged around. The app is told when it opens and closes, so
// Esc, Back and the zoom shortcuts act on the viewer instead of the page.
const ICONS = {
  back: "M7.4 2.6 8.8 4l-3 3H14v2H5.8l3 3-1.4 1.4L2 8z",
  minus: "M3 7h10v2H3z",
  plus: "M7 3h2v4h4v2H9v4H7V9H3V7h4z",
  expand: "M2 2h5v2H4v3H2zm7 0h5v5h-2V4H9zM2 9h2v3h3v2H2zm10 0h2v5H9v-2h3z",
};
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 8;
const ZOOM_FACTOR = 1.25;

function icon(path) {
  return `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="${path}" fill="currentColor"/></svg>`;
}

function post(message) {
  window.webkit.messageHandlers.mdview.postMessage(message);
}

const viewer = { el: null, area: null, stage: null, zoom: null, index: -1, w: 0, h: 0, scale: 1, x: 0, y: 0 };

function buildViewer() {
  const el = document.createElement("div");
  el.className = "viewer";
  el.hidden = true;
  el.innerHTML = `
    <div class="viewer-bar">
      <button class="icon-button" data-act="close" title="Back (Esc)">${icon(ICONS.back)}</button>
      <span class="viewer-spacer"></span>
      <button class="icon-button" data-act="out" title="Zoom Out (Ctrl+−)">${icon(ICONS.minus)}</button>
      <button class="icon-button viewer-zoom" data-act="reset" title="Actual Size (Ctrl+0)">100%</button>
      <button class="icon-button" data-act="in" title="Zoom In (Ctrl++)">${icon(ICONS.plus)}</button>
      <button class="icon-button" data-act="fit" title="Fit to Window (F)">${icon(ICONS.expand)}</button>
    </div>
    <div class="viewer-area"><div class="viewer-stage"></div></div>`;
  document.body.append(el);
  viewer.el = el;
  viewer.area = el.querySelector(".viewer-area");
  viewer.stage = el.querySelector(".viewer-stage");
  viewer.zoom = el.querySelector(".viewer-zoom");

  el.querySelector(".viewer-bar").addEventListener("click", (e) => {
    const act = e.target.closest("button")?.dataset.act;
    if (act === "close") closeDiagram();
    else if (act === "fit") fitViewer();
    else if (act) zoomViewer({ in: 1, out: -1, reset: 0 }[act]);
  });

  // Drag to move; wheel to scroll; Ctrl + wheel to zoom at the pointer.
  let drag = null;
  viewer.area.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    drag = { x: e.clientX - viewer.x, y: e.clientY - viewer.y };
    viewer.area.setPointerCapture(e.pointerId);
    viewer.area.classList.add("dragging");
  });
  viewer.area.addEventListener("pointermove", (e) => {
    if (!drag) return;
    viewer.x = e.clientX - drag.x;
    viewer.y = e.clientY - drag.y;
    applyViewer();
  });
  const endDrag = () => {
    drag = null;
    viewer.area.classList.remove("dragging");
  };
  viewer.area.addEventListener("pointerup", endDrag);
  viewer.area.addEventListener("pointercancel", endDrag);
  viewer.area.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        const rect = viewer.area.getBoundingClientRect();
        const factor = Math.exp(-Math.sign(e.deltaY) * Math.log(ZOOM_FACTOR));
        setViewerScale(viewer.scale * factor, e.clientX - rect.left, e.clientY - rect.top);
      } else {
        viewer.x -= e.shiftKey ? e.deltaY : e.deltaX;
        viewer.y -= e.shiftKey ? 0 : e.deltaY;
        applyViewer();
      }
    },
    { passive: false }
  );
  viewer.area.addEventListener("dblclick", (e) => {
    const rect = viewer.area.getBoundingClientRect();
    setViewerScale(viewer.scale * ZOOM_FACTOR * ZOOM_FACTOR, e.clientX - rect.left, e.clientY - rect.top);
  });
  window.addEventListener("keydown", (e) => {
    if (viewer.index < 0 || e.ctrlKey) return;
    const handled = {
      Escape: closeDiagram,
      "+": () => zoomViewer(1),
      "=": () => zoomViewer(1),
      "-": () => zoomViewer(-1),
      0: () => zoomViewer(0),
      f: fitViewer,
    }[e.key];
    const back = e.altKey && e.key === "ArrowLeft";
    if (handled || back) {
      e.preventDefault();
      (back ? closeDiagram : handled)();
    }
  });
}

function applyViewer() {
  viewer.stage.style.transform = `translate(${viewer.x}px, ${viewer.y}px) scale(${viewer.scale})`;
  viewer.zoom.textContent = `${Math.round(viewer.scale * 100)}%`;
}

function setViewerScale(scale, cx, cy) {
  const rect = viewer.area.getBoundingClientRect();
  cx ??= rect.width / 2;
  cy ??= rect.height / 2;
  scale = Math.min(Math.max(scale, ZOOM_MIN), ZOOM_MAX);
  viewer.x = cx - (cx - viewer.x) * (scale / viewer.scale);
  viewer.y = cy - (cy - viewer.y) * (scale / viewer.scale);
  viewer.scale = scale;
  applyViewer();
}

// step: 1 zooms in, -1 out, 0 back to the actual size.
function zoomViewer(step) {
  setViewerScale(step === 0 ? 1 : viewer.scale * ZOOM_FACTOR ** step);
}

function fitViewer() {
  const rect = viewer.area.getBoundingClientRect();
  const pad = 32;
  const scale = Math.min((rect.width - 2 * pad) / viewer.w, (rect.height - 2 * pad) / viewer.h, 2);
  viewer.scale = Math.max(scale, ZOOM_MIN);
  viewer.x = (rect.width - viewer.w * viewer.scale) / 2;
  viewer.y = (rect.height - viewer.h * viewer.scale) / 2;
  applyViewer();
}

function setViewerDiagram(div) {
  const svg = div.querySelector(".diagram-scroll > svg");
  if (!svg) return false;
  const box = svg.viewBox.baseVal;
  viewer.w = box?.width || svg.getBoundingClientRect().width;
  viewer.h = box?.height || svg.getBoundingClientRect().height;
  // A copy at its natural size; it keeps the id that Mermaid's styles use.
  const copy = svg.cloneNode(true);
  copy.removeAttribute("style");
  copy.setAttribute("width", viewer.w);
  copy.setAttribute("height", viewer.h);
  viewer.stage.replaceChildren(copy);
  return true;
}

function openDiagram(div) {
  if (!viewer.el) buildViewer();
  if (!setViewerDiagram(div)) return;
  viewer.index = [...content.querySelectorAll(".diagram")].indexOf(div);
  viewer.el.hidden = false;
  document.documentElement.classList.add("viewing-diagram");
  fitViewer();
  post({ type: "diagram", open: true });
}

function closeDiagram() {
  if (viewer.index < 0) return;
  viewer.index = -1;
  viewer.el.hidden = true;
  viewer.stage.replaceChildren();
  document.documentElement.classList.remove("viewing-diagram");
  post({ type: "diagram", open: false });
}

// After a live reload or theme change, show the redrawn diagram in the viewer,
// keeping the zoom and position.
function refreshViewer() {
  if (viewer.index < 0) return;
  const div = content.querySelectorAll(".diagram")[viewer.index];
  if (!div || !setViewerDiagram(div)) closeDiagram();
}

// Find in document: every match is wrapped in <mark class="find">, the
// current one also gets "current". find() and findStep() return
// [current (1-based, 0 if none), total] for the "1 of 20" label.
const FIND_MAX_MATCHES = 5000;
let findMarks = [];
let findCurrent = -1;

function clearFind() {
  for (const mark of content.querySelectorAll("mark.find")) {
    mark.replaceWith(...mark.childNodes);
  }
  content.normalize();
  findMarks = [];
  findCurrent = -1;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function markMatches(query) {
  const re = new RegExp(escapeRegExp(query), "giu");
  // Text inside diagram SVGs can't hold <mark> elements, so it's skipped.
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, (node) =>
    node.parentElement.closest(".diagram") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  );
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const text = node.data;
    let fragment = null;
    let last = 0;
    re.lastIndex = 0;
    for (let m; (m = re.exec(text)) && findMarks.length < FIND_MAX_MATCHES; ) {
      fragment ??= document.createDocumentFragment();
      fragment.append(text.slice(last, m.index));
      const mark = document.createElement("mark");
      mark.className = "find";
      mark.textContent = m[0];
      fragment.append(mark);
      findMarks.push(mark);
      last = m.index + m[0].length;
    }
    if (fragment) {
      fragment.append(text.slice(last));
      node.replaceWith(fragment);
    }
  }
}

function setFindCurrent(index) {
  findMarks[findCurrent]?.classList.remove("current");
  findCurrent = index;
  const mark = findMarks[index];
  mark.classList.add("current");
  const rect = mark.getBoundingClientRect();
  if (rect.top < 0 || rect.bottom > window.innerHeight) {
    mark.scrollIntoView({ block: "center", inline: "nearest" });
  }
}

function findState() {
  return [findCurrent + 1, findMarks.length];
}

// Report the scroll position, so the app's back/forward history can
// return to the same place.
let scrollPending = false;
window.addEventListener("scroll", () => {
  if (scrollPending) return;
  scrollPending = true;
  requestAnimationFrame(() => {
    scrollPending = false;
    post({ type: "scroll", y: window.scrollY });
  });
});

let fitPending = false;
window.addEventListener("resize", () => {
  if (fitPending) return;
  fitPending = true;
  requestAnimationFrame(() => {
    fitPending = false;
    fitBlocks();
  });
});

window.mdview = {
  render(md, keepScroll) {
    const y = window.scrollY;
    const html = marked.parse(stripFrontMatter(md));
    content.innerHTML = DOMPurify.sanitize(html);
    addHeadingIds();
    prepareDiagrams();
    highlightCode();
    markTaskLists();
    wrapTables();
    fitBlocks();
    restoreScroll = null;
    if (keepScroll) this.scrollToY(y);
    drawDiagrams();
  },

  // Scrolling is repeated once diagrams are drawn, since they change the
  // height of everything above the target.
  scrollToY(y) {
    window.scrollTo(0, y);
    restoreScroll = () => window.scrollTo(0, y);
  },

  find(query) {
    clearFind();
    if (!query) return findState();
    markMatches(query);
    if (findMarks.length) {
      // Start at the first match on screen or below it, like a browser.
      const first = findMarks.findIndex((m) => m.getBoundingClientRect().bottom >= 0);
      setFindCurrent(first === -1 ? 0 : first);
    }
    return findState();
  },

  findStep(step) {
    if (findMarks.length) {
      const n = findMarks.length;
      setFindCurrent((findCurrent + step + n) % n);
    }
    return findState();
  },

  scrollToId(id) {
    const target =
      document.getElementById(id) ||
      document.getElementsByName(id)[0] ||
      document.getElementById(slugify(id));
    target?.scrollIntoView();
    restoreScroll = target ? () => target.scrollIntoView() : null;
  },

  setTheme(dark, accent, link) {
    const root = document.documentElement;
    root.dataset.theme = dark ? "dark" : "light";
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--link", link);
    document.getElementById("hljs-light").media = dark ? "not all" : "all";
    document.getElementById("hljs-dark").media = dark ? "all" : "not all";
    // Redraw diagrams in the new colors, keeping the reading position.
    if (content.querySelector(".diagram")) {
      this.scrollToY(window.scrollY);
      drawDiagrams();
    }
  },

  closeDiagram,
  zoomDiagram: zoomViewer,

  setWidth(name) {
    if (document.documentElement.dataset.width === name) return;
    document.documentElement.dataset.width = name;
    fitBlocks();
    // Gantt charts are drawn for the column width, so redraw diagrams.
    if (content.querySelector(".diagram")) {
      this.scrollToY(window.scrollY);
      drawDiagrams();
    }
  },
};
