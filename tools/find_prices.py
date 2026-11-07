import re, html as H_, urllib.request
H = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=30).read().decode("utf8", "ignore")
base = "https://www.gardensbythebay.com.sg/en/things-to-do/"
pages = ["attractions/flower-dome", "attractions/cloud-forest", "attractions/floral-fantasy", "attractions/ocbc-skyway",
         "attractions/supertree-observatory", "dine-and-shop/satay-by-the-bay", "attractions/the-canyon", "attractions/supertree-grove"]
for p in pages:
    try:
        t = get(base + p + ".html")
    except Exception as e:
        print("ERR", p, e); continue
    t = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", t)
    txt = re.sub(r"\s+", " ", H_.unescape(re.sub(r"<[^>]+>", " ", t)))
    print("==", p, len(txt))
    for m in re.finditer(r"[^.]{0,90}\$\s?\d[^.]{0,90}", txt):
        print("   ", m.group(0).strip()[:200])
    for m in re.finditer(r"(Mon|Tue|Daily|Opens daily|Open daily)[^.]{0,100}", txt):
        print("   H:", m.group(0).strip()[:140]); break
