#!/usr/bin/env python3
# Classify the 69 "a" verses (+ Job 3:2 control) using three witnesses:
#   bolls (imported data), Wikisource (independent print transcription),
#   Ponomar (print-based CUV, marks merged verses as 見上節).
# A target is MERGED when the full combined text sits in the holder verse
# in both bolls and Wikisource (char-identical ignoring punctuation),
# and Ponomar (where available) marks the target 見上節.
import json, re, sys
from opencc import OpenCC

cc = OpenCC('t2s')
BASE = '/home/hatch/workspace/church-app-dev/data'

def clean_bolls(t):
    t = re.sub(r'<[^>]+>', '', t)
    t = re.sub(r'\s+', '', t)          # removes spaces + U+3000
    return cc.convert(t)

VAR = {'著': '着', '槪': '概', '汚': '污'}
def chars(s):
    s = re.sub(r'\{\{[^}]*\}\}', '', s)          # leftover ws templates
    s = re.sub(r'<[^>]+>', '', s)                 # leftover ws <sup> markup
    s = s.replace('[[#6a|〡]]', '')
    s = cc.convert(s)
    s = ''.join(VAR.get(c, c) for c in s)
    return ''.join(re.findall(r'[0-9A-Za-z\u4e00-\u9fff]', s))

# ---- bolls ----
bolls = {}
raw = json.load(open(f'{BASE}/cuv_bolls.json'))
for bk in raw:
    bi = bk['bookid']
    for ci, ch in enumerate(bk['chapters'], 1):
        for vi, t in enumerate(ch, 1):
            bolls[(bi, ci, vi)] = clean_bolls(t)

# ---- wikisource combined blocks ----
ws = {}
for e in json.load(open(f'{BASE}/patch_raw.json')):
    ws[(e['book_index'], e['chapter'], e['verse'])] = e['wikisource_raw']
# Psalm 8:7 shares 8:8's combined block
if (19, 8, 7) not in ws and (19, 8, 8) in ws:
    ws[(19, 8, 7)] = ws[(19, 8, 8)]

# ---- ponomar ----
PON = {1:'Gen',3:'Lev',4:'Num',5:'Deut',6:'Josh',7:'Judg',16:'Nehem',
       17:'Esther',18:'Job',19:'Psalm',20:'Prov',21:'Eccles',23:'Isa',
       24:'Jerem',26:'Ezek',27:'Dan',28:'Hos',35:'Zeph',38:'Mal',
       42:'Lk',44:'Acts',49:'Eph',51:'Col'}
# Ponomar Psalms use LXX numbering: MT 11..147 -> LXX = MT-1 (except splits)
LXX = {49: 48, 76: 75, 92: 91, 105: 104, 135: 134}
pon = {}
for bi, fn in PON.items():
    try:
        txt = open(f'{BASE}/ponomar/pon_{fn}.txt', encoding='utf-8').read()
    except FileNotFoundError:
        continue
    ch = 0
    for line in txt.splitlines():
        m = re.match(r'#(\d+)', line)
        if m: ch = int(m.group(1)); continue
        m = re.match(r'(\d+)\|\s*(.*)', line)
        if m and ch: pon[(bi, ch, int(m.group(1)))] = m.group(2).strip()

# ---- targets ----
targets = []
for line in open(f'{BASE}/broken_verses.md', encoding='utf-8'):
    m = re.match(r'\| ([^|]+) \| (\d+) \| (\d+) \|', line)
    if m: targets.append((m.group(1).strip(), int(m.group(2)), int(m.group(3))))
NAME2IDX = {bk['name']: bk['bookid'] for bk in raw}
# frontend names differ from bolls for Genesis （创世纪 vs 创世记） — map by order
ORDER = [bk['bookid'] for bk in raw]
FRONTEND = ['创世纪','出埃及记','利未记','民数记','申命记','约书亚记','士师记','路得记',
 '撒母耳记上','撒母耳记下','列王纪上','列王纪下','历代志上','历代志下','以斯拉记','尼希米记',
 '以斯帖记','约伯记','诗篇','箴言','传道书','所罗门歌','以赛亚书','耶利米书','耶利米哀歌',
 '以西结书','但以理书','何西阿书','约珥书','阿摩司书','俄巴底亚书','约拿书','弥迦书',
 '那鸿书','哈巴谷书','西番雅书','哈该书','撒迦利亚书','玛拉基书','马太福音','马可福音',
 '路加福音','约翰福音','使徒行传','罗马书','哥林多前书','哥林多后书','加拉太书','以弗所书',
 '腓立比书','歌罗西书','帖撒罗尼迦前书','帖撒罗尼迦后书','提摩太前书','提摩太后书',
 '提多书','腓利门书','希伯来书','雅各书','彼得前书','彼得后书','约翰一书','约翰二书',
 '约翰三书','犹大书','启示录']
F2IDX = {n: i+1 for i, n in enumerate(FRONTEND)}
F2IDX.update(NAME2IDX)   # broken_verses.md uses bolls names （创世记）

report = []
for name, ch, v in targets:
    bi = F2IDX[name]
    name = FRONTEND[bi-1]   # normalize to frontend/DB name
    cur = bolls.get((bi, ch, v), '<missing>')
    if cur != 'a':   # Job 3:2 control case
        report.append(dict(book=name, bi=bi, ch=ch, v=v, verdict='NOT-A',
            bolls=cur, pon=pon.get((bi, ch, v)), note='control'))
        continue
    holder = v - 1
    while bolls.get((bi, ch, holder)) == 'a': holder -= 1
    b_holder = bolls.get((bi, ch, holder), '')
    w_block = ws.get((bi, ch, v), '')
    testA = chars(b_holder) == chars(w_block) and len(chars(w_block)) > 0
    p_ch = LXX.get(ch, ch) if bi == 19 else ch
    p_t = pon.get((bi, p_ch, v))
    p_h = pon.get((bi, p_ch, holder))
    if p_t is None:
        testB = None
    else:
        testB = (p_t.replace(' ', '') == '見上節') and chars(p_h or '') == chars(w_block)
    verdict = 'MERGED' if (testA and testB is not False) else 'REVIEW'
    report.append(dict(book=name, bi=bi, ch=ch, v=v, holder=holder,
        verdict=verdict, testA=testA, testB=testB,
        b_holder_len=len(chars(b_holder)), ws_len=len(chars(w_block)),
        pon_target=p_t, pon_holder_len=len(chars(p_h)) if p_h else None))

json.dump(report, open(f'{BASE}/patch_classification.json', 'w'),
          ensure_ascii=False, indent=1)
m = [r for r in report if r['verdict'] == 'MERGED']
r = [r for r in report if r['verdict'] == 'REVIEW']
n = [r for r in report if r['verdict'] == 'NOT-A']
print(f"MERGED {len(m)}  REVIEW {len(r)}  NOT-A {len(n)}")
for x in n: print('NOT-A:', x['book'], x['ch'], x['v'], 'bolls=', x['bolls'], 'pon=', x['pon'])
for x in r:
    print('REVIEW:', x['book'], x['ch'], x['v'], 'holder', x.get('holder'),
          'testA', x.get('testA'), 'testB', x.get('testB'),
          'b_len', x.get('b_holder_len'), 'ws_len', x.get('ws_len'),
          'pon_t', x.get('pon_target'), 'pon_h_len', x.get('pon_holder_len'))
nb = sum(1 for x in m if x['testB'] is True)
print(f"MERGED with Ponomar triple-confirmation: {nb}; bolls+wikisource only: {len(m)-nb}")
