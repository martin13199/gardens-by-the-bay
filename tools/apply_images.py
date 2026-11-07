"""Point every place at assets/places/<key>.jpg and create placeholders for missing photos."""
import re
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PLACES_DIR = ROOT / "assets" / "places"
JS = ROOT / "js" / "places.js"

NAMES = {
    "golden": "Golden Garden",
    "canopy": "The Canopy / The Calyx",
    "satay": "Satay by the Bay",
    "starbucks": "Starbucks",
}


def font(size, bold=False):
    for name in ("georgiab.ttf" if bold else "georgia.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def placeholder(key, title):
    w, h = 1600, 900
    img = Image.new("RGB", (w, h))
    px = img.load()
    top, bot = (23, 61, 53), (16, 46, 40)
    for y in range(h):
        t = y / h
        c = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        for x in range(w):
            px[x, y] = c
    d = ImageDraw.Draw(img)
    d.ellipse((w - 520, -200, w + 200, 520), outline=(215, 184, 121), width=3)
    d.ellipse((-200, h - 420, 420, h + 200), outline=(215, 184, 121), width=3)
    f1, f2 = font(76, True), font(30)
    tw = d.textlength(title, font=f1)
    d.text(((w - tw) / 2, h / 2 - 60), title, fill=(246, 245, 239), font=f1)
    sub = "Gardens by the Bay  -  photo coming soon"
    sw = d.textlength(sub, font=f2)
    d.text(((w - sw) / 2, h / 2 + 50), sub, fill=(215, 184, 121), font=f2)
    img.save(PLACES_DIR / f"{key}.jpg", quality=90)


made = []
for key, title in NAMES.items():
    if not (PLACES_DIR / f"{key}.jpg").exists():
        placeholder(key, title)
        made.append(key)

src = JS.read_text(encoding="utf-8")
out, current = [], None
for line in src.splitlines():
    m = re.match(r"^  (\w+): \{$", line)
    if m:
        current = m.group(1)
    if current and re.match(r'^\s+image: "', line):
        line = f'    image: "assets/places/{current}.jpg",'
    out.append(line)
JS.write_text("\n".join(out) + "\n", encoding="utf-8")
print("placeholders:", made)
