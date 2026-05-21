/* game.js — WikiRace client-side logic */

"use strict";

const WR = window.WIKIRACE || {};

// ── Stopwatch ─────────────────────────────────────────────────────────────────
class Stopwatch {
  constructor(el) {
    this.el     = el;
    this.origin = WR.startTime ? WR.startTime * 1000 : null;
    this.endMs  = WR.endTime ? WR.endTime * 1000 : null;
    this.raf    = null;
  }

  start() {
    if (WR.status !== "playing") {
      // Show final time
      if (this.origin && this.endMs) {
        this.el.textContent = this._fmt((this.endMs - this.origin) / 1000);
      }
      return;
    }
    this.el.classList.add("ticking");
    this.origin = this.origin || Date.now();
    this._tick();
  }

  _tick() {
    const elapsed = (Date.now() - this.origin) / 1000;
    this.el.textContent = this._fmt(elapsed);
    this.raf = requestAnimationFrame(() => this._tick());
  }

  stop(endMs) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf  = null;
    this.endMs = endMs;
    this.el.classList.remove("ticking");
    if (this.origin && this.endMs) {
      this.el.textContent = this._fmt((this.endMs - this.origin) / 1000);
    }
  }

  _fmt(s) {
    const m  = Math.floor(s / 60);
    const ss = Math.floor(s % 60);
    const cs = Math.floor((s % 1) * 100);
    if (m > 0) return `${m}:${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
    return `${String(ss).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }
}

// ── Elements ──────────────────────────────────────────────────────────────────
const $  = id  => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const stopwatch    = new Stopwatch($("stopwatch"));
const articleBody  = $("article-body");
const articleTitle = $("article-title");
const clickCount   = $("click-count");
const pathList     = $("path-list");
const navSpinner   = $("nav-spinner");
const sidebar      = $("sidebar");
const progressBar  = $("hud-progress-bar");
const linkCountBadge = $("link-count-badge");

// ── State ─────────────────────────────────────────────────────────────────────
let isNavigating = false;
let currentPath  = [...(WR.path || [])];
let clicks       = WR.clicks || 0;
const playerEmail = (WR.playerEmail || localStorage.getItem("wikirace.playerEmail") || "").trim();

// ── Init ─────────────────────────────────────────────────────────────────────
if (playerEmail) localStorage.setItem("wikirace.playerEmail", playerEmail);
initCustomCursor();
stopwatch.start();
attachLinkHandlers();
document.body.classList.add("ui-ready");
updateProgress();
updateLinkCount();
initCursorTrail();

