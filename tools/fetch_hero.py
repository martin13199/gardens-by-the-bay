import io, urllib.request
from pathlib import Path
from PIL import Image

B = "https://www.gardensbythebay.com.sg/content/dam/gbb-2021/image/"
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
     "Referer": "https://www.gardensbythebay.com.sg/"}
OUT = Path(__file__).resolve().parent.parent / "assets" / "hero"
OUT.mkdir(parents=True, exist_ok=True)

C = {
    "overview": [B + "home/banners/overview-of-gardens-attractions.jpg"],
    "rhapsody": [B + "things-to-do/events/garden-rhapsody/gr-masthead-1920x1080.jpg",
                 B + "things-to-do/events/garden-rhapsody/gr-masthead-1920x1080.jpg.transform/resize1280x720/convert1x1/lowres/image.jpg"],
    "gardens": [B + "things-to-do/attractions/main/gardens-overview-2.jpg"],
    "sculptures": [B + "things-to-do/attractions/banner/art-sculptures.jpg"],
    "story": [B + "about-us/our-garden-story/our-story/main/our-story.jpg.transform/resize1280x720/convert1x1/image.jpg"],
    "sustainability": [B + "things-to-do/banners/susnew-full-width-banner-1920x600.jpg"],
}
ok, bad = [], []
for k, urls in C.items():
    for u in urls:
        try:
            data = urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=40).read()
            im = Image.open(io.BytesIO(data)).convert("RGB")
            if im.width > 2000:
                im = im.resize((2000, int(im.height * 2000 / im.width)), Image.LANCZOS)
            im.save(OUT / f"{k}.jpg", quality=88)
            ok.append((k, im.size))
            break
        except Exception as e:
            err = str(e)
    else:
        bad.append((k, err))
print("OK", ok)
print("BAD", bad)
