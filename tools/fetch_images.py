"""Download real Gardens by the Bay photos from the official site into assets/places/."""
import io
import sys
import urllib.request
from pathlib import Path

from PIL import Image

BASE = "https://www.gardensbythebay.com.sg"
DAM = "/content/dam/gbb-2021/image/things-to-do/attractions/"
OUT = Path(r"d:\Martin Workspace\Projects\GardensBYBay\assets\places")
OUT.mkdir(parents=True, exist_ok=True)

# key -> list of candidate official image paths (first that works wins)
CANDIDATES = {
    "flower": [DAM + "flower-dome/main/flower-dome-main.jpg", DAM + "flower-dome/gallery/flower-dome-01.jpg"],
    "cloud": [DAM + "cloud-forest/main/cloud-forest-night-main.jpg", DAM + "cloud-forest/gallery/cloud-forest-01.jpg"],
    "floral": [DAM + "floral-fantasy/main/floral-fantasy-main.jpg", DAM + "floral-fantasy/gallery/floral-fantasy-01.jpg"],
    "skyway": [DAM + "ocbc-skyway/main/ocbc-skyway-main.jpg", DAM + "ocbc-skyway/gallery/ocbc-skyway-01.jpg"],
    "observatory": [DAM + "supertree-observatory/main/supertree-observatory-main.jpg"],
    "supertree": [DAM + "supertree-grove/main/supertree-grove-main.jpg"],
    "children": [
        DAM + "far-east-organization-children%27s-garden/main/far-east-organisation-childrens-garden-main.jpg",
    ],
    "lake": [DAM + "dragonfly-and-kingfisher-lakes/main/dragonfly-and-kingfisher-lakes-main.jpg"],
    "heritage": [DAM + "heritage-gardens/main/heritage-garden-main.jpg"],
    "planet": [
        DAM + "art-sculptures/gallery/DP01-2-planet.jpeg",
        DAM + "art-sculptures/main/art-sculptures-3.jpg",
    ],
    "worldplants": [DAM + "world-of-plants/main/world-of-plants-main.jpg"],
    "wetlands": [DAM + "kingfisher-wetlands/kw-1920x1080.jpg", DAM + "kingfisher-wetlands/kw-1000x1000-thumb.jpg"],
    "bayeast": [DAM + "bay-east-garden/main/bay-east-main.jpg"],
    "active": [DAM + "propnex-family-zone/1920x1080-propnex-family-zone.jpg"],
    "serene": [DAM + "serene-garden/main/serene-garden-main.jpg"],
    "sunpavilion": [DAM + "sun-pavilion/main/masthead_sun_pavilion.jpg"],
    # likely-missing guesses (will be reported if none work)
    "golden": [DAM + "golden-garden/main/golden-garden-main.jpg"],
    "canopy": [DAM + "the-canopy/main/the-canopy-main.jpg", DAM + "the-calyx/main/the-calyx-main.jpg"],
    "canyon": [DAM + "the-canyon/main/the-canyon-main.jpg"],
    "satay": [],
    "starbucks": [],
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    "Referer": BASE + "/",
    "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
}

ok, missing = {}, []
for key, paths in CANDIDATES.items():
    got = False
    for p in paths:
        url = BASE + p
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            img = Image.open(io.BytesIO(data)).convert("RGB")
            if img.width < 400:
                raise ValueError("too small")
            # cap width for web performance
            if img.width > 1600:
                h = round(img.height * 1600 / img.width)
                img = img.resize((1600, h), Image.Resampling.LANCZOS)
            dest = OUT / f"{key}.jpg"
            img.save(dest, "JPEG", quality=88, optimize=True)
            ok[key] = (img.size, dest.stat().st_size, p)
            got = True
            break
        except Exception as e:  # noqa: BLE001
            continue
    if not got:
        missing.append(key)

print("DOWNLOADED:")
for k, (size, bytes_, p) in ok.items():
    print(f"  {k:12s} {size[0]}x{size[1]}  {bytes_//1024} KB  <- {p.split('/attractions/')[-1]}")
print("MISSING:", ", ".join(missing) if missing else "none")
sys.exit(0)
