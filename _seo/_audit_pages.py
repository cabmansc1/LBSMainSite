#!/usr/bin/env python3
"""One-shot SEO audit extractor. Walks PHP/HTML files and pulls head/meta state.
Output: markdown table to stdout.
"""
import os, re, sys, html

ROOT = "/home/cabmansc1/public_html"
SKIP_DIRS = {"vendor", "_archived", ".trash", "_seo", "node_modules", ".well-known", "uploads", "images", "css", "public_html", "dreamsanddrinks", "templates"}

# --- regexes ---
RE_TITLE     = re.compile(r"<title[^>]*>(.*?)</title>", re.I | re.S)
RE_TITLE_PHP = re.compile(r"<title[^>]*>\s*<\?(?:php)?\s*(?:echo|print|=)\s+([^?]+?)\s*\?>", re.I | re.S)
RE_META_DESC = re.compile(r"<meta\s+[^>]*name\s*=\s*[\"']description[\"'][^>]*>", re.I)
RE_DESC_CONT = re.compile(r"content\s*=\s*[\"'](.*?)[\"']", re.I | re.S)
RE_H1        = re.compile(r"<h1\b[^>]*>(.*?)</h1>", re.I | re.S)
RE_CANON     = re.compile(r"<link\s+[^>]*rel\s*=\s*[\"']canonical[\"']", re.I)
RE_OG        = re.compile(r"<meta\s+[^>]*property\s*=\s*[\"']og:", re.I)
RE_TWITTER   = re.compile(r"<meta\s+[^>]*name\s*=\s*[\"']twitter:", re.I)
RE_JSONLD    = re.compile(r"<script[^>]*type\s*=\s*[\"']application/ld\+json[\"']", re.I)
RE_GA        = re.compile(r"(?:gtag\s*\(|googletagmanager\.com|google-site-verification|UA-\d+|G-[A-Z0-9]+|GTM-[A-Z0-9]+|analytics\.js)", re.I)
RE_BODY      = re.compile(r"<body[^>]*>(.*)</body>", re.I | re.S)
RE_PHPTAG    = re.compile(r"<\?(?:php)?.*?\?>", re.S)
RE_TAG       = re.compile(r"<[^>]+>", re.S)
RE_SCRIPT    = re.compile(r"<script\b.*?</script>", re.I | re.S)
RE_STYLE     = re.compile(r"<style\b.*?</style>", re.I | re.S)
RE_COMMENT   = re.compile(r"<!--.*?-->", re.S)

def clean_text(s):
    s = re.sub(r"\s+", " ", s)
    return html.unescape(s).strip()

def strip_tags(s):
    s = RE_SCRIPT.sub(" ", s)
    s = RE_STYLE.sub(" ", s)
    s = RE_COMMENT.sub(" ", s)
    s = RE_PHPTAG.sub(" ", s)
    s = RE_TAG.sub(" ", s)
    return clean_text(s)

def audit_file(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        src = f.read()

    # title
    m = RE_TITLE.search(src)
    if m:
        raw = m.group(1)
        # strip nested php blocks if present, but show that they're dynamic
        if "<?" in raw:
            # try to extract a simpler form
            inner = RE_PHPTAG.sub("{PHP}", raw)
            title = clean_text(inner)[:160]
        else:
            title = clean_text(raw)[:160]
    else:
        title = "MISSING"

    # meta description
    md = RE_META_DESC.search(src)
    if md:
        cm = RE_DESC_CONT.search(md.group(0))
        if cm:
            mdesc = clean_text(cm.group(1))[:200]
            if "<?" in mdesc:
                mdesc = "[DYNAMIC] " + mdesc
        else:
            mdesc = "[present, no content attr]"
    else:
        mdesc = "MISSING"

    # h1
    h1s = RE_H1.findall(src)
    if not h1s:
        h1 = "MISSING"
    elif len(h1s) > 1:
        first = clean_text(strip_tags(h1s[0]))[:100]
        h1 = f"MULTIPLE ({len(h1s)}): \"{first}\""
    else:
        h1 = clean_text(strip_tags(h1s[0]))[:120] or "[empty]"

    canonical = "yes" if RE_CANON.search(src) else "no"
    og        = "yes" if RE_OG.search(src) else "no"
    twitter   = "yes" if RE_TWITTER.search(src) else "no"
    jsonld    = "yes" if RE_JSONLD.search(src) else "no"
    ga        = "yes" if RE_GA.search(src) else "no"

    # word count of visible body content (rough)
    body = RE_BODY.search(src)
    text = strip_tags(body.group(1) if body else src)
    words = len(text.split()) if text else 0

    return {
        "title": title,
        "mdesc": mdesc,
        "h1": h1,
        "canonical": canonical,
        "og": og,
        "twitter": twitter,
        "jsonld": jsonld,
        "ga": ga,
        "words": words,
    }

def gather():
    rows = []
    for entry in sorted(os.listdir(ROOT)):
        full = os.path.join(ROOT, entry)
        if os.path.isfile(full) and (entry.endswith(".php") or entry.endswith(".html")):
            rows.append((entry, full))
    # one level deep — admin/, etc.
    for d in sorted(os.listdir(ROOT)):
        full = os.path.join(ROOT, d)
        if os.path.isdir(full) and d not in SKIP_DIRS:
            for entry in sorted(os.listdir(full)):
                fp = os.path.join(full, entry)
                if os.path.isfile(fp) and (entry.endswith(".php") or entry.endswith(".html")):
                    rows.append((f"{d}/{entry}", fp))
    return rows

def md_escape(s):
    return s.replace("|", "\\|").replace("\n", " ")

if __name__ == "__main__":
    rows = gather()
    print("| File | Title | Meta Description | H1 | Canon | OG | Tw | JSON-LD | GA/GSC | Words |")
    print("|------|-------|------------------|----|-------|----|----|---------|--------|-------|")
    for name, path in rows:
        d = audit_file(path)
        print("| `{name}` | {title} | {mdesc} | {h1} | {canon} | {og} | {tw} | {jsonld} | {ga} | {words} |".format(
            name=name,
            title=md_escape(d["title"])[:120],
            mdesc=md_escape(d["mdesc"])[:120],
            h1=md_escape(d["h1"])[:90],
            canon=d["canonical"],
            og=d["og"],
            tw=d["twitter"],
            jsonld=d["jsonld"],
            ga=d["ga"],
            words=d["words"],
        ))
