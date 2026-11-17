-- ============================================================
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


-- 创世纪
-- 创世纪 24:30 与 24:29 合节（合并经文在第 29 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '创世纪' and chapter = 24 and verse = 30 and text = 'a';

-- 出埃及记
-- 出埃及记 38:15 与 38:14 合节（合并经文在第 14 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '出埃及记' and chapter = 38 and verse = 15 and text = 'a';

-- 利未记
-- 利未记 3:15 与 3:14 合节（合并经文在第 14 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '利未记' and chapter = 3 and verse = 15 and text = 'a';

-- 民数记
-- 民数记 1:21 与 1:20 合节（合并经文在第 20 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 21 and text = 'a';
-- 民数记 1:23 与 1:22 合节（合并经文在第 22 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 23 and text = 'a';
-- 民数记 1:25 与 1:24 合节（合并经文在第 24 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 25 and text = 'a';
-- 民数记 1:27 与 1:26 合节（合并经文在第 26 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 27 and text = 'a';
-- 民数记 1:29 与 1:28 合节（合并经文在第 28 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 29 and text = 'a';
-- 民数记 1:31 与 1:30 合节（合并经文在第 30 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 31 and text = 'a';
-- 民数记 1:33 与 1:32 合节（合并经文在第 32 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 33 and text = 'a';
-- 民数记 1:35 与 1:34 合节（合并经文在第 34 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 35 and text = 'a';
-- 民数记 1:37 与 1:36 合节（合并经文在第 36 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 37 and text = 'a';
-- 民数记 1:39 与 1:38 合节（合并经文在第 38 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 39 and text = 'a';
-- 民数记 1:41 与 1:40 合节（合并经文在第 40 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 41 and text = 'a';
-- 民数记 1:43 与 1:42 合节（合并经文在第 42 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 43 and text = 'a';
-- 民数记 1:46 与 1:45 合节（合并经文在第 45 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 1 and verse = 46 and text = 'a';
-- 民数记 4:40 与 4:39 合节（合并经文在第 39 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 4 and verse = 40 and text = 'a';
-- 民数记 4:44 与 4:43 合节（合并经文在第 43 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 4 and verse = 44 and text = 'a';
-- 民数记 4:48 与 4:47 合节（合并经文在第 47 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '民数记' and chapter = 4 and verse = 48 and text = 'a';

-- 申命记
-- 申命记 13:13 与 13:12 合节（合并经文在第 12 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '申命记' and chapter = 13 and verse = 13 and text = 'a';
-- 申命记 13:18 与 13:17 合节（合并经文在第 17 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '申命记' and chapter = 13 and verse = 18 and text = 'a';
-- 申命记 15:5 与 15:4 合节（合并经文在第 4 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '申命记' and chapter = 15 and verse = 5 and text = 'a';
-- 申命记 28:14 与 28:13 合节（合并经文在第 13 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '申命记' and chapter = 28 and verse = 14 and text = 'a';
-- 申命记 28:59 与 28:58 合节（合并经文在第 58 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '申命记' and chapter = 28 and verse = 59 and text = 'a';
-- 申命记 29:11 与 29:10 合节（合并经文在第 10 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '申命记' and chapter = 29 and verse = 11 and text = 'a';
-- 申命记 30:10 与 30:9 合节（合并经文在第 9 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '申命记' and chapter = 30 and verse = 10 and text = 'a';

-- 约书亚记
-- 约书亚记 3:11 与 3:10 合节（合并经文在第 10 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '约书亚记' and chapter = 3 and verse = 11 and text = 'a';
-- 约书亚记 21:10 与 21:9 合节（合并经文在第 9 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '约书亚记' and chapter = 21 and verse = 10 and text = 'a';

-- 士师记
-- 士师记 20:28 与 20:27 合节（合并经文在第 27 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '士师记' and chapter = 20 and verse = 28 and text = 'a';

-- 撒母耳记上
-- 撒母耳记上 25:31 与 25:30 合节（合并经文在第 30 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '撒母耳记上' and chapter = 25 and verse = 31 and text = 'a';

-- 撒母耳记下
-- 撒母耳记下 3:10 与 3:9 合节（合并经文在第 9 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '撒母耳记下' and chapter = 3 and verse = 10 and text = 'a';

-- 历代志上
-- 历代志上 4:18 与 4:17 合节（合并经文在第 17 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '历代志上' and chapter = 4 and verse = 18 and text = 'a';
-- 历代志上 16:13 与 16:12 合节（合并经文在第 12 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '历代志上' and chapter = 16 and verse = 13 and text = 'a';
-- 历代志上 16:40 与 16:39 合节（合并经文在第 39 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '历代志上' and chapter = 16 and verse = 40 and text = 'a';

-- 历代志下
-- 历代志下 30:19 与 30:18 合节（合并经文在第 18 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '历代志下' and chapter = 30 and verse = 19 and text = 'a';

-- 尼希米记
-- 尼希米记 12:29 与 12:28 合节（合并经文在第 28 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '尼希米记' and chapter = 12 and verse = 29 and text = 'a';

-- 以斯帖记
-- 以斯帖记 1:14 与 1:13 合节（合并经文在第 13 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '以斯帖记' and chapter = 1 and verse = 14 and text = 'a';
-- 以斯帖记 8:12 与 8:11 合节（合并经文在第 11 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '以斯帖记' and chapter = 8 and verse = 12 and text = 'a';

