// ============================================================
// 教会读经祷告分享网站 · 配置文件
// ------------------------------------------------------------
// 在哪里填：
//   1. 打开 Supabase 项目后台（supabase.com 登录后进入你的项目）
//   2. 点顶部 Connect，或左侧菜单 Settings → API Keys
//   3. 把 Project URL 填到 SUPABASE_URL
//      把 Publishable key（或旧版 anon public key）填到 SUPABASE_ANON_KEY
//   4. 保存后重新打开网页，就会进入正式模式（需要登录）
//
// 注意：
//   - 这里只能填 Publishable / anon key，它是给网页前端用的公开钥匙，
//     数据安全靠数据库的行级权限（RLS）保护，请勿填入 Secret / service_role 密钥。
//   - 两个值都留空时，网页是「演示模式」：显示示例内容，
//     打卡、分享等操作只在本地演示，不会保存到服务器。
// ============================================================
window.APP_CONFIG = {
  SUPABASE_URL: "https://bjvszldtzzrtyizpagkj.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_xm_1YZMtu552gilr63cJdA_eAqIX8yH",
  // 推送通知的公钥（VAPID public key，公开值，放前端没问题；
  // 对应的私钥只存在 Supabase Edge Function 的密钥里，绝不写进仓库）
  VAPID_PUBLIC_KEY: "BITC7eZocV1bOPWrM6TfNKNXG9PGwzmyjGzMlXXhGkDoW1_0S_TAS_IJgGtBWQODmdgPi6qX6-LVJwWmMxsWwDo"
};
