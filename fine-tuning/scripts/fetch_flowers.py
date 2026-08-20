"""
fetch_flowers.py -- Oxford Flowers-102 into datasets/flowers/.

WHY THIS IS THE HEADLINE DOMAIN

ImageNet-1k contains exactly **three** flower labels -- daisy, yellow lady's
slipper, and rose hip -- against 102 species here. So in Act 3 the generalist
genuinely has no word for what it is looking at, and the "it answered
confidently in the only vocabulary it has" hook lands for real rather than by
staging. Counted from the shipped model's own label list; see PLAN.md.

LICENCE

**Oxford Flowers-102 states no licence at all.** That is not the same as
permissive -- undeclared means default copyright. It is used here because it is
the standard benchmark and the demo needs it, behind the swap layer described in
PLAN.md section 6. A commercial-safe twin (GBIF, CC0/CC-BY, Indian species) is
`fetch_gbif.py --preset flowers_in`. Do not ship these images publicly.

!! THE LABEL NAMES ARE THE RISK HERE

`imagelabels.mat` gives class *indices* 1-102, not names. The name list below is
the community-standard mapping and it is widely reproduced, but it is not
published by VGG in machine-readable form. A one-off error puts a confident
wrong species name on screen with nothing to flag it.

    python scripts/fetch_flowers.py --contact-sheet

writes a montage per chosen class so you can eyeball that "sunflower" really is
sunflowers before any of it reaches a student.

USAGE

    python scripts/fetch_flowers.py                     # the default 12 species
    python scripts/fetch_flowers.py --list              # all 102, with counts
    python scripts/fetch_flowers.py --species sunflower "water lily" rose

Downloads ~345 MB once and caches it.
"""

from __future__ import annotations

import argparse
import shutil
import sys
import tarfile
import urllib.request
from pathlib import Path

from env_check import preflight

for _stream in (sys.stdout, sys.stderr):
    try:
        if (_stream.encoding or "").lower() not in ("utf-8", "utf8"):
            _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass


ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
OUT = ROOT / "datasets" / "flowers"

IMAGES_URL = "https://www.robots.ox.ac.uk/~vgg/data/flowers/102/102flowers.tgz"
LABELS_URL = "https://www.robots.ox.ac.uk/~vgg/data/flowers/102/imagelabels.mat"

# Community-standard index -> name mapping. Index 0 here == class 1 in the .mat.
# Verify with --contact-sheet before trusting any of it on screen.
NAMES = [
    "pink primrose", "hard-leaved pocket orchid", "canterbury bells", "sweet pea",
    "english marigold", "tiger lily", "moon orchid", "bird of paradise", "monkshood",
    "globe thistle", "snapdragon", "colt's foot", "king protea", "spear thistle",
    "yellow iris", "globe-flower", "purple coneflower", "peruvian lily",
    "balloon flower", "giant white arum lily", "fire lily", "pincushion flower",
    "fritillary", "red ginger", "grape hyacinth", "corn poppy", "prince of wales feathers",
    "stemless gentian", "artichoke", "sweet william", "carnation", "garden phlox",
    "love in the mist", "mexican aster", "alpine sea holly", "ruby-lipped cattleya",
    "cape flower", "great masterwort", "siam tulip", "lenten rose", "barbeton daisy",
    "daffodil", "sword lily", "poinsettia", "bolero deep blue", "wallflower",
    "marigold", "buttercup", "oxeye daisy", "common dandelion", "petunia",
    "wild pansy", "primula", "sunflower", "pelargonium", "bishop of llandaff",
    "gaura", "geranium", "orange dahlia", "pink-yellow dahlia", "cautleya spicata",
    "japanese anemone", "black-eyed susan", "silverbush", "californian poppy",
    "osteospermum", "spring crocus", "bearded iris", "windflower", "tree poppy",
    "gazania", "azalea", "water lily", "rose", "thorn apple", "morning glory",
    "passion flower", "lotus", "toad lily", "anthurium", "frangipani", "clematis",
    "hibiscus", "columbine", "desert-rose", "tree mallow", "magnolia", "cyclamen",
    "watercress", "canna lily", "hippeastrum", "bee balm", "ball moss", "foxglove",
    "bougainvillea", "camellia", "mallow", "mexican petunia", "bromelia",
    "blanket flower", "trumpet creeper", "blackberry lily",
]

# Twelve that a 13-year-old can tell apart on a projector, weighted towards
# species common in India (lotus, hibiscus, frangipani, bougainvillea, marigold).
DEFAULT_SPECIES = [
    "lotus", "hibiscus", "sunflower", "water lily", "rose", "marigold",
    "frangipani", "bougainvillea", "daffodil", "petunia", "passion flower", "foxglove",
]


