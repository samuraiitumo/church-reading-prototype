-- ============================================================
-- 推送订阅（push_subscriptions）：成员在「设置与提醒」里开启
-- 推送后，浏览器把订阅端点存到这里；Edge Function 每天读取
-- 全部订阅并发送读经提醒。
-- 在 Supabase SQL Editor 里运行一次即可（可重复运行，幂等）
-- ============================================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

-- 订阅只属于自己：只能看、改、删自己的
drop policy if exists push_subs_all on public.push_subscriptions;
create policy push_subs_all on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
