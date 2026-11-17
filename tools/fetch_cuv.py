import json, time, urllib.request, sys

BASE = "https://bolls.life"
def get(path):
    for attempt in range(4):
        try:
            req = urllib.request.Request(BASE + path, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:
            print("retry", path, e, flush=True)
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("failed: " + path)

books = get("/get-books/CUV/")
print("books:", len(books), flush=True)
out = []
total_ch = 0
total_v = 0
for b in books:
    bid, name, nch = b["bookid"], b["name"], b["chapters"]
    chapters = []
    for ch in range(1, nch + 1):
        verses = get(f"/get-text/CUV/{bid}/{ch}/")
        verses = sorted(verses, key=lambda v: v["verse"])
        chapters.append([v["text"].strip() for v in verses])
        total_ch += 1
        total_v += len(verses)
        time.sleep(0.12)
    out.append({"bookid": bid, "name": name, "chapters": chapters})
    print(f"{bid} {name}: {nch} chapters ok (total {total_ch} ch, {total_v} v)", flush=True)

with open("/home/hatch/workspace/church-app-dev/data/cuv_bolls.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False)
print("DONE chapters:", total_ch, "verses:", total_v)