-- 约伯记
-- 约伯记 10:21 与 10:20 合节（合并经文在第 20 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '约伯记' and chapter = 10 and verse = 21 and text = 'a';
-- 约伯记 38:38 与 38:37 合节（合并经文在第 37 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '约伯记' and chapter = 38 and verse = 38 and text = 'a';
-- 约伯记 38:40 与 38:39 合节（合并经文在第 39 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '约伯记' and chapter = 38 and verse = 40 and text = 'a';

-- 诗篇
-- 诗篇 8:7 与 8:6 合节（合并经文在第 6 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '诗篇' and chapter = 8 and verse = 7 and text = 'a';
-- 诗篇 8:8 与 8:6 合节（合并经文在第 6 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '诗篇' and chapter = 8 and verse = 8 and text = 'a';
-- 诗篇 49:9 与 49:8 合节（合并经文在第 8 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '诗篇' and chapter = 49 and verse = 9 and text = 'a';
-- 诗篇 76:9 与 76:8 合节（合并经文在第 8 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '诗篇' and chapter = 76 and verse = 9 and text = 'a';
-- 诗篇 92:3 与 92:2 合节（合并经文在第 2 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '诗篇' and chapter = 92 and verse = 3 and text = 'a';
-- 诗篇 105:6 与 105:5 合节（合并经文在第 5 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '诗篇' and chapter = 105 and verse = 6 and text = 'a';
-- 诗篇 116:19 与 116:18 合节（合并经文在第 18 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '诗篇' and chapter = 116 and verse = 19 and text = 'a';
-- 诗篇 135:2 与 135:1 合节（合并经文在第 1 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '诗篇' and chapter = 135 and verse = 2 and text = 'a';

-- 箴言
-- 箴言 23:32 与 23:31 合节（合并经文在第 31 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '箴言' and chapter = 23 and verse = 32 and text = 'a';
-- 箴言 26:19 与 26:18 合节（合并经文在第 18 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '箴言' and chapter = 26 and verse = 19 and text = 'a';

-- 传道书
-- 传道书 7:28 与 7:27 合节（合并经文在第 27 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '传道书' and chapter = 7 and verse = 28 and text = 'a';

-- 以赛亚书
-- 以赛亚书 4:4 与 4:3 合节（合并经文在第 3 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '以赛亚书' and chapter = 4 and verse = 4 and text = 'a';
-- 以赛亚书 65:7 与 65:6 合节（合并经文在第 6 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '以赛亚书' and chapter = 65 and verse = 7 and text = 'a';

-- 耶利米书
-- 耶利米书 34:9 与 34:8 合节（合并经文在第 8 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '耶利米书' and chapter = 34 and verse = 9 and text = 'a';
-- 耶利米书 34:19 与 34:18 合节（合并经文在第 18 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '耶利米书' and chapter = 34 and verse = 19 and text = 'a';
-- 耶利米书 43:6 与 43:5 合节（合并经文在第 5 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '耶利米书' and chapter = 43 and verse = 6 and text = 'a';

-- 以西结书
-- 以西结书 16:57 与 16:56 合节（合并经文在第 56 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '以西结书' and chapter = 16 and verse = 57 and text = 'a';
-- 以西结书 18:11 与 18:10 合节（合并经文在第 10 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '以西结书' and chapter = 18 and verse = 11 and text = 'a';
-- 以西结书 39:27 与 39:26 合节（合并经文在第 26 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '以西结书' and chapter = 39 and verse = 27 and text = 'a';

-- 何西阿书
-- 何西阿书 12:5 与 12:4 合节（合并经文在第 4 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '何西阿书' and chapter = 12 and verse = 5 and text = 'a';

-- 西番雅书
-- 西番雅书 2:2 与 2:1 合节（合并经文在第 1 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '西番雅书' and chapter = 2 and verse = 2 and text = 'a';

-- 路加福音
-- 路加福音 1:2 与 1:1 合节（合并经文在第 1 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '路加福音' and chapter = 1 and verse = 2 and text = 'a';
-- 路加福音 2:35 与 2:34 合节（合并经文在第 34 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '路加福音' and chapter = 2 and verse = 35 and text = 'a';
-- 路加福音 21:30 与 21:29 合节（合并经文在第 29 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '路加福音' and chapter = 21 and verse = 30 and text = 'a';

-- 使徒行传
-- 使徒行传 1:25 与 1:24 合节（合并经文在第 24 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '使徒行传' and chapter = 1 and verse = 25 and text = 'a';
-- 使徒行传 4:30 与 4:29 合节（合并经文在第 29 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '使徒行传' and chapter = 4 and verse = 30 and text = 'a';

-- 以弗所书
-- 以弗所书 6:3 与 6:2 合节（合并经文在第 2 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '以弗所书' and chapter = 6 and verse = 3 and text = 'a';

-- 歌罗西书
-- 歌罗西书 2:21 与 2:20 合节（合并经文在第 20 节内）
delete from public.bible_verses
  where version = 'CUV' and book = '歌罗西书' and chapter = 2 and verse = 21 and text = 'a';

-- ============ 运行后自检（应分别返回 0 与 31032）============
-- select count(*) from public.bible_verses where version = 'CUV' and text = 'a';
-- select count(*) from public.bible_verses where version = 'CUV';

