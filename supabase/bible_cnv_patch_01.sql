-- 新译本（CNV）神名还原补漏 patch 01
-- 全量复核（YouVersion 同源文本 + 信望爱双参照）发现 3 处漏还原：
-- 原始数据中「主」被前后的「地」「管」等字遮挡，未被还原程序识别。
-- 代上 16:39 高地主的帐幕→高地耶和华的帐幕；代上 26:30 地主的→地耶和华的；
-- 哀 3:66 主管治→耶和华管治。运行前提：已运行 bible_cnv_data_*.sql（第二版）。

-- 历代志上 16:39
update public.bible_verses set text = '又留下撒督祭司和他的亲族，都是作祭司的。在基遍的高地耶和华的帐幕前，'
where version = 'CNV' and book = '历代志上' and chapter = 16 and verse = 39;

-- 历代志上 26:30
update public.bible_verses set text = '希伯伦家族有哈沙比雅和他的亲族，共一千七百人，都是勇士，主管约旦河西以色列地耶和华的一切职事和王的任务。'
where version = 'CNV' and book = '历代志上' and chapter = 26 and verse = 30;

-- 耶利米哀歌 3:66
update public.bible_verses set text = '求你在烈怒中追赶他们，从耶和华管治的天下除灭他们。'
where version = 'CNV' and book = '耶利米哀歌' and chapter = 3 and verse = 66;
