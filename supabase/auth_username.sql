-- ============================================================
-- 迁移：用户名 + 密码登录（在 Supabase SQL Editor 运行一次即可）
-- 1) profiles 增加 username 列（登录名，大小写不敏感唯一）
-- 2) 更新注册触发器：新注册时把用户名写进档案
-- 说明：用户名账号在 Auth 里以 username@church.local 的内部邮箱
-- 形式存在，前端负责映射，全程不发送任何邮件。
-- ============================================================

alter table public.profiles add column if not exists username text;

create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username)) where username is not null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
          nullif(new.raw_user_meta_data->>'username', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
