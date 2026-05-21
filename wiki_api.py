"""
wiki_api.py — Wikipedia API wrapper with in-memory caching.
"""

import re
import time
import os
import requests
from bs4 import BeautifulSoup
from typing import Optional

# ─── Constants ────────────────────────────────────────────────────────────────
API_URL   = "https://en.wikipedia.org/w/api.php"
REST_URL  = "https://en.wikipedia.org/api/rest_v1"
TIMEOUT   = 10


def _clean_header_value(value: str) -> str:
    return value.replace("\n", " ").replace("\r", " ").strip()


def _contact_cache_key(contact_email: str | None = None) -> str:
    return _clean_header_value(
        contact_email
        or os.environ.get("WIKIRACE_CONTACT_EMAIL")
        or os.environ.get("WIKIMEDIA_CONTACT_EMAIL")
        or os.environ.get("WIKIMEDIA_USER_AGENT")
        or "local"
    ).lower()


def _build_headers(contact_email: str | None = None) -> dict[str, str]:
    user_agent = os.environ.get("WIKIMEDIA_USER_AGENT")
    if user_agent:
        return {"User-Agent": _clean_header_value(user_agent)}

    contact = (
        contact_email
        or os.environ.get("WIKIRACE_CONTACT_EMAIL")
        or os.environ.get("WIKIMEDIA_CONTACT_EMAIL")
    )
    if contact:
        clean_contact = _clean_header_value(contact)
        return {"User-Agent": f"WikiRace/1.0 ({clean_contact})"}

    return {"User-Agent": "WikiRace/1.0 (local development; provide a contact email)"}

# Namespaces that are NOT valid game targets (main namespace = 0 is valid)
_NS_PATTERN = re.compile(
    r"^/wiki/(Talk|User|Wikipedia|WP|File|Image|MediaWiki|Template|"
    r"Help|Category|Portal|Book|Draft|Special|MOS|T):",
    re.IGNORECASE,
)

# Simple LRU-style cache: {title_lower: (timestamp, data)}
_cache: dict = {}
_CACHE_TTL = 300  # seconds


def _cache_get(key: str):
    entry = _cache.get(key)
    if entry and (time.time() - entry[0]) < _CACHE_TTL:
        return entry[1]
    return None


def _cache_set(key: str, value):
    _cache[key] = (time.time(), value)
    # Trim cache if too large
    if len(_cache) > 200:
        oldest = sorted(_cache, key=lambda k: _cache[k][0])
        for k in oldest[:50]:
            del _cache[k]


# ─── Public API ───────────────────────────────────────────────────────────────

def normalize_title(title: str) -> str:
    """Canonical form: spaces, stripped, first-letter capitalised."""
    title = title.replace("_", " ").strip()
    return title[0].upper() + title[1:] if title else title


def titles_match(a: str, b: str) -> bool:
    return normalize_title(a).lower() == normalize_title(b).lower()


def get_random_article(contact_email: str | None = None) -> dict:
    """Return {'title': str, 'pageid': int} for a random main-namespace article."""
    params = {
        "action": "query", "format": "json",
        "list": "random", "rnnamespace": 0, "rnlimit": 1,
    }
    r = requests.get(API_URL, params=params, headers=_build_headers(contact_email), timeout=TIMEOUT)
    r.raise_for_status()
    page = r.json()["query"]["random"][0]
    return {"title": page["title"], "pageid": page["id"]}


def get_random_pair(contact_email: str | None = None) -> tuple[dict, dict]:
    """Return two distinct random articles (start, target)."""
    a = get_random_article(contact_email)
    b = get_random_article(contact_email)
    while titles_match(a["title"], b["title"]):
        b = get_random_article(contact_email)
    return a, b