// Win modal auto-trigger
if (WR.status === "won") {
  setTimeout(() => showWinModal(WR), 300);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
const btnSidebar      = $("btn-sidebar");
const btnCloseSidebar = $("btn-close-sidebar");
const btnPathInline   = $("btn-path-inline");

function toggleSidebar(open) {
  sidebar.classList.toggle("sidebar-closed", !open);
  document.body.classList.toggle("sidebar-open", open);
}
btnSidebar     ?.addEventListener("click", () => toggleSidebar(sidebar.classList.contains("sidebar-closed")));
btnCloseSidebar?.addEventListener("click", () => toggleSidebar(false));
btnPathInline  ?.addEventListener("click", () => toggleSidebar(true));

// ── Give Up ───────────────────────────────────────────────────────────────────
$("btn-give-up")?.addEventListener("click", async () => {
  if (!confirm("Give up? You'll see where you were.")) return;
  const res  = await fetch("/give_up", {
    method: "POST",
    headers: { "X-Requested-With": "XMLHttpRequest" },
  });
  const data = await res.json();
  stopwatch.stop(data.state.end_time * 1000);
  location.href = "/game";
});

// ── Navigation ────────────────────────────────────────────────────────────────
function attachLinkHandlers() {
  if (!articleBody) return;
  articleBody.querySelectorAll("a.wikirace-link").forEach(a => {
    a.addEventListener("click", handleLinkClick);
  });
}

async function handleLinkClick(e) {
  e.preventDefault();
  if (isNavigating || WR.status !== "playing") return;

  const rawHref = e.currentTarget.getAttribute("href");   // /navigate/Article_Name
  const href    = withPlayerEmail(rawHref);
  const article = e.currentTarget.dataset.article || decodeURIComponent(rawHref.replace("/navigate/", "")).replace(/_/g, " ");

  isNavigating = true;
  e.currentTarget.classList.add("link-launching");
  burstAtEvent(e);
  showNavToast(article);
  showSpinner(true);

  try {
    const res  = await fetch(href, {
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
    const data = await res.json();

    // Update state
    clicks = data.state.clicks;
    currentPath = data.state.path;
    if (clickCount) clickCount.textContent = clicks;
    updatePathSidebar(currentPath);
    updateProgress();

    if (data.status === "won") {
      WR.status = "won";
      WR.endTime = data.state.end_time;
      stopwatch.stop(data.state.end_time * 1000);
      renderArticle(article, data.article_html || "");
      setTimeout(() => showWinModal(data.state), 400);
    } else {
      renderArticle(data.display_title || article, data.article_html || "");
    }

  } catch (err) {
    console.error("Navigation error:", err);
    // Fallback to full page nav
    location.href = href;
  } finally {
    isNavigating = false;
    showSpinner(false);
  }
}

function renderArticle(displayTitle, html) {
  if (articleTitle) {
    articleTitle.innerHTML = displayTitle;
    articleTitle.classList.remove("title-pop");
    void articleTitle.offsetWidth;
    articleTitle.classList.add("title-pop");
  }
  if (articleBody) {
    articleBody.innerHTML = html;
    attachLinkHandlers();
    updateLinkCount();
    articleBody.classList.remove("article-enter");
    void articleBody.offsetWidth;
    articleBody.classList.add("article-enter");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function showSpinner(show) {
  navSpinner?.classList.toggle("hidden", !show);
  if (articleBody) articleBody.style.opacity = show ? "0.4" : "1";
}

function withPlayerEmail(href) {
  if (!playerEmail) return href;
  const url = new URL(href, window.location.origin);
  url.searchParams.set("player_email", playerEmail);
  return `${url.pathname}${url.search}`;
}

function updatePathSidebar(path) {
  if (!pathList) return;
  pathList.innerHTML = path.map((step, i) => {
    const isCurrent = i === path.length - 1;
    return `<li class="${isCurrent ? "path-current" : ""}">
      <span class="path-index">${i + 1}</span>
      <span class="path-title">${escHtml(step)}</span>
    </li>`;
  }).join("");
  pathList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function updateProgress() {
  if (!progressBar) return;
  const depth = Math.min(92, 14 + clicks * 9);
  progressBar.style.width = `${depth}%`;
}

function updateLinkCount() {
  if (!articleBody || !linkCountBadge) return;
  const links = articleBody.querySelectorAll("a.wikirace-link");
  linkCountBadge.textContent = `${links.length} live links`;
  links.forEach((link, index) => {
    link.style.setProperty("--link-order", index % 12);
    if (index % 11 === 0) link.classList.add("hot-link");
  });
}

function showNavToast(article) {
  let toast = $("nav-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "nav-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = `Jumping to ${article}`;
  toast.classList.remove("visible");
  void toast.offsetWidth;
  toast.classList.add("visible");
}

function burstAtEvent(e) {
  const layer = $("cursor-trail-layer");
  if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 10; i++) {
    const spark = document.createElement("span");
    spark.className = "click-spark";
    spark.style.left = `${e.clientX}px`;
    spark.style.top = `${e.clientY}px`;
    spark.style.setProperty("--dx", `${(Math.random() - .5) * 110}px`);
    spark.style.setProperty("--dy", `${(Math.random() - .5) * 90}px`);
    layer.appendChild(spark);
    setTimeout(() => spark.remove(), 700);
  }
}

function initCursorTrail() {
  const layer = $("cursor-trail-layer");
  if (!layer || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let last = 0;
  window.addEventListener("pointermove", e => {
    const now = performance.now();
    if (now - last < 55) return;
    last = now;
    const dot = document.createElement("span");
    dot.className = "cursor-dot";
    dot.style.left = `${e.clientX}px`;
    dot.style.top = `${e.clientY}px`;
    layer.appendChild(dot);
    setTimeout(() => dot.remove(), 900);
  }, { passive: true });
}

document.addEventListener("keydown", e => {
  if (e.key.toLowerCase() === "p" && btnSidebar) {
    toggleSidebar(sidebar.classList.contains("sidebar-closed"));
  }
  if (e.key === "Escape" && sidebar && !sidebar.classList.contains("sidebar-closed")) {
    toggleSidebar(false);
  }
});

// ── Win Modal ─────────────────────────────────────────────────────────────────
function showWinModal(state) {
  const overlay = $("win-overlay");
  if (!overlay) return;
  overlay.classList.remove("hidden");
  overlay.classList.add("visible");

  // Update stats
  const startTime = state.start_time ?? state.startTime;
  const endTime = state.end_time ?? state.endTime;
  const targetArticle = state.target_article ?? state.targetArticle;
  const startArticle = state.start_article ?? state.startArticle;
  const path = state.path || [];
  const timeStr = fmtTime((endTime - startTime));
  const winTime = $("win-time");
  const winClicks = $("win-clicks");
  const winPath   = $("win-path-list");

  if (winTime)   winTime.textContent   = timeStr;
  if (winClicks) winClicks.textContent = state.clicks;

  if (winPath) {
    winPath.innerHTML = path.map((step, i) => {
      const cls = i === 0 ? "wp-start" : i === path.length - 1 ? "wp-end" : "";
      return `<li><span class="wp-index">${i + 1}</span><span class="wp-title ${cls}">${escHtml(step)}</span></li>`;
    }).join("");
  }

  launchConfetti();

  // Copy result button
  $("btn-copy-result")?.addEventListener("click", () => {
    const text = `WikiRace\n${startArticle} -> ${targetArticle}\n${timeStr} | ${state.clicks} clicks\nPath: ${path.join(" -> ")}`;
    navigator.clipboard?.writeText(text).then(() => {
      const btn = $("btn-copy-result");
      btn.textContent = "Copied!";
      setTimeout(() => { btn.textContent = "Copy Result"; }, 2000);
    });
  });
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function launchConfetti() {
  const container = $("confetti-container");
  if (!container) return;
  const colors = ["#4fd1c5","#f6c90e","#7ecfff","#e05c69","#a78bfa","#34d399"];
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width: ${5 + Math.random() * 6}px;
      height: ${5 + Math.random() * 6}px;
      border-radius: ${Math.random() > .5 ? "50%" : "2px"};
      animation-duration: ${1.2 + Math.random() * 1.8}s;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    container.appendChild(piece);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtTime(s) {
  const m  = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const cs = Math.floor((s % 1) * 100);
  if (m > 0) return `${m}:${String(ss).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
  return `${String(ss).padStart(2,"0")}.${String(cs).padStart(2,"0")}`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function initCustomCursor() {
  const cursor = $("custom-cursor");
  const finePointer = window.matchMedia("(pointer: fine)");
  if (!cursor || !finePointer.matches) return;

  const setStateFor = target => {
    const textTarget = target?.closest?.("input, textarea, [contenteditable='true']");
    const interactive = target?.closest?.("a, button, input, textarea, select, label, [role='button'], [tabindex]:not([tabindex='-1'])");
    cursor.classList.toggle("text", Boolean(textTarget));
    cursor.classList.toggle("hovered", Boolean(interactive) && !textTarget);
  };

  window.addEventListener("pointermove", e => {
    cursor.style.setProperty("--cursor-x", `${e.clientX}px`);
    cursor.style.setProperty("--cursor-y", `${e.clientY}px`);
    cursor.classList.add("is-visible");
    setStateFor(e.target);
  }, { passive: true });

  document.addEventListener("pointerover", e => setStateFor(e.target), { passive: true });
  document.addEventListener("pointerout", e => {
    if (!e.relatedTarget) cursor.classList.remove("hovered", "text");
  }, { passive: true });
  document.addEventListener("pointerdown", () => cursor.classList.add("clicking"));
  document.addEventListener("pointerup", () => cursor.classList.remove("clicking"));
  document.addEventListener("pointercancel", () => cursor.classList.remove("clicking"));
  document.addEventListener("mouseleave", () => cursor.classList.remove("is-visible", "hovered", "text", "clicking"));
}
