"""Pull the long-form copy out of the legacy zone pages.

The PHP pages are the pages that rank, so the copy is lifted verbatim
rather than rewritten. Output is JSON keyed by zone slug.
"""
import glob
import html
import json
import os
import re

SRC = "/home/user/LBSMainSite"


def clean(fragment: str) -> str:
    """Visible text, keeping <strong> because the emphasis is deliberate."""
    s = re.sub(r"(?is)<br\s*/?>", " ", fragment)
    s = re.sub(r"(?is)<(?!/?strong\b)[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def sections(src: str):
    """Split the body into <section> blocks with their class attribute."""
    out = []
    for m in re.finditer(r'(?is)<section\b([^>]*)>(.*?)</section>', src):
        out.append((m.group(1), m.group(2)))
    return out


def h_blocks(body: str, tag: str):
    """(heading, following-html) pairs for every heading of one level."""
    parts = re.split(rf"(?is)<{tag}\b[^>]*>(.*?)</{tag}>", body)
    pairs = []
    for i in range(1, len(parts), 2):
        pairs.append((clean(parts[i]), parts[i + 1] if i + 1 < len(parts) else ""))
    return pairs, parts[0]


def paras(fragment: str):
    return [
        clean(p)
        for p in re.findall(r"(?is)<p\b[^>]*>(.*?)</p>", fragment)
        if clean(p)
    ]


def parse(path: str):
    src = open(path, encoding="utf-8", errors="replace").read()
    slug = os.path.basename(path).replace("-direct-mail-marketing.php", "")
    zone = {"slug": slug}

    for attrs, body in sections(src):
        cls = (re.search(r'class="([^"]*)"', attrs) or [None, ""])[1]

        if "hero" in cls:
            h1 = re.search(r"(?is)<h1[^>]*>(.*?)</h1>", body)
            p = paras(body)
            zone["heroTitle"] = clean(h1.group(1)) if h1 else ""
            zone["heroSub"] = p[0] if p else ""
            continue

        h2s, _ = h_blocks(body, "h2")
        if not h2s:
            continue
        title, rest = h2s[0]

        # Stat cards: the numbers the zone pages are built around.
        stats = [
            {"value": clean(v), "label": clean(l)}
            for v, l in re.findall(
                r'(?is)<span class="stat-number">(.*?)</span>\s*<p>(.*?)</p>', body
            )
        ]
        if stats:
            zone["statsTitle"] = title
            zone["statsIntro"] = (paras(rest) or [""])[0]
            zone["stats"] = stats
            continue

        # FAQ section.
        faqs = [
            {"q": clean(re.sub(r"(?is)<span.*?</span>", "", q)), "a": clean(a)}
            for q, a in re.findall(
                r'(?is)<div class="faq-question">(.*?)</div>\s*'
                r'<div class="faq-answer">(.*?)</div>',
                body,
            )
        ]
        if faqs:
            zone["faqTitle"] = title
            zone["faqs"] = faqs
            continue

        h3s, before = h_blocks(rest, "h3")
        block = {
            "title": title,
            "intro": paras(before),
            "items": [{"title": t, "body": paras(f)} for t, f in h3s],
        }
        # The prose section is the one whose h2 carries paragraphs of its
        # own; the card sections lead straight into h3s.
        key = (
            "prose"
            if block["intro"] and block["items"] and len(block["intro"]) > 1
            else "cards"
        )
        zone.setdefault(key if key == "prose" else "cardSections", [])
        if key == "prose":
            zone["prose"] = block
        else:
            zone["cardSections"].append(block)

    return zone


def main():
    zones = {}
    for path in sorted(glob.glob(f"{SRC}/*-direct-mail-marketing.php")):
        z = parse(path)
        zones[z["slug"]] = z
    print(json.dumps(zones, indent=2))


main()
