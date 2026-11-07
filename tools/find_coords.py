import re, json, urllib.request
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=30).read().decode("utf8", "ignore")
base = "https://www.gardensbythebay.com.sg"
html = get(base + "/en/plan-your-visit/gardens-map.html")
paths = sorted(set(re.findall(r'data-(?:location|query|url|path)="([^"]+)"', html)))
print(paths)
m = re.search(r'data-location="([^"]+)"', html)
loc = m.group(1).replace("&amp;", "&") if m else None
print("LOC", loc)
for p in paths:
    p = p.replace("&amp;", "&")
    if not p.startswith("/"): continue
    for suffix in ["", "?cat=", "?q="]:
        u = base + p.split("?")[0] + (suffix if suffix else "")
        try:
            t = get(u)
            print("OK", u, len(t), t[:150].replace("\n", " "))
            if "coordinates" in t:
                open("tools/_map.json", "w", encoding="utf8").write(t)
        except Exception as e:
            print("ERR", u, e)
