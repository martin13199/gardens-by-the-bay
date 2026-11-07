"""Recompress site photos (progressive JPEG, sensible max width). Safe to re-run."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "assets"
LIMITS = {"places": 1400, "hero": 1920}
before = after = 0
for folder, maxw in LIMITS.items():
    for p in sorted((ROOT / folder).glob("*.jpg")):
        b = p.stat().st_size
        im = Image.open(p).convert("RGB")
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        im.save(p, "JPEG", quality=80, optimize=True, progressive=True)
        a = p.stat().st_size
        before += b
        after += a
        print(f"{folder}/{p.name:18} {b//1024:5} KB -> {a//1024:5} KB")
print(f"TOTAL {before//1024} KB -> {after//1024} KB")
