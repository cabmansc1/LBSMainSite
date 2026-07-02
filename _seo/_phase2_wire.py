#!/usr/bin/env python3
"""Phase 2 wiring — replace each service-area page's inline $seo array with
a require of includes/seo-config.php + a lookup by basename.

Backs up each file to _seo/<name>.pre-phase2.bak first. Idempotent: if the
page is already wired, it's skipped.
"""
import os, sys, re, shutil

ROOT = "/home/cabmansc1/public_html"
BACKUP_DIR = os.path.join(ROOT, "_seo")

PAGES = [
    "charleston-direct-mail-marketing.php",
    "daniel-island-direct-mail-marketing.php",
    "goose-creek-direct-mail-marketing.php",
    "isle-of-palms-direct-mail-marketing.php",
    "james-island-direct-mail-marketing.php",
    "johns-island-direct-mail-marketing.php",
    "moncks-corner-direct-mail-marketing.php",
    "mount-pleasant-direct-mail-marketing.php",
    "north-charleston-direct-mail-marketing.php",
    "sullivans-island-direct-mail-marketing.php",
    "summerville-direct-mail-marketing.php",
]

# We anchor the replacement on a closing marker that's unique on each page:
# the closing `];` of the top-level $seo array immediately followed by the
# include of seo_head.php on the next non-blank line.
START_MARKER = "$seo = ["
END_MARKER   = "];\ninclude __DIR__ . '/seo_head.php';"

NEW_BLOCK = (
    "$seoConfig = require __DIR__ . '/includes/seo-config.php';\n"
    "$seo = $seoConfig[basename(__FILE__)] ?? [];\n"
    "include __DIR__ . '/seo_head.php';"
)

def wire_one(name):
    path = os.path.join(ROOT, name)
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()

    # Idempotency check.
    if "includes/seo-config.php" in src and "$seoConfig" in src:
        return f"SKIP {name} — already wired"

    start = src.find(START_MARKER)
    end   = src.find(END_MARKER)
    if start == -1 or end == -1 or end < start:
        return f"FAIL {name} — start/end markers not found (start={start}, end={end})"

    # Backup first.
    bak = os.path.join(BACKUP_DIR, name + ".pre-phase2.bak")
    shutil.copy2(path, bak)

    # Replace from start to end + len(END_MARKER).
    end_full = end + len(END_MARKER)
    new_src = src[:start] + NEW_BLOCK + src[end_full:]
    with open(path, "w", encoding="utf-8") as f:
        f.write(new_src)
    return f"OK   {name} — wired (backup: _seo/{os.path.basename(bak)})"

if __name__ == "__main__":
    for p in PAGES:
        print(wire_one(p))
