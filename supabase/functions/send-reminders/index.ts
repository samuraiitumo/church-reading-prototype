// ============================================================
// 每日读经提醒推送（Supabase Edge Function）
// 部署方法（Dashboard）：
//   Edge Functions → Create a new function，名字填 send-reminders，
//   把本文件内容整段粘贴进去，点 Deploy。
// 需要先设好的 Secrets（Edge Functions → Secrets）：
//   VAPID_PUBLIC_KEY   与前端 config.js 里的一致
//   VAPID_PRIVATE_KEY  与公钥配对的私钥（不要写进代码仓库）
//   VAPID_SUBJECT      例如 mailto:you@example.com
//   CRON_SECRET        与 push_cron.sql 里填的同一个随机串
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 由平台自动注入。
// 触发方式：pg_cron 每天定时 POST 本函数（见 supabase/push_cron.sql），
// 请求头 x-cron-secret 必须与 CRON_SECRET 一致，否则 401。
// ============================================================
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  const secret = Deno.env.get("CRON_SECRET") || "";
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const pub = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const priv = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com";
  if (!pub || !priv) {
    return Response.json({ ok: false, error: "VAPID keys not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(subject, pub, priv);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  );
  const { data: subs, error } = await admin.from("push_subscriptions").select("*");
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const payload = JSON.stringify({
    title: "读经提醒",
    body: "早上好，今天的经文已经备好，点开开始读经、打卡吧。",
    url: "https://samuraiitumo.github.io/church-reading-prototype/",
  });

  let sent = 0;
  let removed = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 404 || code === 410) {
        // 订阅已失效（卸载/重置），清掉
        await admin.from("push_subscriptions").delete().eq("id", s.id);
        removed++;
      }
    }
  }
  return Response.json({ ok: true, sent, removed, total: subs?.length ?? 0 });
});
