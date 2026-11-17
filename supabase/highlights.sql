-- ============================================================
-- 我的划线（highlights）：读经时划下的经节，按账号保存、跨设备同步
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行，幂等）
-- 未运行此文件时，网站上的划线会先存在这台设备的浏览器里，
-- 运行后自动改为存数据库（换手机也能看到）。
-- ============================================================
create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book text not null,
  chapter int not null,
  verse int not null,
  color text not null default 'gold',
  created_at timestamptz not null default now(),
  unique (user_id, book, chapter, verse)
);

alter table public.highlights enable row level security;

-- 划线完全私密：只能看、改、删自己的
drop policy if exists highlights_all on public.highlights;
create policy highlights_all on public.highlights for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
