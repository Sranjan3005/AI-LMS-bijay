"""
fetch_pets.py -- download and organise Oxford-IIIT Pet into datasets/pets/.

WHY THIS DOMAIN FIRST

Oxford-IIIT Pet is **CC BY-SA 4.0 and explicitly permits commercial use** -- the
only one of the five domains with a licence that clean. It is also a single
tarball with no registration, so it is the fastest way to get the whole pipeline
(embed -> heads -> full grid -> parity) proved end to end.

!! IT IS NOT THE DEMO'S HEADLINE DOMAIN. ImageNet contains ~120 dog breeds, so
the generalist in Act 3 will happily say "pug" and the "the word you want is not
in my vocabulary" hook collapses. Flowers, butterflies and mushrooms are the
demo domains, for exactly that reason (see PLAN.md section 4).

Pets earns its place twice over anyway:
  * as the pipeline shakedown, because the licence needs no thought, and
  * later, as the deliberate counter-lesson -- *sometimes the generalist already
    knows, and fine-tuning is not the answer.* Most curricula skip that.

LICENCE OBLIGATION

CC BY-SA 4.0 requires attribution. An ATTRIBUTION.md is written next to the
images; keep it with them, and carry the citation into anything published.

USAGE

    python scripts/fetch_pets.py                    # the default 12 breeds
    python scripts/fetch_pets.py --per-class 60     # smaller, faster to embed
    python scripts/fetch_pets.py --list             # show all 37 breeds, download nothing
    python scripts/fetch_pets.py --breeds pug beagle Siamese Bombay

Downloads ~792 MB once, caches it, and is safe to re-run.
"""

from __future__ import annotations

import argparse
import re
import shutil
import sys
import tarfile
import urllib.request
from pathlib import Path

# Windows consoles default to cp1252, and printing anything outside it raises
# UnicodeEncodeError *inside* the script rather than at the boundary -- the same
# trap Stage1/config/settings/base.py already had to fix for the Celery worker.
# Kaggle and CI are UTF-8; this only matters locally.
for _stream in (sys.stdout, sys.stderr):
    try:
        if (_stream.encoding or "").lower() not in ("utf-8", "utf8"):
            _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001 -- a non-reconfigurable stream is fine
        pass


ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
OUT = ROOT / "datasets" / "pets"

# Mirrors, tried in order. Verified 2026-08-07: 791,918,971 bytes.
#
# The first is where the canonical VGG page redirects to (308) -- note the path
# is /pets/, NOT the /~vgg/data/pets/ you would guess from the website's own
# URLs. The second is the official page, kept as a fallback because it is the
# one that is documented and therefore the one most likely to be maintained;
# it 308s onto the first.
URLS = [
    "https://thor.robots.ox.ac.uk/pets/images.tar.gz",
    "https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz",
]

# Twelve, chosen to be visually separable so the confusion matrix is readable on
# a projector, and split evenly between cats and dogs so the classes are not all
# variations of one silhouette. In the source filenames cats are Capitalised and
# dogs are lowercase -- that is the dataset's own convention, not ours.
DEFAULT_BREEDS = [
    "Bombay",            # solid black cat
    "Persian",           # flat face, long fur
    "Siamese",           # colourpoint
    "Sphynx",            # hairless
    "Bengal",            # spotted
    "Maine_Coon",        # large, tufted
    "pug",               # flat face, small
    "beagle",            # tricolour hound
    "chihuahua",         # very small
    "german_shorthaired",
    "samoyed",           # white, thick coat
    "saint_bernard",     # large, patched
]

FILENAME = re.compile(r"^(?P<breed>.+)_\d+\.jpg$")


def opener():
    """urllib that follows 308 Permanent Redirect.

    Python's HTTPRedirectHandler covers 301/302/303/307 but only gained 308 in
    3.11 -- and the Oxford mirror answers 308. On 3.10 that surfaces as a bare
    "HTTP Error 308", which reads like the host is down rather than like a
    missing feature.
    """
    class Redirects(urllib.request.HTTPRedirectHandler):
        http_error_308 = urllib.request.HTTPRedirectHandler.http_error_301

    return urllib.request.build_opener(Redirects())


