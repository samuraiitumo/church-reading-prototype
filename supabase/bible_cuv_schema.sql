-- ============================================================
-- 圣经全文（和合本）· 第 1 步：建表
-- 使用方法：在 Supabase 项目后台 SQL Editor 里粘贴运行一次，
-- 然后再依次运行 bible_cuv_data_*.sql 导入经文数据。
-- 说明：和合本（1919 年出版）已进入公有领域，可自由使用。
-- 本表只存公有领域译本；新译本全文待版权方授权后再另行导入。
-- ============================================================

create table if not exists public.bible_verses (
  id bigint generated always as identity primary key,
  version text not null default 'CUV',
  book text not null,
  book_index int not null,
  chapter int not null,
  verse int not null,
  text text not null,
  unique (version, book, chapter, verse)
);

create index if not exists bible_verses_lookup
  on public.bible_verses (version, book, chapter, verse);

alter table public.bible_verses enable row level security;

-- 经文为公开文本：登录成员可读；写入只通过 SQL Editor（管理员）进行，
-- 不给前端任何写权限。
drop policy if exists bible_verses_read on public.bible_verses;
create policy bible_verses_read on public.bible_verses
  for select to authenticated using (true);
