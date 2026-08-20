"""
fetch_kaggle.py -- pull any Kaggle image dataset into datasets/<name>/.

Works for the iNaturalist-derived mushroom sets, and for anything else on Kaggle
laid out as one folder per class. Kaggle datasets are usually far larger and
better populated than what the GBIF API will hand over per species, so this is
the faster route to a big set.

SUGGESTED MUSHROOM SOURCES

    thehir0/mushroom-species                        ~50k photos, 100 species
    daniilonishchenko/mushrooms-images-classification-215   215 classes
    maysee/mushrooms-classification-common-genuss-images    common genera
    iftekhar08/mo-106                               Mushroom Observer, 106 species

Layouts differ between them, so this does not assume one: it finds the deepest
directory level that actually contains images and treats those folders as the
classes. `--inspect` shows what it found before anything is copied.

SETUP (once)

    pip install kaggle

    Kaggle -> your avatar -> Settings -> API -> "Create New Token"
    Save the downloaded kaggle.json to:
        Windows   C:\\Users\\<you>\\.kaggle\\kaggle.json
        Linux/Mac ~/.kaggle/kaggle.json

USAGE

    python scripts/fetch_kaggle.py --dataset thehir0/mushroom-species --name mushrooms --inspect
    python scripts/fetch_kaggle.py --dataset thehir0/mushroom-species --name mushrooms --top-classes 12
    python scripts/fetch_kaggle.py --dataset <slug> --name butterflies --classes "Danaus" "Papilio"
"""

from __future__ import annotations

import argparse
import collections
import shutil
import sys
import zipfile
from pathlib import Path, PurePosixPath

from env_check import preflight

for _stream in (sys.stdout, sys.stderr):
    try:
        if (_stream.encoding or "").lower() not in ("utf-8", "utf8"):
            _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:  # noqa: BLE001
        pass


ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "kaggle"
OUT_ROOT = ROOT / "datasets"
IMAGE_SUFFIXES = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def require_kaggle():
    """Import the Kaggle client, or explain exactly what is missing.

    The library authenticates at *import* time, so a missing token raises an
    OSError from inside the import rather than at the call site -- which reads
    like the package is broken rather than unconfigured.
    """
    try:
        import kaggle  # noqa: F401
    except ImportError:
        print("\nThe `kaggle` package is not installed.\n")
        print(f"  {sys.executable} -m pip install kaggle\n")
        sys.exit(1)
    except OSError as e:
        home = Path.home() / ".kaggle" / "kaggle.json"
        print(f"\nKaggle credentials not found ({e}).\n")
        print("  1. kaggle.com -> avatar -> Settings -> API -> Create New Token")
        print(f"  2. save the downloaded kaggle.json to:\n       {home}\n")
        sys.exit(1)
    from kaggle.api.kaggle_api_extended import KaggleApi
    api = KaggleApi()
    api.authenticate()
    return api


def download_zip(api, slug: str) -> Path:
    """Fetch the archive and leave it archived.

    The original version called `extractall`, which is what a 9.45 GB Kaggle
    dataset does to a 20 GB disk: download 9.45 GB, unpack ~10 GB beside it,
    then copy out the 70 MB actually wanted. On Kaggle that is
    `OSError: [Errno 28] No space left on device`.

    A zip is random-access, unlike a tar.gz, so we can read the file list and
    pull out only the members we want. Nothing is ever unpacked wholesale.
    """
    dest = CACHE / slug.replace("/", "__")
    dest.mkdir(parents=True, exist_ok=True)

    existing = sorted(dest.glob("*.zip"))
    if existing:
        print(f"  = cached {existing[0].name} ({existing[0].stat().st_size / 1e9:.1f} GB)")
        return existing[0]

    print(f"  downloading {slug}")
    api.dataset_download_files(slug, path=str(dest), unzip=False, quiet=False)
    zips = sorted(dest.glob("*.zip"))
    if not zips:
        raise SystemExit(f"No .zip appeared in {dest} -- did the download fail?")
    return zips[0]


def classes_from_zip(zf: zipfile.ZipFile):
    """Class map read from the archive index. Extracts nothing."""
    counts = collections.Counter()
    members = collections.defaultdict(list)
    for info in zf.infolist():
        if info.is_dir():
            continue
        name = PurePosixPath(info.filename)
        if name.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        counts[name.parent] += 1
        members[name.parent].append(info)
    return group_classes(counts), members


def find_class_folders(root: Path):
    """Directories that directly contain images -> candidate classes.

    Kaggle layouts vary wildly (`data/train/<class>/`, `<class>/`,
    `images/<genus>/<species>/`). Rather than guessing a fixed depth, count
    images per directory and keep the ones that hold them.
    """
    counts = collections.Counter()
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES:
            counts[path.parent] += 1
    if not counts:
        return {}

    return group_classes(counts)


