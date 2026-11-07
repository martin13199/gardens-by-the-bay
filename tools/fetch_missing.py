import io, re, urllib.request
from pathlib import Path
from PIL import Image
B = "https://www.gardensbythebay.com.sg"
D = B + "/content/dam/gbb-2021/image/"
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Referer": B + "/"}
OUT = Path(__file__).resolve().parent.parent / "assets" / "places"

def raw(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=40).read()

# look for Satay by the Bay on dining pages
for page in ["/en/things-to-do/dine-and-shop.html", "/en/things-to-do/dine-and-shop/restaurants.html"]:
    try:
        t = raw(B + page).decode("utf8", "ignore")
    except Exception as e:
        print("ERR", page, e); continue
    for m in sorted(set(re.findall(r'/en/things-to-do/dine-and-shop/[^"\']*satay[^"\']*', t, re.I))):
        print("SATAY PAGE", m)
    for m in sorted(set(re.findall(r'/content/dam/gbb-2021/image/[^"\']*satay[^"\']*', t, re.I))):
        print("SATAY IMG", m)

C = {
    "golden": [D + "plan-your-visit/itinerary/sdw-2023/1920x1080-GoldenGarden.jpg"],
    "canopy": [D + "plan-your-visit/gardens-map/custom/the-canopy-main.jpg"],
    "starbucks": [D + "things-to-do/dine-and-shop/starbucks/starbucks-9-1920x1080.jpg"],
}
for k, urls in C.items():
    for u in urls:
        try:
            im = Image.open(io.BytesIO(raw(u))).convert("RGB")
            if im.width > 1600:
                im = im.resize((1600, int(im.height * 1600 / im.width)), Image.LANCZOS)
            im.save(OUT / f"{k}.jpg", quality=86, optimize=True, progressive=True)
            print("OK", k, im.size)
            break
        except Exception as e:
            print("FAIL", k, u, e)
