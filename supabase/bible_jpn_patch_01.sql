-- 新改訳2017 合节标记行清理 patch 01
-- 哥林多后书 1:14 在原数据中仅有标记「[前節に統合]」（正文已并入第13节），
-- 该行若保留，阅读器会把标记文字当作经文显示，故删除（与导入时跳过的其他合节标记一致）。

delete from public.bible_verses
where version = 'JPN' and book_index = 47 and chapter = 1 and verse = 14
  and text = '[前節に統合]';