def get_article(title: str, contact_email: str | None = None) -> Optional[dict]:
    """
    Fetch and return article data:
      {title, display_title, html (cleaned), links (list[str])}
    Returns None if article not found.
    """
    key = f"{_contact_cache_key(contact_email)}:{normalize_title(title).lower()}"
    cached = _cache_get(key)
    if cached:
        return cached

    params = {
        "action": "parse", "format": "json",
        "page": normalize_title(title),
        "prop": "text|displaytitle|links",
        "disableeditsection": True,
        "disabletoc": True,
        "mobileformat": False,
    }
    r = requests.get(API_URL, params=params, headers=_build_headers(contact_email), timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()

    if "error" in data:
        return None

    parse = data["parse"]
    raw_html = parse["text"]["*"]
    links = [
        lk["*"] for lk in parse.get("links", [])
        if lk.get("ns", -1) == 0
    ]

    result = {
        "title": parse["title"],
        "display_title": parse.get("displaytitle", parse["title"]),
        "html": _clean_html(raw_html),
        "links": links,
    }
    _cache_set(key, result)
    return result


def get_article_links(title: str, contact_email: str | None = None) -> list[str]:
    """Return list of main-namespace link titles from an article (for bots)."""
    article = get_article(title, contact_email)
    if not article:
        return []
    return article["links"]


def article_exists(title: str, contact_email: str | None = None) -> bool:
    """Check if a main-namespace article exists."""
    params = {
        "action": "query", "format": "json",
        "titles": normalize_title(title),
        "redirects": True,
    }
    r = requests.get(API_URL, params=params, headers=_build_headers(contact_email), timeout=TIMEOUT)
    r.raise_for_status()
    pages = r.json()["query"]["pages"]
    return "-1" not in pages


# ─── HTML Cleaning ────────────────────────────────────────────────────────────

def _is_game_link(href: str) -> bool:
    return href.startswith("/wiki/") and not _NS_PATTERN.match(href)


def _clean_html(raw: str) -> str:
    """
    Transform raw Wikipedia API HTML so it is suitable for in-game display:
    - Strip edit-section controls, TOC, nav boxes, ref lists, coord badges
    - Convert internal /wiki/ hrefs to /navigate/<title>
    - Mark external / special links so they don't navigate the game
    """
    soup = BeautifulSoup(raw, "lxml")

    # ── Remove unwanted elements ──────────────────────────────────────────────
    selectors = [
        ".mw-editsection",        # [edit] buttons
        "#toc",                   # table of contents
        ".toc",
        ".navbox",                # navigation boxes
        ".navbox-styles",
        ".reflist",               # references section
        ".references",
        ".mw-references-wrap",
        ".sistersitebox",
        ".noprint",               # print-only / hatnote extras
        ".metadata",
        ".geo-nondefault",
        ".geo-multi-punct",
        ".coordinates",
        "#coordinates",
        ".mw-empty-elt",
        ".hatnote img",           # icons inside hatnotes
        ".mbox-image",
        "style",                  # inline <style> tags
        "link",                   # inline <link> tags
    ]
    for sel in selectors:
        for tag in soup.select(sel):
            tag.decompose()

    # ── Rewrite links ─────────────────────────────────────────────────────────
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if _is_game_link(href):
            article_name = href[len("/wiki/"):]
            a["href"] = f"/navigate/{article_name}"
            a["class"] = (a.get("class") or []) + ["wikirace-link"]
            a["data-article"] = article_name.replace("_", " ")
        elif href.startswith("#"):
            pass  # in-page anchor — fine
        else:
            # External / namespace link — disable game navigation
            a["href"] = "#"
            a["class"] = (a.get("class") or []) + ["wikirace-external"]
            a["tabindex"] = "-1"

    # ── Fix image src paths ───────────────────────────────────────────────────
    for img in soup.find_all("img", src=True):
        src = img["src"]
        if src.startswith("//"):
            img["src"] = "https:" + src
        if img.get("srcset"):
            img["srcset"] = re.sub(
                r"//", "https://", img["srcset"]
            )

    return str(soup)
