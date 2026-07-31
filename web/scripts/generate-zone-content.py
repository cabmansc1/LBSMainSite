"""Generate web/src/lib/zone-content.ts from the extracted legacy copy."""
import json
import re

zones = json.load(open("/tmp/claude-0/-home-user-LBSMainSite/c417a2f8-a752-5900-beca-28c9c79171ca/scratchpad/zones.json"))
seo = json.load(open("/tmp/claude-0/-home-user-LBSMainSite/c417a2f8-a752-5900-beca-28c9c79171ca/scratchpad/zone_seo.json"))


def house_style(s: str) -> str:
    """House style forbids em dashes. Punctuation is SEO neutral."""
    s = s.replace(" — ", ", ").replace("—", ", ")
    s = re.sub(r",\s*,", ",", s)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s+([.,;:])", r"\1", s)
    return s.strip()


def ts(value):
    if isinstance(value, str):
        return json.dumps(house_style(value), ensure_ascii=False)
    if isinstance(value, list):
        return "[" + ", ".join(ts(v) for v in value) + "]"
    if isinstance(value, dict):
        return "{" + ", ".join(f"{k}: {ts(v)}" for k, v in value.items()) + "}"
    raise TypeError(type(value))


out = [
    '/**',
    ' * Long-form zone copy, lifted from the legacy PHP pages.',
    ' *',
    ' * These pages carry years of accumulated search equity, and the copy',
    ' * is what earns it: roughly 1,200 words per zone, the ZIP breakdowns,',
    ' * the local neighbourhood names, and the FAQs that produce the FAQ',
    ' * rich result. It is ported verbatim rather than rewritten, with only',
    ' * em dashes normalised to house style. Generated from',
    ' * *-direct-mail-marketing.php; edit here, not there.',
    ' */',
    "",
    "export type ZoneSection = {",
    "  title: string;",
    "  intro: string[];",
    "  items: { title: string; body: string[] }[];",
    "};",
    "",
    "export type ZoneContent = {",
    "  /** Proven title and description from the legacy seo-config. */",
    "  title: string;",
    "  description: string;",
    "  heroSub: string;",
    "  statsTitle: string;",
    "  statsIntro: string;",
    "  stats: { value: string; label: string }[];",
    "  prose?: ZoneSection;",
    "  sections: ZoneSection[];",
    "  faqTitle: string;",
    "  faqs: { q: string; a: string }[];",
    "};",
    "",
    "export const ZONE_CONTENT: Record<string, ZoneContent> = {",
]

for slug, z in sorted(zones.items()):
    s = seo.get(f"{slug}-direct-mail-marketing", {})
    # Card sections with no items are link lists the new page already has.
    sections = [c for c in z.get("cardSections", []) if c["items"]]
    entry = {
        "title": s.get("title") or z.get("heroTitle", ""),
        "description": s.get("description") or z.get("heroSub", ""),
        "heroSub": z.get("heroSub", ""),
        "statsTitle": z.get("statsTitle", ""),
        "statsIntro": z.get("statsIntro", ""),
        "stats": z.get("stats", []),
        "sections": sections,
        "faqTitle": z.get("faqTitle", ""),
        "faqs": z.get("faqs", []),
    }
    if z.get("prose"):
        entry["prose"] = z["prose"]
    out.append(f"  {json.dumps(slug)}: {ts(entry)},")

out.append("};")
out.append("")
out.append("export const zoneContent = (slug: string): ZoneContent | undefined =>")
out.append("  ZONE_CONTENT[slug];")
out.append("")

open("/home/user/LBSMainSite/web/src/lib/zone-content.ts", "w", encoding="utf-8").write(
    "\n".join(out)
)
print("wrote", len("\n".join(out)), "bytes for", len(zones), "zones")
