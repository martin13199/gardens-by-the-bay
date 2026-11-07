from PIL import Image, ImageFilter, ImageEnhance
from pathlib import Path

src = Path(
    r"C:\Users\STRAT256\.cursor\projects\d-Martin-Workspace-Projects-GardensBYBay\assets\c__Users_STRAT256_AppData_Roaming_Cursor_User_workspaceStorage_6796ff9c3b66c9b83a8943a1de4b0563_images_image-e8becb46-8713-4f68-8b69-bc83307a53cb.jpg"
)
official = Path(r"d:\Martin Workspace\Projects\GardensBYBay\assets\bay-south-map-official.jpg")
out = Path(r"d:\Martin Workspace\Projects\GardensBYBay\assets\bay-south-map.png")
out_jpg = Path(r"d:\Martin Workspace\Projects\GardensBYBay\assets\bay-south-map-hires.jpg")

# Prefer official high-res source when available
source = official if official.exists() and official.stat().st_size > 50000 else src
img = Image.open(source).convert("RGB")
w, h = img.size
print("source", source.name, w, h)
pixels = img.load()


def is_pad(x, y):
    r, g, b = pixels[x, y]
    if r > 245 and g > 245 and b > 245:
        return True
    mx, mn = max(r, g, b), min(r, g, b)
    if mx - mn < 18 and 90 < r < 175:
        return True
    # near-black empty letterboxing
    if r < 18 and g < 18 and b < 18:
        return True
    return False


def find_bounds():
    left = 0
    for x in range(w):
        nonpad = sum(1 for y in range(0, h, max(1, h // 100)) if not is_pad(x, y))
        if nonpad > 10:
            left = max(0, x - 2)
            break
    right = w
    for x in range(w - 1, -1, -1):
        nonpad = sum(1 for y in range(0, h, max(1, h // 100)) if not is_pad(x, y))
        if nonpad > 10:
            right = min(w, x + 2)
            break
    top = 0
    for y in range(h):
        nonpad = sum(1 for x in range(0, w, max(1, w // 100)) if not is_pad(x, y))
        if nonpad > 10:
            top = max(0, y - 1)
            break
    bottom = h
    for y in range(h - 1, -1, -1):
        nonpad = sum(1 for x in range(0, w, max(1, w // 100)) if not is_pad(x, y))
        if nonpad > 10:
            bottom = min(h, y + 2)
            break
    return left, top, right, bottom


left, top, right, bottom = find_bounds()
# Keep a little safety margin if crop is too aggressive
if right - left < w * 0.7:
    left, right = 0, w
if bottom - top < h * 0.7:
    top, bottom = 0, h

print("crop", left, top, right, bottom)
cropped = img.crop((left, top, right, bottom))

# Upscale for sharper on-screen pixels (2x if under 2400 wide)
scale = 2 if cropped.width < 2400 else 1
hires = cropped.resize((cropped.width * scale, cropped.height * scale), Image.Resampling.LANCZOS)
hires = hires.filter(ImageFilter.UnsharpMask(radius=1.1, percent=130, threshold=2))
hires = ImageEnhance.Contrast(hires).enhance(1.05)
hires = ImageEnhance.Color(hires).enhance(1.04)

hires.save(out, format="PNG", optimize=True)
hires.save(out_jpg, format="JPEG", quality=92, optimize=True)
print("saved", out, hires.size, out.stat().st_size)
print("saved", out_jpg, out_jpg.stat().st_size)