def group_classes(counts):
    """Shared by the zip and on-disk paths: turn {folder: n} into {class: [(folder, n)]}."""
    if not counts:
        return {}

    # Drop split directories that merely aggregate -- a folder is a class only
    # if it holds images itself and is not the parent of other class folders.
    parents = {p.parent for p in counts}
    leaves = {p: n for p, n in counts.items() if p not in parents}

    # A dataset split as data/train/<class>/ and data/test/<class>/ yields the
    # same class name twice. Merge them: we do our own deterministic split
    # later, so train/test folders are just two piles of the same class -- and
    # leaving them separate would apply --per-class to each pile.
    merged = collections.defaultdict(list)
    for path, n in leaves.items():
        merged[path.name].append((path, n))

    # If one leaf name appears under genuinely different parents (genus/species
    # trees), qualify it so two different classes cannot collide.
    out = {}
    for name, group in merged.items():
        stems = {p.parent.name for p, _ in group}
        splitish = stems <= {"train", "test", "val", "valid", "validation", "images", "data"}
        for path, n in group:
            key = name if (len(group) == 1 or splitish) else f"{path.parent.name}_{name}"
            out.setdefault(key, []).append((path, n))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dataset", required=True, help="Kaggle slug, e.g. thehir0/mushroom-species")
    ap.add_argument("--name", required=True, help="output folder under datasets/")
    ap.add_argument("--classes", nargs="+", help="folder names to keep (substring match)")
    ap.add_argument("--top-classes", type=int, default=12,
                    help="if --classes is omitted, take the N largest")
    ap.add_argument("--per-class", type=int, default=120)
    ap.add_argument("--min-per-class", type=int, default=30,
                    help="ignore classes thinner than this")
    ap.add_argument("--out", default=str(OUT_ROOT))
    ap.add_argument("--inspect", action="store_true",
                    help="show the detected classes and exit without copying")
    ap.add_argument("--keep-zip", action="store_true",
                    help="keep the downloaded archive (re-runs are then free, "
                         "but a 9 GB zip may not fit on Kaggle's disk)")
    args = ap.parse_args()

    preflight()
    import io
    from PIL import Image

    api = require_kaggle()
    archive = download_zip(api, args.dataset)

    with zipfile.ZipFile(archive) as zf:
        folders, members = classes_from_zip(zf)
        if not folders:
            print(f"\nNo images found inside {archive.name}.")
            return 1

        ranked = sorted(((name, paths, sum(n for _, n in paths))
                         for name, paths in folders.items()),
                        key=lambda r: -r[2])

        if args.inspect:
            print(f"\n{len(ranked)} classes detected (largest first):\n")
            for name, paths, n in ranked[:40]:
                where = ", ".join(str(p) for p, _ in paths[:2])
                print(f"  {n:>6}  {name:<36} {where}")
            if len(ranked) > 40:
                print(f"  ... and {len(ranked) - 40} more")
            print("\n  (nothing extracted -- the archive index was read in place)")
            return 0

        if args.classes:
            wanted = [r for r in ranked
                      if any(c.lower() in r[0].lower() for c in args.classes)]
            if not wanted:
                print(f"\nNothing matched {args.classes}. Try --inspect.")
                return 1
        else:
            wanted = [r for r in ranked if r[2] >= args.min_per_class][:args.top_classes]

        out = Path(args.out) / args.name
        if out.exists():
            shutil.rmtree(out)

        print(f"\n  extracting {len(wanted)} classes into {out}")
        total = skipped = 0
        for name, paths, _ in wanted:
            dest = out / name.replace(" ", "_")
            dest.mkdir(parents=True, exist_ok=True)
            kept = 0
            # Only the members belonging to this class, across all its folders.
            sources = [m for folder, _ in paths for m in members[folder]]
            for info in sorted(sources, key=lambda i: i.filename):
                if kept >= args.per_class:   # cap across ALL folders for this class
                    break
                try:
                    raw = zf.read(info)      # <- the only bytes we ever unpack
                    with Image.open(io.BytesIO(raw)) as im:
                        im.verify()
                    with Image.open(io.BytesIO(raw)) as im:
                        im = im.convert("RGB")
                        # Kaggle sets often ship 4000px originals; nothing
                        # downstream reads past 224.
                        if max(im.size) > 800:
                            im.thumbnail((800, 800))
                        im.save(dest / f"{PurePosixPath(info.filename).stem}.jpg",
                                "JPEG", quality=90)
                    kept += 1
                except Exception:  # noqa: BLE001
                    skipped += 1
            total += kept
            print(f"    {name:<40} {kept:>4}")

        (out / "SOURCE.md").write_text(
            f"# {args.name}\n\nFrom the Kaggle dataset `{args.dataset}`.\n\n"
            f"{len(wanted)} classes, {total} images, capped at "
            f"{args.per_class} per class.\n",
            encoding="utf-8")

    # Outside the `with`, so the archive is closed before we delete it.
    if not args.keep_zip:
        size_gb = archive.stat().st_size / 1e9
        archive.unlink(missing_ok=True)
        print(f"\n  removed the {size_gb:.1f} GB archive "
              "(pass --keep-zip to keep it for faster re-runs)")

    print(f"\n  {total} images across {len(wanted)} classes"
          + (f", {skipped} unreadable" if skipped else ""))
    print(f"  -> {out}")
    print(f"\nNext:\n  python scripts/embed_datasets.py --dataset {args.name}"
          f"\n  python scripts/train_heads.py --dataset {args.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
