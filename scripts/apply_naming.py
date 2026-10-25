"""Applies scripts/naming.py: renames item folders and files, updates demo imports and meta.json
(name, category, keywords, permanent number), and writes NAMING.md. Run once all agents are idle:
    python3 scripts/apply_naming.py [--dry-run]
"""
import json, re, shutil, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from naming import CATEGORIES, ITEMS, TWISTS

root = Path(__file__).resolve().parent.parent
items_dir = root / "src/registry/items"
dry = "--dry-run" in sys.argv
# --skip a,b,c leaves folders that other agents are still editing for a later run. Re-running is safe.
skip = set(sys.argv[sys.argv.index("--skip") + 1].split(",")) if "--skip" in sys.argv else set()
# Items not in the map are only (re)numbered with --number-all, once their builders are done.
number_all = "--number-all" in sys.argv
KINDS = ["component", "block", "screen", "motion", "illustration"]


def slugify(name):
    s = name.lower().replace("&", "and").replace("/", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def main():
    metas = {d.name: json.loads((d / "meta.json").read_text()) for d in items_dir.iterdir() if (d / "meta.json").exists()}
    # Folders already renamed by an earlier run map back to their original key.
    renamed = {slugify(v[0]): k for k, v in ITEMS.items() if k != "context-map"}
    plan = []  # (kind, category index, order in ITEMS, old, new slug, name, category, keywords)
    order = list(ITEMS)
    for old, meta in metas.items():
        if old == "context-map":
            continue  # merged into Token Budget by the twist pass
        key = old if old in ITEMS else renamed.get(old)
        if key:
            name, category, keywords = ITEMS[key]
            new_slug, rank = slugify(name), order.index(key)
        else:  # built after the map was drafted: keep its own name, slug and category, number it after mapped items
            name, category, keywords = meta["name"], meta.get("category", "General"), meta.get("keywords", [])
            new_slug, rank = old, len(order) + sorted(metas).index(old)
        cats = CATEGORIES[meta["kind"]]
        plan.append((KINDS.index(meta["kind"]), cats.index(category) if category in cats else len(cats), rank, old, new_slug, name, category, keywords))
    plan.sort()

    rows = []
    for no, (_, _, _, old, new, name, category, keywords) in enumerate(plan, 1):
        meta = metas[old]
        rows.append((no, meta["kind"], category, name, new, renamed.get(old, old), renamed.get(old, old) in TWISTS))
        mapped = old in ITEMS or old in renamed
        if dry or old in skip or (not mapped and not number_all):
            continue
        src, dst = items_dir / old, items_dir / new
        if old != new:
            shutil.move(src, dst)
            (dst / f"{old}.tsx").rename(dst / f"{new}.tsx")
            for f in dst.glob("*.tsx"):
                text = f.read_text().replace(f"@/registry/items/{old}/{old}", f"@/registry/items/{new}/{new}")
                f.write_text(text)
        meta.update({"name": name, "category": category, "keywords": keywords, "no": no})
        (dst / "meta.json").write_text(json.dumps(meta, indent=2) + "\n")

    lines = ["# Naming", "", "devl's own names, categories and order. `*` = concept reworked with a devl twist.", ""]
    for kind in KINDS:
        lines += [f"## {kind.title()}s", "", "| No | Category | Name | Slug | Was |", "| --- | --- | --- | --- | --- |"]
        lines += [f"| {no:03d} | {cat} | {name}{' *' if tw else ''} | `{new}` | `{old}` |" for no, k, cat, name, new, old, tw in rows if k == kind]
        lines.append("")
    (root / "NAMING.md").write_text("\n".join(lines))
    print(f"{'planned' if dry else 'applied'}: {len(rows)} items")


if __name__ == "__main__":
    main()
