-- ============================================================
-- 教会读经祷告分享网站 · Supabase 数据库结构 v1
-- 使用方法：在 Supabase 项目后台 SQL Editor 里整段粘贴运行一次
-- 内容：数据表 + 行级权限(RLS) + 注册自动建档 + 示例小组/经文
-- ============================================================

-- ---------- 小组 ----------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- 成员档案（与登录账号一一对应） ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text,
  role text not null default 'member' check (role in ('member','leader','admin')),
  group_id uuid references public.groups(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
-- 用户名（登录用）不重复，大小写不敏感
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username)) where username is not null;

-- ---------- 读经计划与每日经文 ----------
create table if not exists public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  starts_on date,
  created_at timestamptz not null default now()
);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid references public.reading_plans(id) on delete cascade,
  read_date date not null,
  reference text not null,
  content text not null default '',
  key_verse text default '',
  created_at timestamptz not null default now(),
  unique (plan_id, read_date)
);

-- ---------- 每日打卡 ----------
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reading_id uuid references public.readings(id) on delete set null,
  checkin_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (user_id, checkin_date)
);

-- ---------- 灵修分享 ----------
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  reading_ref text default '',
  content text not null,
  visibility text not null default 'group' check (visibility in ('private','group','church')),
  created_at timestamptz not null default now()
);

-- ---------- 祷告事项 ----------
create table if not exists public.prayers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  content text not null,
  is_anonymous boolean not null default false,
  visibility text not null default 'group' check (visibility in ('private','group','church')),
  status text not null default 'open' check (status in ('open','answered')),
  created_at timestamptz not null default now()
);

-- ---------- 互动：阿们 / 为你祷告 / 我来代祷 ----------
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('share','prayer')),
  target_id uuid not null,
  kind text not null check (kind in ('amen','prayed')),
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id, kind)
);

-- ---------- 分享下的留言 ----------
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  share_id uuid not null references public.shares(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- 个人私密笔记 ----------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text default '',
  content text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- 辅助函数（security definer，避免 RLS 递归） ----------
create or replace function public.my_group_id() returns uuid
language sql security definer stable set search_path = public as $$
  select group_id from public.profiles where id = auth.uid()
$$;

create or replace function public.my_role() returns text
language sql security definer stable set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false)
$$;

-- ---------- 注册时自动创建档案 ----------
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 行级权限 RLS
-- ============================================================
alter table public.groups        enable row level security;
alter table public.profiles      enable row level security;
alter table public.reading_plans enable row level security;
alter table public.readings      enable row level security;
alter table public.checkins      enable row level security;
alter table public.shares        enable row level security;
alter table public.prayers       enable row level security;
alter table public.reactions     enable row level security;
alter table public.comments      enable row level security;
alter table public.notes         enable row level security;

-- 小组：登录成员可看，管理员可改
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select to authenticated using (true);
drop policy if exists groups_write on public.groups;
create policy groups_write on public.groups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 档案：登录成员可看（显示姓名/小组），只能改自己的，管理员可改任何人
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- 读经计划/经文：登录成员可看，管理员可写
drop policy if exists plans_select on public.reading_plans;
create policy plans_select on public.reading_plans for select to authenticated using (true);
drop policy if exists plans_write on public.reading_plans;
create policy plans_write on public.reading_plans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists readings_select on public.readings;
create policy readings_select on public.readings for select to authenticated using (true);
drop policy if exists readings_write on public.readings;
create policy readings_write on public.readings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 打卡：登录成员可看全部（用于小组进度），只能写自己的
drop policy if exists checkins_select on public.checkins;
create policy checkins_select on public.checkins for select to authenticated using (true);
drop policy if exists checkins_insert on public.checkins;
create policy checkins_insert on public.checkins for insert to authenticated with check (user_id = auth.uid());
drop policy if exists checkins_delete on public.checkins;
create policy checkins_delete on public.checkins for delete to authenticated using (user_id = auth.uid());

-- 分享：church 全员可见 / group 同组可见 / private 仅自己；作者与管理员可删改
drop policy if exists shares_select on public.shares;
create policy shares_select on public.shares for select to authenticated using (
  visibility = 'church'
  or user_id = auth.uid()
  or (visibility = 'group' and group_id = public.my_group_id())
);
drop policy if exists shares_insert on public.shares;
create policy shares_insert on public.shares for insert to authenticated with check (user_id = auth.uid());
drop policy if exists shares_update on public.shares;
create policy shares_update on public.shares for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists shares_delete on public.shares;
create policy shares_delete on public.shares for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 祷告：可见规则同分享；作者可改状态（已蒙应允）
drop policy if exists prayers_select on public.prayers;
create policy prayers_select on public.prayers for select to authenticated using (
  visibility = 'church'
  or user_id = auth.uid()
  or (visibility = 'group' and group_id = public.my_group_id())
);
drop policy if exists prayers_insert on public.prayers;
create policy prayers_insert on public.prayers for insert to authenticated with check (user_id = auth.uid());
drop policy if exists prayers_update on public.prayers;
create policy prayers_update on public.prayers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists prayers_delete on public.prayers;
create policy prayers_delete on public.prayers for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 互动：登录成员可看，只能增删自己的
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions for select to authenticated using (true);
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions for insert to authenticated with check (user_id = auth.uid());
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

-- 留言：能看到对应分享的人才能看留言；只能写自己的，可删自己的
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments for select to authenticated using (
  exists (select 1 from public.shares s where s.id = share_id and (
    s.visibility = 'church' or s.user_id = auth.uid()
    or (s.visibility = 'group' and s.group_id = public.my_group_id())
  ))
);
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- 笔记：完全私密，仅自己
drop policy if exists notes_all on public.notes;
create policy notes_all on public.notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- 示例数据（可按教会实际情况改名/删除）
-- ============================================================
insert into public.groups (name) values ('以琳小组'), ('迦南小组'), ('锡安小组')
on conflict (name) do nothing;

insert into public.reading_plans (title, description, starts_on)
values ('试点读经计划', '小组试点期间使用，正式计划由管理员在后台维护', current_date)
on conflict do nothing;

insert into public.readings (plan_id, read_date, reference, content, key_verse)
select p.id, current_date, '约翰福音 15:1-17',
       '（示例经文内容，管理员可在 Supabase 后台 Table Editor 的 readings 表中替换为完整经文）',
       '我是葡萄树，你们是枝子。常在我里面的，我也常在他里面，这人就多结果子。（约 15:5）'
from public.reading_plans p
order by p.created_at
limit 1
on conflict (plan_id, read_date) do nothing;

-- 建好后，把你自己设为管理员（把邮箱换成你注册用的邮箱再单独运行这一句）：
-- update public.profiles set role = 'admin'
-- where id = (select id from auth.users where email = '你的邮箱');
