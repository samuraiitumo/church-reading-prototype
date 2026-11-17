#!/usr/bin/env python3
# Generate supabase/bible_cuv_patch_01.sql from the classification report.
# Final finding (2026-11-17, three-witness check): all 69 "a" rows are
# merged verses （合节） of the CUV print tradition — the full text already
# sits in the holder (previous) verse's row. Patch = delete the 69
# placeholder rows (guarded by text='a'). Job 3:2 needs no action.
import json

BASE = '/home/hatch/workspace/church-app-dev'
rep = json.load(open(f'{BASE}/data/patch_classification.json'))
rows = [r for r in rep if r['verdict'] in ('MERGED', 'REVIEW')]
assert len(rows) == 69, len(rows)
rows.sort(key=lambda r: (r['bi'], r['ch'], r['v']))

out = []
out.append("""-- ============================================================
-- 和合本全文导入 · 补丁 01：合节处理（删除 69 行占位符 "a"）
-- 运行顺序：bible_cuv_schema.sql → bible_cuv_data_01~06.sql → 本文件
-- 可重复运行：每条 DELETE 都带 text='a' 条件，已处理过的行不会再动。
--
-- 查证结论（2026-11-17，三方互证）：
-- 数据文件里有 69 节正文只剩一个字母 "a"。逐节核对后确认：这 69 节
-- 在和合本的排印传统里全部是「合节」——即与上一节合并排印、没有
-- 独立经文，合并后的完整经文就在上一节里，我们导入的数据也是
-- 如此（上一节含合并全文，该节只剩占位符 "a"）。
-- 证据：① 维基文库《聖經（和合本）》印本转录（独立来源）——69 节
-- 的合并全文与导入数据上一节逐字相符（个别为异体字差异）；
-- ② Ponomar 印本和合本电子档——对应节均标注「見上節」；
-- ③ 新标点和合本（YouVersion CUNPSS）抽查创 24、民 1、诗 8、
-- 箴 26、路 21、弗 6，均以「29-30」式节段合并呈现，内容一致。
-- 处理方式与新标点和合本一致：不保留独立行，阅读页会把节号显示
-- 为节段（如 29-30）。经文一字未改、未增删。
--
-- 另：约伯记 3:2 正文「说：」经核对是完整的（新标点和合本同），
-- 早期清单曾误报为截断，特此更正，本补丁不处理该节。
-- ============================================================
""")
cur_book = None
for r in rows:
    if r['book'] != cur_book:
        cur_book = r['book']
        out.append(f"\n-- {cur_book}")
    out.append(
        f"-- {r['book']} {r['ch']}:{r['v']} 与 {r['ch']}:{r['holder']} 合节"
        f"（合并经文在第 {r['holder']} 节内）\n"
        f"delete from public.bible_verses\n"
        f"  where version = 'CUV' and book = '{r['book']}'"
        f" and chapter = {r['ch']} and verse = {r['v']} and text = 'a';")
out.append("""
-- ============ 运行后自检（应分别返回 0 与 31032）============
-- select count(*) from public.bible_verses where version = 'CUV' and text = 'a';
-- select count(*) from public.bible_verses where version = 'CUV';
""")
sql = '\n'.join(out) + '\n'
open(f'{BASE}/supabase/bible_cuv_patch_01.sql', 'w', encoding='utf-8').write(sql)
print('wrote', len(sql), 'bytes,', len(rows), 'deletes')
