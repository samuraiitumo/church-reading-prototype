-- ============================================================
-- 停用成员的数据库层 enforcement（配合管理员界面的「停用」）
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行，幂等）
-- 作用：被停用的成员即使绕过网页，也不能再打卡、发分享、
-- 发代祷、点阿们/代祷、写留言、写笔记、划线（只能看）。
-- 不运行此文件时，停用只在网页端生效（登录时拦截）。
-- ============================================================
create or replace function public.am_active() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select is_active from public.profiles where id = auth.uid()), false)
$$;

drop policy if exists checkins_insert on public.checkins;
create policy checkins_insert on public.checkins for insert to authenticated
  with check (user_id = auth.uid() and public.am_active());

drop policy if exists shares_insert on public.shares;
create policy shares_insert on public.shares for insert to authenticated
  with check (user_id = auth.uid() and public.am_active());

drop policy if exists prayers_insert on public.prayers;
create policy prayers_insert on public.prayers for insert to authenticated
  with check (user_id = auth.uid() and public.am_active());

drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and public.am_active());

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (user_id = auth.uid() and public.am_active());

drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes for all to authenticated
  using (user_id = auth.uid() and public.am_active())
  with check (user_id = auth.uid() and public.am_active());

drop policy if exists highlights_all on public.highlights;
create policy highlights_all on public.highlights for all to authenticated
  using (user_id = auth.uid() and public.am_active())
  with check (user_id = auth.uid() and public.am_active());
