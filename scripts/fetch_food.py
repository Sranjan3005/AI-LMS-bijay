"""
fetch_food.py -- Food-101 into datasets/food/, without downloading 5 GB to disk.

THE PROBLEM THIS SOLVES

`food-101.tar.gz` is **4,996 MB** and we want twelve of its 101 classes -- about
1.5% of it. A tarball cannot be seeked, so the usual approach is: download 5 GB,
extract 5 GB, copy out 70 MB, delete 10 GB.

Instead this **streams** the archive and writes only members it wants. The bytes
still cross the network once, but nothing large ever lands on disk. Peak usage
is a few hundred MB rather than ten gigabytes.

Downside, stated plainly: there is no resume. A dropped connection means
starting the stream again. `--cache` downloads the tarball properly first if you
would rather pay the disk for restartability.

LICENCE

Food-101's images come from Foodspotting and are **not owned by ETH Zurich**.
Research/fair use only; anything beyond that "must be negotiated with the
respective picture owners". Research-only, behind the swap layer. Do not publish
these images.

USAGE

    python scripts/fetch_food.py                 # stream, default 12 dishes
    python scripts/fetch_food.py --cache         # download the tarball first
    python scripts/fetch_food.py --list-classes  # the 101 names, no download
"""

from __future__ import annotations

import argparse
import io
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
OUT = ROOT / "datasets" / "food"
URL = "http://data.vision.ee.ethz.ch/cvl/food-101.tar.gz"

# Twelve visually distinct dishes, weighted towards ones an Indian classroom
# will recognise. Food-101's class folders are lowercase_with_underscores.
DEFAULT_DISHES = [
    "samosa", "chicken_curry", "fried_rice", "spring_rolls",
    "pizza", "hamburger", "french_fries", "donuts",
    "ice_cream", "omelette", "pancakes", "caesar_salad",
]


def stream_members(url: str, wanted: set[str], per_class: int, out: Path):
    """Walk the tarball as it downloads, writing only the classes we asked for."""
    from PIL import Image

    counts = {c: 0 for c in wanted}
    written = 0

    class Redirects(urllib.request.HTTPRedirectHandler):
        http_error_308 = urllib.request.HTTPRedirectHandler.http_error_301

    req = urllib.request.Request(url, headers={"User-Agent": "sutra-finetune/0.1"})
    with urllib.request.build_opener(Redirects()).open(req, timeout=120) as resp:
        # r|gz = stream mode: read-forward only, never seeks, never buffers the
        # whole archive. This is the entire trick.
        with tarfile.open(fileobj=resp, mode="r|gz") as tf:
            for member in tf:
                if not member.isfile() or not member.name.endswith(".jpg"):
                    continue
                parts = member.name.split("/")
                if len(parts) < 3 or parts[-3] != "images":
                    continue
                cls = parts[-2]
                if cls not in wanted or counts[cls] >= per_class:
                    continue

                data = tf.extractfile(member)
                if data is None:
                    continue
                raw = data.read()
                try:
                    with Image.open(io.BytesIO(raw)) as im:
                        im.verify()
                except Exception:  # noqa: BLE001
                    continue

                dest = out / cls
                dest.mkdir(parents=True, exist_ok=True)
                (dest / Path(member.name).name).write_bytes(raw)
                counts[cls] += 1
                written += 1
                if written % 25 == 0:
                    got = sum(1 for c in wanted if counts[c] >= per_class)
                    print(f"    {written} images, {got}/{len(wanted)} classes full",
                          end="\r", flush=True)

                if all(counts[c] >= per_class for c in wanted):
                    print(f"\n  all {len(wanted)} classes full -- stopping the stream early")
                    return counts
    print()
    return counts


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dishes", nargs="+", default=DEFAULT_DISHES)
    ap.add_argument("--per-class", type=int, default=120)
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--cache", action="store_true",
                    help="download the 5 GB tarball to disk first (restartable)")
    ap.add_argument("--list-classes", action="store_true")
    args = ap.parse_args()

    preflight()

    if args.list_classes:
        print("Food-101 class names are lowercase_with_underscores, e.g.:")
        print("  " + ", ".join(DEFAULT_DISHES))
        print("\nThe full list of 101 is in meta/classes.txt inside the archive;")
        print("run without --list-classes and any unknown name will be reported.")
        return 0

    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)

    wanted = set(args.dishes)
    print(f"Food-101: {len(wanted)} dishes x up to {args.per_class} images")

    if args.cache:
        tgz = CACHE / "food-101.tar.gz"
        if not (tgz.exists() and tgz.stat().st_size > 4_000_000_000):
            print("  downloading 5 GB (restartable, but it is 5 GB)")
            CACHE.mkdir(parents=True, exist_ok=True)
            urllib.request.urlretrieve(URL, tgz)
        source = str(tgz)
        with tarfile.open(source) as tf:
            counts = {c: 0 for c in wanted}
            from PIL import Image
            for member in tf:
                parts = member.name.split("/")
                if (not member.isfile() or not member.name.endswith(".jpg")
                        or len(parts) < 3 or parts[-3] != "images"):
                    continue
                cls = parts[-2]
                if cls not in wanted or counts[cls] >= args.per_class:
                    continue
                raw = tf.extractfile(member).read()
                try:
                    with Image.open(io.BytesIO(raw)) as im:
                        im.verify()
                except Exception:  # noqa: BLE001
                    continue
                (out / cls).mkdir(parents=True, exist_ok=True)
                (out / cls / Path(member.name).name).write_bytes(raw)
                counts[cls] += 1
    else:
        print("  streaming -- nothing large touches the disk. No resume; see --cache.")
        counts = stream_members(URL, wanted, args.per_class, out)

    missing = [c for c, n in counts.items() if n == 0]
    if missing:
        print(f"\n  ! no images found for: {', '.join(missing)}")
        print("    Check the spelling -- Food-101 uses lowercase_with_underscores.")

    for cls in sorted(counts):
        print(f"    {cls:<20} {counts[cls]:>4}")

    (out / "ATTRIBUTION.md").write_text(
        "# Food-101\n\n"
        "**Research / fair use only.** The images come from Foodspotting and are\n"
        "NOT owned by ETH Zurich; anything beyond scientific fair use must be\n"
        "negotiated with the individual picture owners. Do not publish these\n"
        "images. See PLAN.md section 6 for the swap layer.\n\n"
        "> L. Bossard, M. Guillaumin, L. Van Gool. *Food-101 -- Mining\n"
        "> Discriminative Components with Random Forests.* ECCV, 2014.\n\n"
        "https://data.vision.ee.ethz.ch/cvl/datasets_extra/food-101/\n",
        encoding="utf-8")

    print(f"\n  {sum(counts.values())} images -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
