#!/usr/bin/env python3
"""校验 bolls.life 下载的和合本全文，并生成 Supabase 导入 SQL。

校验：与前端 index.html 的 OT_BOOKS/NT_BOOKS（书卷名+章数）逐卷比对；
抽查关键经文与若干书卷的已知节数。生成 bible_cuv_data_NN.sql（按大小分卷）。
"""
import json, re, sys, os

DEV = "/home/hatch/workspace/church-app-dev"
data = json.load(open(f"{DEV}/data/cuv_bolls.json", encoding="utf-8"))

html = open(f"{DEV}/index.html", encoding="utf-8").read()
def parse_books(var):
    m = re.search(var + r" = (\[\[.*?\]\]);", html, re.S)
    return json.loads(m.group(1))
expected = parse_books("OT_BOOKS") + parse_books("NT_BOOKS")
assert len(expected) == 66 and len(data) == 66, (len(expected), len(data))

KNOWN_VERSES = {  # 公认的和合本各卷节数（抽查）
    "创世纪": 1533, "诗篇": 2461, "以赛亚书": 1292,
    "马太福音": 1071, "启示录": 404,
    # 约翰福音通行计 879 节；bolls 源把 7:53 并入 8:1（内容不缺），故为 878。
    "约翰福音": 878,
}
SPOT = [  # (书卷, 章, 节, 应包含)
    ("创世纪", 1, 1, "起初，神创造天地"),
    ("诗篇", 23, 1, "耶和华是我的牧者"),
    ("约翰福音", 3, 16, "神爱世人"),
    ("以弗所书", 5, 1, "效法神"),
    ("耶利米哀歌", 5, 21, "使我们向你回转"),
]

import opencc
_CC = opencc.OpenCC("t2s")

def clean(t):
    # bolls 的 CUV 为繁体且逐字加空格：去标签 → 去全部空白 → 繁转简。
    t = re.sub(r"<[^>]+>", "", t)
    t = re.sub(r"\s+", "", t).replace("\u3000", "")
    return _CC.convert(t)

errors = []
total_ch = total_v = 0
books_out = []
for idx, (exp, got) in enumerate(zip(expected, data), start=1):
    name, nch = exp  # 入库书卷名一律用前端名（数据名如「创世记」仅作参考）
    if len(got["chapters"]) != nch:
        errors.append(f"{name} 章数不一致: 应 {nch} 实 {len(got['chapters'])}")
    chapters = []
    for ch in got["chapters"]:
        verses = [clean(v) for v in ch]
        if any(not v for v in verses):
            errors.append(f"{name} 有空节")
        chapters.append(verses)
        total_ch += 1
        total_v += len(verses)
    if name in KNOWN_VERSES and sum(len(c) for c in chapters) != KNOWN_VERSES[name]:
        errors.append(f"{name} 节数不一致: 应 {KNOWN_VERSES[name]} 实 {sum(len(c) for c in chapters)}")
    books_out.append((idx, name, chapters))

by_name = {name: chs for _, name, chs in books_out}
for book, ch, v, frag in SPOT:
    try:
        text = by_name[book][ch - 1][v - 1]
        if frag not in text:
            errors.append(f"抽查失败 {book} {ch}:{v}: 「{text[:30]}」不含「{frag}」")
    except Exception as e:
        errors.append(f"抽查异常 {book} {ch}:{v}: {e}")

print(f"总计: {total_ch} 章, {total_v} 节")
if errors:
    print("校验失败:")
    [print(" -", e) for e in errors]
    sys.exit(1)
print("校验通过 ✔")

def esc(s):
    return s.replace("'", "''")

files, cur, cur_size, fno = [], [], 0, 0
def flush():
    global cur, cur_size, fno
    if not cur:
        return
    fno += 1
    path = f"{DEV}/supabase/bible_cuv_data_{fno:02d}.sql"
    with open(path, "w", encoding="utf-8") as f:
        f.write("-- 和合本全文数据（文件序号见文件名 bible_cuv_data_NN.sql）。先运行 bible_cuv_schema.sql 建表，再按序号依次运行各数据文件。可重复运行（冲突自动跳过）。\n")
        f.write("\n".join(cur))
    files.append((path, os.path.getsize(path)))
    cur, cur_size = [], 0

for idx, name, chapters in books_out:
    for ci, verses in enumerate(chapters, start=1):
        rows = ",\n".join(
            f"('CUV', '{esc(name)}', {idx}, {ci}, {vi}, '{esc(t)}')"
            for vi, t in enumerate(verses, start=1))
        stmt = ("insert into public.bible_verses (version, book, book_index, chapter, verse, text) values\n"
                + rows + "\non conflict (version, book, chapter, verse) do nothing;\n")
        cur.append(stmt)
        cur_size += len(stmt.encode("utf-8"))
        if cur_size > 900_000:
            flush()
flush()
for p, s in files:
    print(p, f"{s/1024:.0f} KB")
print(f"共 {len(files)} 个数据文件")