def fetch(url: str, dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 1000:
        print(f"  = cached {dest.name} ({dest.stat().st_size / 1e6:.0f} MB)")
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    print(f"  downloading {dest.name}")

    class Redirects(urllib.request.HTTPRedirectHandler):
        http_error_308 = urllib.request.HTTPRedirectHandler.http_error_301

    tmp = dest.with_suffix(dest.suffix + ".partial")
    with urllib.request.build_opener(Redirects()).open(url, timeout=90) as r:
        total = int(r.headers.get("Content-Length", 0))
        done = 0
        with tmp.open("wb") as fh:
            while chunk := r.read(1 << 20):
                fh.write(chunk)
                done += len(chunk)
                if total:
                    print(f"    {done / 1e6:7.0f} / {total / 1e6:.0f} MB "
                          f"({done * 100 // total:3d}%)", end="\r", flush=True)
    print()
    tmp.replace(dest)
    return dest


def contact_sheet(out: Path, species, per_row=6):
    """A montage per class, so the index->name mapping can be checked by eye."""
    from PIL import Image
    sheets = out / "_contact_sheets"
    sheets.mkdir(parents=True, exist_ok=True)
    for name in species:
        files = sorted((out / name.replace(" ", "_")).glob("*.jpg"))[:per_row * 2]
        if not files:
            continue
        thumbs = [Image.open(f).convert("RGB").resize((128, 128)) for f in files]
        rows = (len(thumbs) + per_row - 1) // per_row
        sheet = Image.new("RGB", (per_row * 128, rows * 128), (20, 20, 20))
        for i, th in enumerate(thumbs):
            sheet.paste(th, ((i % per_row) * 128, (i // per_row) * 128))
        sheet.save(sheets / f"{name.replace(' ', '_')}.jpg", quality=88)
    print(f"  contact sheets -> {sheets}")
    print("  Open them and confirm each folder really contains that flower.")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--species", nargs="+", default=DEFAULT_SPECIES)
    ap.add_argument("--per-class", type=int, default=120)
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--contact-sheet", action="store_true",
                    help="write a montage per class to check the label mapping")
    args = ap.parse_args()

    preflight()
    import numpy as np
    from scipy.io import loadmat
    from PIL import Image

    tgz = fetch(IMAGES_URL, CACHE / "102flowers.tgz")
    mat = fetch(LABELS_URL, CACHE / "imagelabels.mat")

    jpg_dir = CACHE / "flowers" / "jpg"
    if not jpg_dir.exists() or not any(jpg_dir.iterdir()):
        print("  extracting...")
        (CACHE / "flowers").mkdir(parents=True, exist_ok=True)
        with tarfile.open(tgz) as tf:
            try:
                tf.extractall(CACHE / "flowers", filter="data")
            except TypeError:
                tf.extractall(CACHE / "flowers")

    # imagelabels.mat is 1-based and ordered by image_NNNNN.jpg.
    labels = loadmat(mat)["labels"][0]
    by_class = {}
    for i, cls in enumerate(labels, start=1):
        by_class.setdefault(int(cls), []).append(jpg_dir / f"image_{i:05d}.jpg")

    if args.list:
        print(f"\n{len(NAMES)} species:\n")
        for idx, name in enumerate(NAMES, start=1):
            print(f"  {idx:>3}  {name:<32} {len(by_class.get(idx, [])):>4} images")
        return 0

    lookup = {n: i + 1 for i, n in enumerate(NAMES)}
    unknown = [s for s in args.species if s not in lookup]
    if unknown:
        print(f"\nNot a Flowers-102 species name: {', '.join(unknown)}")
        print("Run --list for the exact names.")
        return 1

    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)

    print(f"\n  organising into {out}")
    total = skipped = 0
    for name in args.species:
        idx = lookup[name]
        dest = out / name.replace(" ", "_")
        dest.mkdir(parents=True, exist_ok=True)
        kept = 0
        for src in by_class.get(idx, []):
            if kept >= args.per_class:
                break
            try:
                with Image.open(src) as im:
                    im.verify()
                shutil.copy2(src, dest / src.name)
                kept += 1
            except Exception:  # noqa: BLE001
                skipped += 1
        total += kept
        print(f"    {name:<24} (class {idx:>3})  {kept:>4}")

    (out / "ATTRIBUTION.md").write_text(
        "# Oxford 102 Flowers\n\n"
        "**No licence is stated by the publisher.** Undeclared is not the same as\n"
        "permissive -- treat as default copyright, research use only, and do NOT\n"
        "publish these images. See PLAN.md section 6 for the swap layer.\n\n"
        "> M-E. Nilsback, A. Zisserman. *Automated flower classification over a\n"
        "> large number of classes.* ICVGIP, 2008.\n\n"
        "https://www.robots.ox.ac.uk/~vgg/data/flowers/102/\n\n"
        "Commercial-safe twin: `python scripts/fetch_gbif.py --preset flowers_in`\n",
        encoding="utf-8")

    print(f"\n  {total} images across {len(args.species)} species"
          + (f", {skipped} unreadable" if skipped else ""))
    if args.contact_sheet:
        contact_sheet(out, args.species)
    else:
        print("\n  !! Re-run with --contact-sheet and eyeball the montages before")
        print("     trusting these species names on screen.")
    print(f"\n  -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
