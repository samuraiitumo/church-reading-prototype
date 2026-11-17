-- ============================================================
-- 定时触发推送：每天日本时间早上 7:00 发送读经提醒
-- （pg_cron 用 UTC 时间：7:00 JST = 前一天 22:00 UTC）
--
-- 运行前先确认：
--   1. 已运行 supabase/push.sql（订阅表）
--   2. 已部署 Edge Function「send-reminders」并设好它的 Secrets
-- 然后把下面两处 <CRON_SECRET> 换成与函数 Secrets 里相同的
-- CRON_SECRET 值，再在 SQL Editor 运行本文件（可重复运行）。
--
-- 若 create extension 报错：先到 Dashboard → Database →
-- Extensions，把 pg_cron 与 pg_net 打开，再回来运行。
-- ============================================================
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 先删掉同名旧任务（重复运行时用），没有会报错的话可忽略这一行
select cron.unschedule('daily-reading-push')
where exists (select 1 from cron.job where jobname = 'daily-reading-push');

select cron.schedule('daily-reading-push', '0 22 * * *', $$
  select net.http_post(
    url := 'https://bjvszldtzzrtyizpagkj.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
$$);

-- ============================================================
-- 立即测试一次（可选）：把下面这段单独运行一次，
-- 已开启推送的手机应当马上收到一条读经提醒。
-- ============================================================
-- select net.http_post(
--   url := 'https://bjvszldtzzrtyizpagkj.supabase.co/functions/v1/send-reminders',
--   headers := jsonb_build_object(
--     'Content-Type', 'application/json',
--     'x-cron-secret', '<CRON_SECRET>'
--   ),
--   body := '{}'::jsonb
-- );
