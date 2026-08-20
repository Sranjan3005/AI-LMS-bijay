"""
fetch_gbif.py -- build a dataset from openly-licensed observation photos.

This is how butterflies and mushrooms get sourced, and it is the commercial-safe
twin for flowers. Three reasons it beats a scraped benchmark:

  * **Genuinely open.** Filtered to CC0 and CC-BY only, so it can be published.
  * **You choose the species.** Which means you can choose ones that occur in
    India, so the flowers look like the school garden rather than a Surrey
    hedgerow. That is a real pitch line, not a detail.
  * No registration, no API key, no Kaggle credentials.

!! THE LICENCE TRAP THIS SCRIPT EXISTS TO AVOID

On GBIF and iNaturalist the **occurrence** licence and the **photo** licence are
separate fields. Filtering on the occurrence licence -- which is what the obvious
`&license=CC0_1_0` query parameter does -- tells you nothing about whether you
may train on the image. A CC0 occurrence can carry a CC-BY-NC photo.

So this filters on `media[].license`, per photo, after fetching. Anything whose
photo licence is missing or non-commercial is dropped and counted. If that
distinction were got wrong the whole point of the twin would be lost, silently.

USAGE

    python scripts/fetch_gbif.py --preset butterflies_in
    python scripts/fetch_gbif.py --preset mushrooms
    python scripts/fetch_gbif.py --preset flowers_in
    python scripts/fetch_gbif.py --name butterflies --species "Danaus chrysippus" "Papilio polytes"

Downloads only what it keeps -- typically 40-150 MB for a 12-class set.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
import urllib.error
import urllib.parse
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
OUT_ROOT = ROOT / "datasets"
API = "https://api.gbif.org/v1"

# Photo licences we will actually train on and could publish. CC-BY-SA is
# included because ShareAlike binds the image, not a model's weights -- but it
# is listed separately so the attribution file can say so.
ALLOWED = {
    "http://creativecommons.org/publicdomain/zero/1.0/": "CC0",
    "https://creativecommons.org/publicdomain/zero/1.0/": "CC0",
    "http://creativecommons.org/licenses/by/4.0/": "CC-BY",
    "https://creativecommons.org/licenses/by/4.0/": "CC-BY",
    "http://creativecommons.org/licenses/by-sa/4.0/": "CC-BY-SA",
    "https://creativecommons.org/licenses/by-sa/4.0/": "CC-BY-SA",
}

PRESETS = {
    # Common in India, visually distinct, and none of them is an ImageNet class.
    "butterflies_in": ("butterflies", [
        "Danaus chrysippus", "Papilio polytes", "Papilio demoleus",
        "Hypolimnas bolina", "Junonia almana", "Catopsilia pomona",
        "Graphium agamemnon", "Euploea core", "Ariadne merione",
        "Delias eucharis", "Acraea terpsicore", "Tirumala limniace",
    ]),
    # Fungi have essentially no ImageNet coverage beyond 8 coarse labels, which
    # makes them the strongest Act 3 domain of the five.
    "mushrooms": ("mushrooms", [
        "Amanita muscaria", "Amanita phalloides", "Agaricus campestris",
        "Coprinus comatus", "Pleurotus ostreatus", "Cantharellus cibarius",
        "Boletus edulis", "Ganoderma lucidum", "Schizophyllum commune",
        "Trametes versicolor", "Macrolepiota procera", "Auricularia auricula-judae",
    ]),
    "flowers_in": ("flowers_owned", [
        "Nelumbo nucifera", "Hibiscus rosa-sinensis", "Helianthus annuus",
        "Tagetes erecta", "Plumeria rubra", "Bougainvillea glabra",
        "Jasminum sambac", "Rosa chinensis", "Catharanthus roseus",
        "Ixora coccinea", "Nerium oleander", "Lantana camara",
    ]),
}


def get(url: str, tries: int = 4):
    """GET with backoff. GBIF returns transient 503s under load; a 4xx is real
    and is re-raised immediately rather than retried four times."""
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if 400 <= e.code < 500:
                raise
            if attempt == tries - 1:
                raise
            time.sleep(2 ** attempt)
        except Exception:  # noqa: BLE001
            if attempt == tries - 1:
                raise
            time.sleep(2 ** attempt)
    return None


def taxon_key(species: str):
    m = get(f"{API}/species/match?" + urllib.parse.urlencode({"name": species}))
    if m.get("matchType") == "NONE" or not m.get("usageKey"):
        return None, m.get("matchType")
    return m["usageKey"], m.get("rank")


def open_photos(key: int, want: int):
    """Occurrence photos whose OWN licence is open. See the header note."""
    urls, seen, offset, rejected = [], set(), 0, 0
    while len(urls) < want and offset < 6000:
        # Pre-filter on the OCCURRENCE licence purely to shrink the candidate
        # pool: roughly 99% of iNaturalist photos are CC-BY-NC, so an unfiltered
        # scan rejects ~180 records per keeper and never reaches 100 per class.
        # Occurrence licence is NOT evidence about the photo -- every result is
        # still checked per-photo below. This is an optimisation, not the filter.
        q = urllib.parse.urlencode([
            ("taxonKey", key), ("mediaType", "StillImage"),
            ("limit", 300), ("offset", offset),
            # GBIF's OCCURRENCE licence enum is only CC0_1_0 / CC_BY_4_0 /
            # CC_BY_NC_4_0 / UNSPECIFIED / UNSUPPORTED. Asking for CC_BY_SA_4_0
            # here is a hard 400. Photos may still be CC-BY-SA, and ALLOWED
            # accepts them -- this list narrows the search, it is not the filter.
            ("license", "CC0_1_0"), ("license", "CC_BY_4_0"),
        ])
        page = get(f"{API}/occurrence/search?{q}")
        results = page.get("results", [])
        if not results:
            break
        for occ in results:
            for med in occ.get("media", []):
                if med.get("type") != "StillImage":
                    continue
                url = med.get("identifier")
                lic = (med.get("license") or "").strip()
                if not url or url in seen:
                    continue
                if lic not in ALLOWED:      # <- the whole point of this script
                    rejected += 1
                    continue
                seen.add(url)
                urls.append((url, ALLOWED[lic]))
                break
        offset += 300
        if page.get("endOfRecords"):
            break
    return urls[:want], rejected


def download_image(url: str, dest: Path) -> bool:
    from PIL import Image
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "sutra-finetune/0.1"})
        with urllib.request.urlopen(req, timeout=45) as r:
            data = r.read()
        dest.write_bytes(data)
        with Image.open(dest) as im:
            im.verify()
        with Image.open(dest) as im:
            # Observation photos are often 3000px+. Nothing downstream needs
            # more than 224, and a 12-class set of full-size JPEGs is gigabytes.
            if max(im.size) > 800:
                im = im.convert("RGB")
                im.thumbnail((800, 800))
                im.save(dest, "JPEG", quality=90)
        return True
    except Exception:  # noqa: BLE001
        dest.unlink(missing_ok=True)
        return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--preset", choices=sorted(PRESETS))
    ap.add_argument("--name", help="dataset folder name (with --species)")
    ap.add_argument("--species", nargs="+")
    ap.add_argument("--per-class", type=int, default=100)
    ap.add_argument("--out", default=str(OUT_ROOT))
    args = ap.parse_args()

    preflight()

    if args.preset:
        name, species = PRESETS[args.preset]
    elif args.name and args.species:
        name, species = args.name, args.species
    else:
        print("Give --preset, or both --name and --species.")
        return 1

    out = Path(args.out) / name
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)

    print(f"Building {name}: {len(species)} species x up to {args.per_class} photos")
    print("Filtering on the PHOTO licence (CC0 / CC-BY / CC-BY-SA), not the occurrence licence.\n")

    manifest, total, total_rejected = [], 0, 0
    for sp in species:
        key, rank = taxon_key(sp)
        if not key:
            print(f"  ! {sp:<28} no GBIF match ({rank}) -- skipped")
            continue

        photos, rejected = open_photos(key, args.per_class)
        total_rejected += rejected
        folder = out / sp.replace(" ", "_")
        folder.mkdir(parents=True, exist_ok=True)

        kept, licences = 0, {}
        for i, (url, lic) in enumerate(photos):
            if download_image(url, folder / f"{i:04d}.jpg"):
                kept += 1
                licences[lic] = licences.get(lic, 0) + 1
            print(f"    {sp:<28} {kept:>4}/{len(photos)}", end="\r", flush=True)

        total += kept
        mix = " ".join(f"{k}:{v}" for k, v in sorted(licences.items())) or "-"
        print(f"  + {sp:<28} {kept:>4} kept   [{mix}]   ({rejected} non-open dropped)")
        manifest.append({"species": sp, "taxon_key": key, "kept": kept, "licences": licences})

    (out / "ATTRIBUTION.md").write_text(
        f"# {name} -- GBIF / iNaturalist Open Data\n\n"
        "Every image here was filtered on its **own photo licence** (CC0, CC-BY or\n"
        "CC-BY-SA), not on the occurrence licence -- those are separate fields on\n"
        "GBIF and only the former governs the image.\n\n"
        "CC-BY and CC-BY-SA require attribution when the images are redistributed.\n"
        "`manifest.json` records the per-species licence mix. CC-BY-SA's share-alike\n"
        "binds the images, not model weights trained from them.\n\n"
        "> GBIF.org occurrence downloads, https://www.gbif.org\n\n"
        f"{len(manifest)} species, {total} images.\n",
        encoding="utf-8")
    (out / "manifest.json").write_text(json.dumps({
        "dataset": name, "source": "gbif", "per_class_cap": args.per_class,
        "species": manifest, "non_open_photos_dropped": total_rejected,
    }, indent=2), encoding="utf-8")

    print(f"\n  {total} images across {len(manifest)} species")
    print(f"  {total_rejected} photos dropped for a non-open licence")
    print(f"  -> {out}")
    print(f"\nNext:\n  python scripts/embed_datasets.py --dataset {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