def download(dest: Path) -> Path:
    if dest.exists() and dest.stat().st_size > 700_000_000:
        print(f"  = already downloaded ({dest.stat().st_size / 1e6:.0f} MB)")
        return dest

    dest.parent.mkdir(parents=True, exist_ok=True)
    last_error = None
    for url in URLS:
        print(f"  downloading {url}")
        try:
            tmp = dest.with_suffix(".partial")
            with opener().open(url, timeout=60) as r:
                total = int(r.headers.get("Content-Length", 0))
                done = 0
                with tmp.open("wb") as fh:
                    while chunk := r.read(1 << 20):
                        fh.write(chunk)
                        done += len(chunk)
                        if total:
                            print(f"    {done / 1e6:7.0f} / {total / 1e6:.0f} MB"
                                  f"  ({done * 100 // total:3d}%)", end="\r", flush=True)
            print()
            tmp.replace(dest)
            return dest
        except Exception as e:  # noqa: BLE001 -- any failure means try the mirror
            last_error = e
            print(f"    failed: {e}")
    raise SystemExit(f"Could not download from any mirror. Last error: {last_error}")


def extract(archive: Path, into: Path) -> Path:
    images = into / "images"
    if images.exists() and any(images.iterdir()):
        print(f"  = already extracted to {images}")
        return images
    print("  extracting (this takes a minute)...")
    into.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive) as tf:
        # filter="data" refuses absolute paths and symlinks escaping the target.
        # Python 3.14 makes it the default; being explicit keeps 3.10 safe too.
        try:
            tf.extractall(into, filter="data")
        except TypeError:
            tf.extractall(into)
    return images


def breeds_in(images: Path):
    found = {}
    for f in images.iterdir():
        m = FILENAME.match(f.name)
        if m:
            found.setdefault(m.group("breed"), []).append(f)
    return found


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--breeds", nargs="+", default=DEFAULT_BREEDS)
    ap.add_argument("--per-class", type=int, default=200,
                    help="cap per breed (the source has ~200)")
    ap.add_argument("--out", default=str(OUT))
    ap.add_argument("--list", action="store_true",
                    help="list every breed in the archive and exit")
    args = ap.parse_args()

    archive = download(CACHE / "oxford-iiit-pet-images.tar.gz")
    images = extract(archive, CACHE / "oxford-iiit-pet")
    available = breeds_in(images)

    if args.list:
        print(f"\n{len(available)} breeds available:\n")
        for name in sorted(available, key=str.lower):
            kind = "cat" if name[0].isupper() else "dog"
            print(f"  {name:<32} {len(available[name]):>4} images  ({kind})")
        return 0

    missing = [b for b in args.breeds if b not in available]
    if missing:
        print(f"\nNot in the archive: {', '.join(missing)}")
        print("Run with --list to see the exact names (they are case-sensitive).")
        return 1

    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)

    # Pillow is used to reject the handful of corrupt / non-JPEG files this
    # dataset is known to contain. Copying them would fail later, inside a
    # DataLoader worker, where the error is far less legible.
    from PIL import Image

    print(f"\n  organising into {out}")
    total = skipped = 0
    for breed in args.breeds:
        dest = out / breed
        dest.mkdir(parents=True, exist_ok=True)
        kept = 0
        for src in sorted(available[breed]):
            if kept >= args.per_class:
                break
            try:
                with Image.open(src) as im:
                    im.verify()
                with Image.open(src) as im:
                    if im.mode != "RGB":
                        im.convert("RGB").save(dest / src.name, "JPEG", quality=95)
                    else:
                        shutil.copy2(src, dest / src.name)
                kept += 1
            except Exception:  # noqa: BLE001
                skipped += 1
        total += kept
        print(f"    {breed:<32} {kept:>4}")

    (out / "ATTRIBUTION.md").write_text(
        "# Oxford-IIIT Pet Dataset\n\n"
        "Licensed **CC BY-SA 4.0** -- commercial use permitted, attribution and\n"
        "share-alike required. Keep this file with the images.\n\n"
        "> O. M. Parkhi, A. Vedaldi, A. Zisserman, C. V. Jawahar.\n"
        "> *Cats and Dogs.* IEEE Conference on Computer Vision and Pattern\n"
        "> Recognition, 2012.\n\n"
        "https://www.robots.ox.ac.uk/~vgg/data/pets/\n\n"
        f"Subset: {len(args.breeds)} of 37 breeds, up to {args.per_class} images each.\n",
        encoding="utf-8")

    print(f"\n  {total} images across {len(args.breeds)} breeds"
          + (f", {skipped} skipped as unreadable" if skipped else ""))
    print(f"  -> {out}")
    print("\nNext:")
    print("  python scripts/embed_datasets.py --dataset pets")
    print("  python scripts/train_heads.py --dataset pets")
    return 0


if __name__ == "__main__":
    sys.exit(main())
