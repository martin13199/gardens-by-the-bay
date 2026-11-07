import re, urllib.request
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=30).read().decode("utf8", "ignore")
for page in ["https://www.gardensbythebay.com.sg/", "https://www.gardensbythebay.com.sg/en/things-to-do/attractions.html"]:
    try:
        html = get(page)
    except Exception as e:
        print(page, e); continue
    urls = sorted(set(re.findall(r'/content/dam/gbb-2021/[^"\'\s)>]+\.(?:jpg|jpeg|png)', html, re.I)))
    print(page, len(urls))
    for u in urls:
        print("  ", u)
