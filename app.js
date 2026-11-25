(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- toast ---------------- */
  var toastEl = $("#toast"), toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove("show"); }, 2300);
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---------------- dates ---------------- */
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dateStr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function todayStr() { return dateStr(new Date()); }
  var WEEK = ["日", "一", "二", "三", "四", "五", "六"];
  function timeAgo(iso) {
    if (!iso) return "";
    var t = new Date(iso).getTime(), now = Date.now(), diff = Math.floor((now - t) / 1000);
    if (isNaN(t) || diff < 60) return "刚刚";
    if (diff < 3600) return Math.floor(diff / 60) + "分钟前";
    if (diff < 86400) return Math.floor(diff / 3600) + "小时前";
    if (diff < 172800) return "昨天";
    if (diff < 604800) return Math.floor(diff / 86400) + "天前";
    var d = new Date(iso);
    return (d.getMonth() + 1) + "月" + d.getDate() + "日";
  }
  function greetingWord() {
    var h = new Date().getHours();
    if (h < 6) return "夜深了";
    if (h < 11) return "早安";
    if (h < 14) return "午安";
    if (h < 18) return "下午好";
    return "晚安";
  }
  function setDateLine() {
    var el = $("#todayDateLine");
    if (!el) return;
    var d = new Date();
    el.textContent = d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 · 星期" + WEEK[d.getDay()];
  }

  /* ---------------- config / mode ---------------- */
  var CFG = window.APP_CONFIG || {};
  var hasCfg = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  var sb = null;
  if (hasCfg && window.supabase) {
    try { sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY); }
    catch (e) { sb = null; }
  }
  var FORMAL = !!sb;
  if (!FORMAL) {
    var banner = $("#demoBanner");
    if (banner) {
      banner.hidden = false;
      if (hasCfg) banner.textContent = "暂时连不上服务器，先以演示内容展示，数据不会保存";
    }
  }

  /* ---------------- state ---------------- */
  var S = {
    user: null, profile: null, groups: [],
    todayReading: null, todayIsSample: false, planTitle: "",
    myCheckins: {},           // dateStr -> true
    shares: [], prayers: [],
    weekReadings: [], booted: false
  };
  var AV_COLORS = ["#7A8B5A", "#B98F2E", "#5F7A8C", "#A85B4A", "#6B5B8C", "#4C5B3C"];
  function colorFor(name) {
    var h = 0, s = String(name || "?");
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997;
    return AV_COLORS[h % AV_COLORS.length];
  }
  function myGroupName() {
    if (!S.profile || !S.profile.group_id) return "";
    for (var i = 0; i < S.groups.length; i++) if (S.groups[i].id === S.profile.group_id) return S.groups[i].name;
    return "";
  }

  /* ---------------- navigation ---------------- */
  var currentPage = "today";
  var fab = $("#fabBtn");
  function go(page) {
    currentPage = page;
    $$(".page").forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-page") === page); });
    $$("#tabbar button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-nav") === page); });
    $("#mainScroll").scrollTop = 0;
    fab.classList.toggle("show", page === "share" || page === "pray");
    fab.setAttribute("aria-label", page === "pray" ? "发起代祷" : "写分享");
  }
  $("#tabbar").addEventListener("click", function (e) {
    var b = e.target.closest("[data-nav]");
    if (b) go(b.getAttribute("data-nav"));
  });
  document.addEventListener("click", function (e) {
    var g = e.target.closest("[data-goto]");
    if (g) {
      go(g.getAttribute("data-goto"));
      if (g.hasAttribute("data-share-mine")) setShareFilter("mine");
    }
    var t = e.target.closest("[data-toast]");
    if (t) toast(t.getAttribute("data-toast"));
  });

  /* ---------------- sheets ---------------- */
  function openSheet(id) { $("#" + id).classList.add("open"); }
  function closeSheets() { $$(".sheet").forEach(function (s) { s.classList.remove("open"); }); }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-close-sheet]")) closeSheets();
    if (e.target.closest("[data-open-compose]")) openSheet("compose");
  });
  fab.addEventListener("click", function () {
    openSheet(currentPage === "pray" ? "prayerForm" : "compose");
  });

  /* ---------------- reader ---------------- */
  function formatContent(text) {
    if (!text || !String(text).trim()) {
      return '<p style="color:var(--rmut)">（管理员还没有录入这段经文的全文，可以先用纸质圣经或圣经 App 阅读今天的经文。）</p>';
    }
    return String(text).split(/\n+/).map(function (line) {
      line = line.replace(/^\s+|\s+$/g, "");
      if (!line) return "";
      var m = line.match(/^(\d{1,3})[\s、.．](.+)$/);
      if (m) return '<p><span class="vn">' + m[1] + "</span>" + escapeHtml(m[2]) + "</p>";
      return "<p>" + escapeHtml(line) + "</p>";
    }).join("");
  }
  /* 站内全文：按书卷/章从 bible_verses 表取，三个译本可切换：
     CNV 新译本（教会读经译本，默认）、CUV 和合本（公有领域）、
     JPN 新改訳2017。所选译本若尚未导入数据，自动回退到和合本，
     阅读页不会空白。选择记在本地（churchBibleVer）。 */
  var VER_NAMES = { CNV: "新译本", CUV: "和合本", JPN: "新改訳2017" };
  var bibleVer = "CNV";
  try { bibleVer = localStorage.getItem("churchBibleVer") || "CNV"; } catch (e) {}
  if (!VER_NAMES[bibleVer]) bibleVer = "CNV";
  /* 新改訳2017 的日文书名（与 OT_BOOKS+NT_BOOKS 同序，源自教会提供的圣经数据文件）。
     显示日文经文时，书名用日文；数据库与划线仍以中文书名作键，不受影响。 */
  var JP_BOOKS = ["創世記","出エジプト記","レビ記","民数記","申命記","ヨシュア記","士師記","ルツ記","サムエル記 第一","サムエル記 第二","列王記 第一","列王記 第二","歴代誌 第一","歴代誌 第二","エズラ記","ネヘミヤ記","エステル記","ヨブ記","詩篇","箴言","伝道者の書","雅歌","イザヤ書","エレミヤ書","哀歌","エゼキエル書","ダニエル書","ホセア書","ヨエル書","アモス書","オバデヤ書","ヨナ書","ミカ書","ナホム書","ハバクク書","ゼパニヤ書","ハガイ書","ゼカリヤ書","マラキ書","マタイの福音書","マルコの福音書","ルカの福音書","ヨハネの福音書","使徒の働き","ローマ人への手紙","コリント人への手紙 第一","コリント人への手紙 第二","ガラテヤ人への手紙","エペソ人への手紙","ピリピ人への手紙","コロサイ人への手紙","テサロニケ人への手紙 第一","テサロニケ人への手紙 第二","テモテへの手紙 第一","テモテへの手紙 第二","テトスへの手紙","ピレモン人への手紙","ヘブル人への手紙","ヤコブの手紙","ペテロの手紙 第一","ペテロの手紙 第二","ヨハネの手紙 第一","ヨハネの手紙 第二","ヨハネの手紙 第三","ユダの手紙","ヨハネの黙示録"];
  function dispBook(book, ver) {
    if (ver !== "JPN") return book;
    var idx = bookOrder()[book];
    return (idx != null && JP_BOOKS[idx]) ? JP_BOOKS[idx] : book;
  }
  function dispRef(book, ch, ver) {
    return ver === "JPN" ? dispBook(book, ver) + " " + ch + "章" : book + " 第" + ch + "章";
  }
  var scriptureCache = {};
  async function fetchChapter(book, ch) {
    var want = bibleVer;
    var key = want + "|" + book + "|" + ch;
    if (scriptureCache[key]) return scriptureCache[key];
    async function load(ver) {
      var res = await sb.from("bible_verses").select("verse, text")
        .eq("version", ver).eq("book", book).eq("chapter", ch)
        .order("verse", { ascending: true });
      if (res.error) throw res.error;
      return res.data || [];
    }
    var rows = await load(want);
    var used = want;
    if (!rows.length && want !== "CUV") { rows = await load("CUV"); used = "CUV"; }
    var out = { rows: rows, used: used };
    scriptureCache[key] = out;
    return out;
  }
  function chapNote(used) {
    var s;
    if (used === "CNV") s = "站内经文：新译本（教会读经译本）";
    else if (used === "JPN") s = "站内经文：新改訳2017";
    else s = "站内经文：和合本（公有领域）";
    if (used !== bibleVer) s += "（" + VER_NAMES[bibleVer] + "尚未导入，先显示和合本）";
    return '<p class="chap-note">' + s + "</p>";
  }
  function syncVerSwitch() {
    $$(".ver-seg button").forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-ver") === bibleVer);
    });
  }
  function chapterHtml(book, ch, verses, usedVer) {
    var uv = usedVer || bibleVer;
    var h = '<h3 class="chap-head">' + escapeHtml(dispRef(book, ch, uv)) + "</h3>";
    h += verses.map(function (v, i) {
      /* 合节：和合本有若干节与上一节合并排印（如创24:29-30），库中无独立行；
         节号缺口处按新标点和合本的标法显示为节段（如 29-30）。 */
      var label = String(v.verse);
      var next = verses[i + 1];
      if (next && next.verse > v.verse + 1) label = v.verse + "-" + (next.verse - 1);
      var key = book + "|" + ch + "|" + v.verse;
      return '<p data-vref="' + escapeHtml(dispBook(book, uv) + " " + ch + ":" + label) + '" data-hlkey="' + escapeHtml(key) + '"' + (HL.map[key] ? ' class="hl-on"' : "") + '><span class="vn">' + label + "</span>" + escapeHtml(v.text) + "</p>";
    }).join("");
    return h;
  }
  async function openReading(r) {
    if (FORMAL && r) {
      S.lastReading = r;
      readerDate = r.read_date || null;
      clearVerseSel();
      var footEl = $("#readerFoot");
      if (footEl) footEl.style.display = "";
      var rcb = $("#readerCheckinBtn");
      if (rcb) rcb.style.display = (!r.single && readerDate === todayStr()) ? "" : "none";
      var pv = $("#readerPrev"), nx = $("#readerNext");
      if (pv) { pv.title = r.single ? "上一章" : "前一天"; pv.setAttribute("aria-label", pv.title); }
      if (nx) { nx.title = r.single ? "下一章" : "后一天"; nx.setAttribute("aria-label", nx.title); }
      $("#readerRef").textContent = r.reference || "今日经文";
      $("#readerTitle").textContent = r.reference || "今日经文";
      $("#readerSub").textContent = r.single ? (r.fromPicker ? "圣经阅读 · 页尾按钮可前后翻章" : "从我的划线 / 笔记打开") : (r.read_date ? (r.read_date + " · 读完后在页尾打卡") : "读完后在页尾打卡");
      if (r.content) $("#verses").innerHTML = formatContent(r.content);
      openSheet("reader");
      if (r.single) {
        $("#verses").innerHTML = '<p style="color:var(--rmut)">正在加载经文全文…</p>';
        try {
          var sv = await fetchChapter(r.single[0], r.single[1]);
          if (sv.rows.length) {
            S.readerVerUsed = sv.used;
            $("#verses").innerHTML = chapterHtml(r.single[0], r.single[1], sv.rows, sv.used) + chapNote(sv.used);
            return;
          }
        } catch (e) { /* 落到下面的提示 */ }
        $("#verses").innerHTML = '<p style="color:var(--rmut)">这一章的经文暂时没能加载，请检查网络后再试。</p>';
        return;
      }
      if (r.ot && r.nt) {
        $("#verses").innerHTML = '<p style="color:var(--rmut)">正在加载经文全文…</p>';
        try {
          var otv = await fetchChapter(r.ot[0], r.ot[1]);
          var ntv = await fetchChapter(r.nt[0], r.nt[1]);
          if (otv.rows.length && ntv.rows.length) {
            S.readerVerUsed = otv.used;
            $("#verses").innerHTML =
              chapterHtml(r.ot[0], r.ot[1], otv.rows, otv.used) +
              chapterHtml(r.nt[0], r.nt[1], ntv.rows, ntv.used) +
              chapNote(otv.used);
            return;
          }
          if (r.content) $("#verses").innerHTML = formatContent(r.content);
        } catch (e) {
          if (r.content) $("#verses").innerHTML = formatContent(r.content);
        }
      }
      return;
    }
    openSheet("reader");
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-open-reader]");
    if (!b) return;
    if (FORMAL) {
      var idx = b.getAttribute("data-ridx");
      if (idx !== null && S.weekReadings[+idx]) openReading(S.weekReadings[+idx]);
      else openReading(S.todayReading);
    } else {
      openSheet("reader");
    }
  });
  var size = 19;
  function applySize() { document.documentElement.style.setProperty("--reader-size", size + "px"); }
  $("#fontUp").addEventListener("click", function () { if (size < 26) { size += 2; applySize(); persistView(); } });
  $("#fontDown").addEventListener("click", function () { if (size > 15) { size -= 2; applySize(); persistView(); } });
  $("#nightToggle").addEventListener("click", function () {
    var r = $("#reader");
    r.classList.toggle("night");
    this.textContent = r.classList.contains("night") ? "日间" : "夜间";
    settings.night = r.classList.contains("night");
    var ns = $("#nightSwitch"); if (ns) ns.checked = settings.night;
    saveSettings();
  });
  function persistView() { settings.size = size; saveSettings(); syncSizeSeg(); }

  /* ================================================================
     设置与提醒（本机保存）+ 我的祷告 / 我的小组 / 读经计划 / 阅读导航
  ================================================================ */
  var SET_KEY = "churchSettings";
  var settings = { remindOn: false, remindTime: "07:00", size: 19, night: false };
  try {
    var savedSet = JSON.parse(localStorage.getItem(SET_KEY) || "null");
    if (savedSet) for (var sk in settings) if (savedSet[sk] !== undefined) settings[sk] = savedSet[sk];
  } catch (e) {}
  function saveSettings() { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) {} }
  size = settings.size; applySize();
  function applyNight() {
    var r = $("#reader");
    r.classList.toggle("night", !!settings.night);
    $("#nightToggle").textContent = settings.night ? "日间" : "夜间";
    var ns = $("#nightSwitch"); if (ns) ns.checked = !!settings.night;
  }
  applyNight();
  function syncSizeSeg() {
    $$("#sizeSeg button").forEach(function (b) { b.classList.toggle("on", +b.getAttribute("data-size") === size); });
  }
  syncSizeSeg();

  /* ---- 站内提醒：到点未打卡时在「今日」页上方提示（每天最多一条） ---- */
  function checkedToday() { return FORMAL ? !!S.myCheckins[todayStr()] : !!demoChecked; }
  function checkReminder() {
    var b = $("#remindBanner"); if (!b) return;
    var show = false;
    if (settings.remindOn && !checkedToday()) {
      var now = new Date();
      var hm = ("0" + now.getHours()).slice(-2) + ":" + ("0" + now.getMinutes()).slice(-2);
      var dismissed = false;
      try { dismissed = localStorage.getItem("churchRemindShown") === todayStr(); } catch (e) {}
      if (hm >= (settings.remindTime || "07:00") && !dismissed) show = true;
    }
    b.hidden = !show;
  }
  $("#remindDismiss").addEventListener("click", function () {
    try { localStorage.setItem("churchRemindShown", todayStr()); } catch (e) {}
    $("#remindBanner").hidden = true;
  });
  setInterval(checkReminder, 60000);

  /* ---- 设置页 ---- */
  $("#openSettingsBtn").addEventListener("click", function () {
    $("#remindOn").checked = !!settings.remindOn;
    $("#remindTime").value = settings.remindTime || "07:00";
    syncSizeSeg(); applyNight();
    refreshPushUI();
    var sec = $("#setAccountSec");
    if (FORMAL && S.user) {
      sec.style.display = "";
      $("#accountLine").textContent = "当前账号：" + (S.user.email || "");
      $("#setName").value = (S.profile && S.profile.display_name) || "";
      var sel = $("#setGroup");
      sel.innerHTML = S.groups.map(function (g) {
        return '<option value="' + g.id + '">' + escapeHtml(g.name) + "</option>";
      }).join("") || '<option value="">（暂无小组）</option>';
      if (S.profile && S.profile.group_id) sel.value = S.profile.group_id;
    } else sec.style.display = "none";
    openSheet("settings");
  });
  $("#remindOn").addEventListener("change", function () { settings.remindOn = this.checked; saveSettings(); checkReminder(); });
  $("#remindTime").addEventListener("change", function () { settings.remindTime = this.value || "07:00"; saveSettings(); checkReminder(); });
  $$("#sizeSeg button").forEach(function (b) {
    b.addEventListener("click", function () {
      size = +b.getAttribute("data-size"); settings.size = size;
      applySize(); saveSettings(); syncSizeSeg();
    });
  });
  $("#nightSwitch").addEventListener("change", function () { settings.night = this.checked; saveSettings(); applyNight(); });
  $("#icsBtn").addEventListener("click", function () {
    var parts = (settings.remindTime || "07:00").split(":");
    var now = new Date();
    var start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), +parts[0], +parts[1], 0);
    if (start <= now) start.setDate(start.getDate() + 1);
    function p2(n) { return ("0" + n).slice(-2); }
    function fdt(d) { return d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + "T" + p2(d.getHours()) + p2(d.getMinutes()) + "00"; }
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//church-reading//reminder//CN", "BEGIN:VEVENT",
      "UID:reading-reminder-" + (settings.remindTime || "07:00").replace(":", "") + "@church.local",
      "DTSTAMP:" + fdt(new Date()), "DTSTART:" + fdt(start), "RRULE:FREQ=DAILY",
      "SUMMARY:读经提醒：完成今日读经打卡",
      "DESCRIPTION:打开教会读经网站，看今日经文并打卡。",
      "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", "DESCRIPTION:读经提醒", "END:VALARM",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "每日读经提醒.ics";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 600);
    toast("日历文件已生成，用手机日历打开并添加即可");
  });
  $("#saveProfileBtn2").addEventListener("click", async function () {
    if (!FORMAL || !S.user) return;
    var name = $("#setName").value.trim();
    var gid = $("#setGroup").value || null;
    if (!name) { toast("请填写你的姓名"); return; }
    if (!gid) { toast("请选择你所在的小组"); return; }
    try {
      var res = await sb.from("profiles").update({ display_name: name, group_id: gid }).eq("id", S.user.id);
      if (res.error) throw res.error;
      S.profile = await loadProfileRow();
      fillMe();
      toast("资料已保存");
    } catch (e) { toast("保存没有成功，请检查网络后再试"); }
  });
  $("#changePwBtn").addEventListener("click", async function () {
    if (!FORMAL) return;
    var msg = $("#pwMsg");
    var pw = $("#newPw").value, pw2 = $("#newPw2").value;
    if (pw.length < 6) { msg.textContent = "密码至少要 6 位。"; return; }
    if (pw !== pw2) { msg.textContent = "两次输入的密码不一样。"; return; }
    msg.textContent = "正在保存……";
    try {
      var res = await sb.auth.updateUser({ password: pw });
      if (res.error) throw res.error;
      msg.textContent = "";
      $("#newPw").value = ""; $("#newPw2").value = "";
      toast("密码已更新，下次用新密码登录");
    } catch (e) { msg.textContent = "保存没有成功，请重新登录后再试。"; }
  });

  /* ---- 推送通知（Web Push）：订阅存 push_subscriptions 表，
     每天 7:00 由 Supabase Edge Function + pg_cron 统一发送 ---- */
  var pushReg = null;
  function urlB64ToUint8Array(base64String) {
    var padding = "=".repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    var raw = atob(base64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }
  function vapidKey() { return (window.APP_CONFIG && window.APP_CONFIG.VAPID_PUBLIC_KEY) || ""; }
  if (FORMAL && "serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").then(function (reg) { pushReg = reg; }).catch(function () {});
  }
  async function pushState() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return { supported: false };
    var reg = pushReg;
    if (!reg) { try { reg = await navigator.serviceWorker.getRegistration(); } catch (e) {} }
    var sub = null;
    if (reg) { try { sub = await reg.pushManager.getSubscription(); } catch (e) {} }
    return { supported: true, permission: Notification.permission, subscribed: !!sub, endpoint: sub ? sub.endpoint : null };
  }
  async function refreshPushUI() {
    var btn = $("#pushBtn"), st = $("#pushStatus");
    if (!btn || !st) return;
    if (!FORMAL) { btn.style.display = "none"; st.textContent = "演示模式下不可用。"; return; }
    if (!vapidKey()) { btn.style.display = "none"; st.textContent = "管理员尚未配置推送服务。"; return; }
    var s = await pushState();
    if (!s.supported) {
      btn.style.display = "none";
      st.textContent = "这台设备的浏览器暂不支持推送。iPhone 请先把网站「添加到主屏幕」，再从桌面图标打开来开启。";
      return;
    }
    btn.style.display = "";
    if (s.permission === "denied") {
      btn.disabled = true; btn.textContent = "已被系统拒绝";
      st.textContent = "通知权限被拒绝了。请到浏览器或系统设置里允许本站通知，再回来开启。";
      return;
    }
    btn.disabled = false;
    btn.textContent = s.subscribed ? "关闭推送" : "开启推送";
    st.textContent = s.subscribed ? "已开启：每天早上 7:00 会收到读经提醒推送。" : "开启后，每天早上 7:00 即使没打开网站，也会收到读经提醒。";
  }
  $("#pushBtn").addEventListener("click", async function () {
    if (!FORMAL || !S.user) { toast("请先登录"); return; }
    var reg = pushReg;
    if (!reg) { try { reg = await navigator.serviceWorker.ready; pushReg = reg; } catch (e) {} }
    if (!reg) { toast("推送组件还没准备好，请稍后再试"); return; }
    var s = await pushState();
    if (s.subscribed) {
      try {
        var sub = await reg.pushManager.getSubscription();
        var ep = sub ? sub.endpoint : null;
        if (sub) await sub.unsubscribe();
        if (ep) { try { await sb.from("push_subscriptions").delete().eq("endpoint", ep); } catch (e) {} }
        toast("推送已关闭");
      } catch (e) { toast("关闭没有成功，请再试一次"); }
      refreshPushUI();
      return;
    }
    try {
      var perm = await Notification.requestPermission();
      if (perm !== "granted") { toast("没有获得通知权限，推送未开启"); refreshPushUI(); return; }
      var sub2 = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(vapidKey()) });
      var j = sub2.toJSON();
      var res = await sb.from("push_subscriptions").upsert(
        { user_id: S.user.id, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth },
        { onConflict: "endpoint" }
      );
      if (res.error) throw res.error;
      toast("推送已开启，每天早上 7:00 提醒你读经");
    } catch (e) { toast("开启没有成功（可能推送服务还没部署完）"); }
    refreshPushUI();
  });

  /* ---- 我的祷告清单 ---- */
  function myPrayerRow(p) {
    var tags = scopeTag(p.vis) + (p.status === "answered" ? ' <span class="tag olive">已蒙应允</span>' : ' <span class="tag gold">待祷告</span>');
    var acts = p.status === "answered"
      ? '<button class="act-btn" data-mypray-status="open" data-mypray-id="' + p.id + '">恢复待祷告</button>'
      : '<button class="act-btn" data-mypray-status="answered" data-mypray-id="' + p.id + '">标记已蒙应允</button>';
    acts += '<button class="act-btn" data-mypray-del="' + p.id + '">删除</button>';
    return '<article class="card post pray-card"><div class="post-head"><div class="p-main">' +
      '<div class="p-name">' + tags + '</div><div class="p-meta">' + escapeHtml(p.meta) + "</div></div></div>" +
      '<p class="pray-body">' + escapeHtml(p.body) + '</p><div class="post-actions">' + acts + "</div></article>";
  }
  function renderMyPrayers() {
    var list = $("#myPrayersList");
    if (!FORMAL) {
      list.innerHTML = myPrayerRow({ id: "demo", vis: "group", status: "open", meta: "以琳小组 · 演示内容", body: "请为我父亲下周的手术代祷。心里有些害怕，求主赐下平安，也保守医生的手。" }) +
        '<p class="set-note">演示模式下按钮不会真的保存。</p>';
      return;
    }
    var mine = (S.prayers || []).filter(function (p) { return p.user_id === S.user.id; });
    list.innerHTML = mine.length ? mine.map(function (p) {
      return myPrayerRow({ id: p.id, vis: p.visibility, status: p.status, meta: timeAgo(p.created_at), body: p.content });
    }).join("") : '<p style="color:var(--muted);font-size:15px;padding:16px 2px">你还没有发起过代祷。到「祷告」页点右下角 + ，写下第一个代祷事项吧。</p>';
  }
  $("#openMyPrayersBtn").addEventListener("click", function () { renderMyPrayers(); openSheet("myPrayers"); });
  document.addEventListener("click", function (e) {
    var st = e.target.closest("[data-mypray-status]");
    var del = e.target.closest("[data-mypray-del]");
    if (!st && !del) return;
    if (!FORMAL) { toast("演示模式：操作不会保存"); return; }
    if (del && !window.confirm("确定要删除这条代祷吗？删除后就看不到了。")) return;
    (async function () {
      try {
        var res;
        if (st) res = await sb.from("prayers").update({ status: st.getAttribute("data-mypray-status") }).eq("id", st.getAttribute("data-mypray-id"));
        else res = await sb.from("prayers").delete().eq("id", del.getAttribute("data-mypray-del"));
        if (res.error) throw res.error;
        toast(st ? "已更新" : "已删除");
        await loadPrayers(); renderMyPrayers();
      } catch (err) { toast("操作没有成功，请再试一次"); }
    })();
  });

  /* ---- 我的小组 ---- */
  $("#openGroupBtn").addEventListener("click", async function () {
    var box = $("#groupSheetBody");
    openSheet("myGroup");
    if (!FORMAL) {
      box.innerHTML = '<div class="field-label">以琳小组 · 共 4 人（演示）</div>' +
        [["陈安琪", "成员"], ["林小慧", "成员"], ["王美玲", "成员"], ["陈志远", "小组长"]].map(function (m) {
          return '<div class="set-row"><div style="display:flex;align-items:center;gap:10px"><span class="avatar" style="background:' + colorFor(m[0]) + '">' + m[0].charAt(0) + '</span><b>' + m[0] + '</b></div><span class="tag">' + m[1] + "</span></div>";
        }).join("");
      return;
    }
    if (!S.profile || !S.profile.group_id) {
      box.innerHTML = '<p class="set-note">你还没有选择小组。到「设置与提醒 → 个人资料」里选一个小组，就能在这里看到组员了。</p>';
      return;
    }
    box.innerHTML = '<p class="set-note">正在加载小组成员……</p>';
    try {
      var res = await sb.from("profiles").select("id, display_name, role, created_at").eq("group_id", S.profile.group_id).order("created_at", { ascending: true });
      if (res.error) throw res.error;
      var rows = (res.data || []).map(function (m) {
        var nm = m.display_name || "弟兄姐妹";
        var role = m.role === "admin" ? "管理员" : (m.role === "leader" ? "小组长" : "成员");
        return '<div class="set-row"><div style="display:flex;align-items:center;gap:10px"><span class="avatar" style="background:' + colorFor(nm) + '">' + escapeHtml(nm.charAt(0)) + '</span><b>' + escapeHtml(nm) + (m.id === S.user.id ? "（我）" : "") + '</b></div><span class="tag">' + role + "</span></div>";
      }).join("");
      box.innerHTML = '<div class="field-label">' + escapeHtml(myGroupName() || "我的小组") + " · 共 " + (res.data || []).length + " 人</div>" + rows;
    } catch (e) { box.innerHTML = '<p class="set-note">成员加载失败，请检查网络后再试。</p>'; }
  });

  /* ---- 读经计划 ---- */
  $("#openPlanBtn").addEventListener("click", function () {
    var t = todayStr();
    var r = computedReading(t);
    function addDays(ds, n) {
      var p = ds.split("-");
      var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 86400000);
      return d.getUTCFullYear() + "年" + (d.getUTCMonth() + 1) + "月" + d.getUTCDate() + "日";
    }
    var ntPct = Math.round(r.ntPos / NT_SEQ.length * 100);
    var otPct = Math.round(r.otPos / OT_SEQ.length * 100);
    $("#planSheetBody").innerHTML =
      '<p class="set-note" style="margin-top:0">全教会同读一份计划：<b>每天旧约 1 章、新约 1 章</b>，按圣经卷次顺序读，读完一轮自动从头开始。哪天漏了不用补，按当天日期接着读就好。</p>' +
      '<div class="field-label">今天</div>' +
      '<p class="set-note" style="margin-top:0">' + (r.diff >= 0 ? "计划第 " + (r.diff + 1) + " 天 · " : "") + "今日经文：" + escapeHtml(r.reference) + "</p>" +
      '<div class="field-label">新约进度（本轮 ' + r.ntPos + " / " + NT_SEQ.length + " 章）</div>" +
      '<div class="pbar"><i style="width:' + ntPct + '%"></i></div>' +
      '<p class="set-note" style="margin-top:0">本轮预计 ' + addDays(t, NT_SEQ.length - r.ntPos) + " 读完（启示录 22 章），次日从马太福音 1 章开始新一轮。</p>" +
      '<div class="field-label">旧约进度（本轮 ' + r.otPos + " / " + OT_SEQ.length + " 章）</div>" +
      '<div class="pbar"><i style="width:' + otPct + '%"></i></div>' +
      '<p class="set-note" style="margin-top:0">本轮预计 ' + addDays(t, OT_SEQ.length - r.otPos) + " 读完（玛拉基书 4 章），次日从创世纪 1 章开始新一轮。</p>" +
      '<div class="field-label">计划起点</div>' +
      '<p class="set-note" style="margin-top:0">2026 年 11 月 17 日开始，那天读的是耶利米哀歌 5 章 · 以弗所书 5 章。</p>' +
      '<button class="btn btn-olive" id="planGoRead" style="width:100%;margin-top:16px">查看本周经文</button>';
    var g = $("#planGoRead");
    if (g) g.addEventListener("click", function () { closeSheets(); go("read"); });
    openSheet("planSheet");
  });

  /* ---- 阅读页：前一天 / 后一天 + 点经文写笔记 ---- */
  var readerDate = null;
  function openSingleChapter(book, ch) {
    openReading({ single: [book, ch], reference: dispRef(book, ch, bibleVer), fromPicker: true });
  }
  function shiftChapter(n) {
    var cur = S.lastReading.single;
    if (!shiftChapter.flat) {
      var flat = [];
      OT_BOOKS.concat(NT_BOOKS).forEach(function (b) { for (var c = 1; c <= b[1]; c++) flat.push([b[0], c]); });
      shiftChapter.flat = flat;
    }
    var flat = shiftChapter.flat, idx = -1;
    for (var i = 0; i < flat.length; i++) if (flat[i][0] === cur[0] && flat[i][1] === cur[1]) { idx = i; break; }
    var t = flat[idx + n];
    if (!t) { toast(n > 0 ? "已是最后一章" : "已是第一章"); return; }
    openSingleChapter(t[0], t[1]);
  }
  function shiftReader(n) {
    if (!FORMAL) { toast("演示模式只提供今日经文"); return; }
    if (S.lastReading && S.lastReading.single) { shiftChapter(n); return; }
    var base = readerDate || todayStr();
    var p = base.split("-");
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]) + n * 86400000);
    var ds = d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2);
    openReading(computedReading(ds));
  }
  $("#readerPrev").addEventListener("click", function () { shiftReader(-1); });
  $("#readerNext").addEventListener("click", function () { shiftReader(1); });
  /* ================================================================
     划线（highlights）：点经文 → 操作栏（划线 / 写笔记 / 复制）
     正式模式存数据库（highlights 表）；表还没建时先存本机，
     建表后首次加载会自动把本机划线同步进数据库。
  ================================================================ */
  var HL = { map: {}, db: false };
  var HL_LS = "churchHighlights";
  function hlKey(book, ch, v) { return book + "|" + ch + "|" + v; }
  function bookOrder() {
    if (!bookOrder.map) {
      bookOrder.map = {};
      OT_BOOKS.concat(NT_BOOKS).forEach(function (b, i) { bookOrder.map[b[0]] = i; });
    }
    return bookOrder.map;
  }
  function updateHlBadge() {
    var n = Object.keys(HL.map).length;
    var b = $("#hlBadge");
    if (b) { b.textContent = n + " 处"; b.style.display = n ? "" : "none"; }
  }
  function applyHighlightsToDom() {
    $$("#verses p[data-hlkey]").forEach(function (p) {
      p.classList.toggle("hl-on", !!HL.map[p.getAttribute("data-hlkey")]);
    });
  }
  function saveLocalHl() {
    try { localStorage.setItem(HL_LS, JSON.stringify(Object.keys(HL.map))); } catch (e) {}
  }
  async function loadHighlights() {
    if (!FORMAL || !S.user) return;
    try {
      var res = await sb.from("highlights").select("*").eq("user_id", S.user.id);
      if (res.error) throw res.error;
      HL.db = true;
      HL.map = {};
      (res.data || []).forEach(function (h) { HL.map[hlKey(h.book, h.chapter, h.verse)] = h; });
      // 本机若有未同步的划线（建表之前划的），一次性同步进数据库
      var localKeys = [];
      try { localKeys = JSON.parse(localStorage.getItem(HL_LS) || "[]"); } catch (e) {}
      var pending = localKeys.filter(function (k) { return !HL.map[k]; });
      for (var i = 0; i < pending.length; i++) {
        var pp = pending[i].split("|");
        try {
          var ins = await sb.from("highlights").insert({ user_id: S.user.id, book: pp[0], chapter: +pp[1], verse: +pp[2] }).select().single();
          if (!ins.error && ins.data) HL.map[pending[i]] = ins.data;
        } catch (e) {}
      }
      if (pending.length) saveLocalHl();
    } catch (e) {
      HL.db = false;
      HL.map = {};
      try { (JSON.parse(localStorage.getItem(HL_LS) || "[]")).forEach(function (k) { HL.map[k] = { local: true }; }); } catch (e2) {}
    }
    updateHlBadge();
    applyHighlightsToDom();
  }
  async function toggleHighlight(sv) {
    var key = sv.key;
    if (HL.map[key]) {
      delete HL.map[key];
      if (HL.db) { try { await sb.from("highlights").delete().eq("user_id", S.user.id).eq("book", sv.book).eq("chapter", sv.ch).eq("verse", sv.v); } catch (e) {} }
    } else {
      HL.map[key] = { book: sv.book, chapter: sv.ch, verse: sv.v, color: "gold" };
      if (HL.db) {
        try {
          var r = await sb.from("highlights").insert({ user_id: S.user.id, book: sv.book, chapter: sv.ch, verse: sv.v }).select().single();
          if (!r.error && r.data) HL.map[key] = r.data;
        } catch (e) {}
      }
    }
    if (!HL.db) saveLocalHl();
    updateHlBadge();
    applyHighlightsToDom();
  }

  /* ---- 经文选中与操作栏 ---- */
  var selVerse = null;
  function clearVerseSel() {
    selVerse = null;
    $$("#verses p.verse-sel").forEach(function (x) { x.classList.remove("verse-sel"); });
    var b = $("#verseBar"); if (b) b.hidden = true;
  }
  $("#verses").addEventListener("click", function (e) {
    if (!FORMAL) return;
    var p = e.target.closest("p[data-hlkey]");
    if (!p) return;
    clearVerseSel();
    var key = p.getAttribute("data-hlkey");
    var parts = key.split("|");
    selVerse = {
      key: key, book: parts[0], ch: +parts[1], v: +parts[2],
      label: p.getAttribute("data-vref"),
      text: p.textContent.replace(/^\s*\d+(?:-\d+)?\s*/, "")
    };
    p.classList.add("verse-sel");
    $("#vbRef").textContent = selVerse.label;
    $("#vbHl").textContent = HL.map[key] ? "取消划线" : "划线";
    $("#verseBar").hidden = false;
  });
  $("#vbClose").addEventListener("click", clearVerseSel);
  $("#vbHl").addEventListener("click", async function () {
    if (!selVerse) return;
    var sv = selVerse;
    await toggleHighlight(sv);
    $("#vbHl").textContent = HL.map[sv.key] ? "取消划线" : "划线";
    toast(HL.map[sv.key] ? "已划线，存在「我的划线」里" : "已取消划线");
  });
  $("#vbNote").addEventListener("click", function () {
    if (!selVerse) return;
    var ref = selVerse.label;
    clearVerseSel();
    closeSheets();
    go("me");
    openSheet("myNotes");
    var nf = $("#noteForm"); if (nf) nf.style.display = "";
    $("#noteTitle").value = ref;
    setTimeout(function () { var nt = $("#noteText"); if (nt) nt.focus(); }, 80);
    toast("为「" + ref + "」写笔记");
  });
  $("#vbCopy").addEventListener("click", async function () {
    if (!selVerse) return;
    var t = selVerse.text + "（" + selVerse.label + " · " + VER_NAMES[S.readerVerUsed || bibleVer] + "）";
    try { await navigator.clipboard.writeText(t); toast("经文已复制，可以粘贴分享了"); }
    catch (e) { toast("复制没有成功，可以长按经文手动复制"); }
  });

  /* ---- 译本切换（阅读页顶部） ---- */
  $$(".ver-seg button").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = b.getAttribute("data-ver");
      if (!v || v === bibleVer) return;
      bibleVer = v;
      try { localStorage.setItem("churchBibleVer", v); } catch (e) {}
      syncVerSwitch();
      renderBiblePicker();
      toast("已切换为" + VER_NAMES[v]);
      if (S.lastReading) openReading(S.lastReading);
    });
  });

  /* ================================================================
     圣经阅读（独立阅读器）：与每日读经计划分开，自由选书卷/章节查考。
     选章后复用阅读页的单章模式打开，页尾 ←/→ 按章翻页（可跨书卷）。
  ================================================================ */
  var bibleTestament = "OT", bibleBook = null;
  function renderBiblePicker() {
    var grid = $("#bookGrid");
    if (!grid) return;
    var books = bibleTestament === "OT" ? OT_BOOKS : NT_BOOKS;
    grid.innerHTML = books.map(function (b) {
      return '<button class="book-btn" data-book="' + escapeHtml(b[0]) + '">' + escapeHtml(dispBook(b[0], bibleVer)) + "</button>";
    }).join("");
    var tO = $("#bibleTabOT"), tN = $("#bibleTabNT");
    if (tO) tO.classList.toggle("on", bibleTestament === "OT");
    if (tN) tN.classList.toggle("on", bibleTestament === "NT");
    if (bibleBook) renderChapGrid();
    else { var cp = $("#chapPane"); if (cp) cp.hidden = true; grid.hidden = false; }
  }
  function renderChapGrid() {
    var all = OT_BOOKS.concat(NT_BOOKS), rec = null;
    for (var i = 0; i < all.length; i++) if (all[i][0] === bibleBook) rec = all[i];
    if (!rec) return;
    $("#chapBookName").textContent = dispBook(bibleBook, bibleVer) + "（共 " + rec[1] + " 章）";
    var h = "";
    for (var c = 1; c <= rec[1]; c++) h += '<button data-ch="' + c + '">' + c + "</button>";
    $("#chapGrid").innerHTML = h;
    $("#bookGrid").hidden = true;
    $("#chapPane").hidden = false;
  }
  var obb = $("#openBibleBtn");
  if (obb) obb.addEventListener("click", function () { renderBiblePicker(); openSheet("bibleSheet"); });
  var btO = $("#bibleTabOT"), btN = $("#bibleTabNT");
  if (btO) btO.addEventListener("click", function () { bibleTestament = "OT"; bibleBook = null; renderBiblePicker(); });
  if (btN) btN.addEventListener("click", function () { bibleTestament = "NT"; bibleBook = null; renderBiblePicker(); });
  var bgEl = $("#bookGrid");
  if (bgEl) bgEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-book]");
    if (!b) return;
    bibleBook = b.getAttribute("data-book");
    renderChapGrid();
  });
  var cbEl = $("#chapBack");
  if (cbEl) cbEl.addEventListener("click", function () { bibleBook = null; renderBiblePicker(); });
  var cgEl = $("#chapGrid");
  if (cgEl) cgEl.addEventListener("click", function (e) {
    var b = e.target.closest("[data-ch]");
    if (!b || !bibleBook) return;
    if (!FORMAL) { toast("演示模式只提供今日经文"); return; }
    var book = bibleBook, ch = +b.getAttribute("data-ch");
    closeSheets();
    openSingleChapter(book, ch);
  });

  /* ---- 我的划线列表 ---- */
  $("#openHlBtn").addEventListener("click", function () { openSheet("myHl"); renderHlList(); });
  $("#openNotesBtn").addEventListener("click", function () { openSheet("myNotes"); });
  var tnl = $("#todayNotesLink");
  if (tnl) tnl.addEventListener("click", function () { openSheet("myNotes"); });
  async function renderHlList() {
    var box = $("#hlList");
    var order = bookOrder();
    var entries = Object.keys(HL.map).map(function (k) {
      var p = k.split("|");
      return { key: k, book: p[0], ch: +p[1], v: +p[2] };
    }).sort(function (a, b) {
      return (order[a.book] - order[b.book]) || (a.ch - b.ch) || (a.v - b.v);
    });
    if (!entries.length) {
      box.innerHTML = '<p class="set-note">还没有划线。在读经页点任意一节经文，选「划线」，就会保存在这里。</p>';
      return;
    }
    box.innerHTML = '<p class="set-note">正在加载划线内容……</p>';
    var groups = [];
    entries.forEach(function (en) {
      var g = groups[groups.length - 1];
      if (!g || g.book !== en.book || g.ch !== en.ch) { g = { book: en.book, ch: en.ch, items: [] }; groups.push(g); }
      g.items.push(en);
    });
    var html = "";
    for (var gi = 0; gi < groups.length; gi++) {
      var g2 = groups[gi];
      var verses = [];
      var usedVer = bibleVer;
      try { var chap = await fetchChapter(g2.book, g2.ch); verses = chap.rows; usedVer = chap.used || bibleVer; } catch (e) {}
      var textByVerse = {};
      verses.forEach(function (vv) { textByVerse[vv.verse] = vv.text; });
      html += '<div class="field-label">' + escapeHtml(dispRef(g2.book, g2.ch, usedVer)) + "</div>";
      html += g2.items.map(function (en) {
        return '<div class="card note-card"><div class="n-date">' + escapeHtml(dispBook(en.book, usedVer) + " " + en.ch + ":" + en.v) +
          '<button class="note-del" data-hl-del="' + escapeHtml(en.key) + '">删除</button>' +
          '<button class="note-goto" data-hl-goto="' + escapeHtml(en.book + "|" + en.ch) + '">看这一章</button></div>' +
          '<p class="n-text">' + escapeHtml(textByVerse[en.v] || "（经文加载失败，点「看这一章」查看）") + "</p></div>";
      }).join("");
    }
    box.innerHTML = html;
  }
  document.addEventListener("click", function (e) {
    var del = e.target.closest("[data-hl-del]");
    if (del) {
      var k = del.getAttribute("data-hl-del");
      var p = k.split("|");
      toggleHighlight({ key: k, book: p[0], ch: +p[1], v: +p[2] }).then(function () { renderHlList(); });
      return;
    }
    var gt = e.target.closest("[data-hl-goto]");
    if (gt) {
      var p2 = gt.getAttribute("data-hl-goto").split("|");
      closeSheets();
      openReading({ single: [p2[0], +p2[1]], reference: dispRef(p2[0], +p2[1], bibleVer), read_date: null, content: "" });
    }
  });

  /* ================================================================
     管理员界面：成员管理（小组/角色/停用）+ 小组管理（增/改名/删）
     数据权限由数据库 RLS 保证（profiles_update 与 groups_write
     都只允许管理员改动他人/小组），这里只是操作界面。
  ================================================================ */
  function isAdmin() { return !!(FORMAL && S.profile && S.profile.role === "admin"); }
  $("#openAdminBtn").addEventListener("click", function () { openSheet("adminSheet"); renderAdmin(); });
  $("#inactiveOutBtn").addEventListener("click", async function () {
    try { await sb.auth.signOut(); } catch (e) {}
    location.reload();
  });
  async function renderAdmin() {
    if (!isAdmin()) return;
    try {
      var members = await sb.from("profiles").select("id, display_name, username, role, group_id, is_active, created_at").order("created_at", { ascending: true });
      if (members.error) throw members.error;
      S.adminMembers = members.data || [];
      var ckCount = 0;
      try {
        var cks = await sb.from("checkins").select("user_id").eq("checkin_date", todayStr());
        if (!cks.error) {
          var seen = {};
          (cks.data || []).forEach(function (c) { seen[c.user_id] = true; });
          ckCount = Object.keys(seen).length;
        }
      } catch (e) {}
      $("#adminStats").textContent = "成员 " + S.adminMembers.length + " 人 · 小组 " + S.groups.length + " 个 · 今日已打卡 " + ckCount + " 人";
      renderAdminMembers();
      renderAdminGroups();
    } catch (e) {
      $("#adminMembers").innerHTML = '<p class="set-note">加载失败，请检查网络后再试。</p>';
    }
  }
  function renderAdminMembers() {
    var box = $("#adminMembers");
    if (!box) return;
    function groupOpts(sel) {
      return '<option value="">（无小组）</option>' + S.groups.map(function (g) {
        return '<option value="' + g.id + '"' + (g.id === sel ? " selected" : "") + ">" + escapeHtml(g.name) + "</option>";
      }).join("");
    }
    function roleOpts(sel) {
      return [["member", "成员"], ["leader", "小组长"], ["admin", "管理员"]].map(function (r) {
        return '<option value="' + r[0] + '"' + (sel === r[0] ? " selected" : "") + ">" + r[1] + "</option>";
      }).join("");
    }
    box.innerHTML = (S.adminMembers || []).map(function (m) {
      var nm = m.display_name || "弟兄姐妹";
      var self = m.id === S.user.id;
      return '<div class="adm-row' + (m.is_active ? "" : " adm-off") + '">' +
        '<span class="avatar" style="background:' + colorFor(nm) + '">' + escapeHtml(nm.charAt(0)) + "</span>" +
        '<div class="adm-main"><div class="adm-name">' + escapeHtml(nm) + (self ? "（我）" : "") + "</div>" +
        '<div class="adm-meta">' + (m.username ? "@" + escapeHtml(m.username) + " · " : "") + "加入于 " + String(m.created_at || "").slice(0, 10) + (m.is_active ? "" : " · 已停用") + "</div></div>" +
        '<select class="adm-sel" data-adm-group="' + m.id + '" aria-label="所在小组">' + groupOpts(m.group_id) + "</select>" +
        '<select class="adm-sel" data-adm-role="' + m.id + '"' + (self ? " disabled" : "") + ' aria-label="角色">' + roleOpts(m.role) + "</select>" +
        '<button class="act-btn" data-adm-active="' + m.id + '"' + (self ? " disabled" : "") + ">" + (m.is_active ? "停用" : "启用") + "</button>" +
        "</div>";
    }).join("") || '<p class="set-note">还没有成员。</p>';
  }
  function renderAdminGroups() {
    var box = $("#adminGroups");
    if (!box) return;
    var counts = {};
    (S.adminMembers || []).forEach(function (m) { if (m.group_id) counts[m.group_id] = (counts[m.group_id] || 0) + 1; });
    box.innerHTML = S.groups.map(function (g) {
      if (S.grpEditing === g.id) {
        return '<div class="adm-row"><div class="adm-main"><input class="text-input" id="grpNameInput" value="' + escapeHtml(g.name) + '" /></div>' +
          '<button class="act-btn" data-grp-save="' + g.id + '">保存</button>' +
          '<button class="act-btn" data-grp-cancel="1">取消</button></div>';
      }
      return '<div class="adm-row"><div class="adm-main"><div class="adm-name">' + escapeHtml(g.name) + '</div><div class="adm-meta">' + (counts[g.id] || 0) + ' 位成员</div></div>' +
        '<button class="act-btn" data-grp-rename="' + g.id + '">改名</button>' +
        '<button class="act-btn" data-grp-del="' + g.id + '">删除</button></div>';
    }).join("") || '<p class="set-note">还没有小组。</p>';
  }
  async function adminUpdate(id, patch, okMsg) {
    try {
      var res = await sb.from("profiles").update(patch).eq("id", id);
      if (res.error) throw res.error;
      (S.adminMembers || []).forEach(function (m) { if (m.id === id) for (var k in patch) m[k] = patch[k]; });
      if (id === S.user.id) { S.profile = await loadProfileRow(); fillMe(); }
      toast(okMsg);
      renderAdminMembers();
      renderAdminGroups();
    } catch (e) { toast("更新没有成功，请再试一次"); renderAdmin(); }
  }
  document.addEventListener("change", function (e) {
    if (!isAdmin()) return;
    var g = e.target.closest("[data-adm-group]");
    if (g) { adminUpdate(g.getAttribute("data-adm-group"), { group_id: g.value || null }, "小组已更新"); return; }
    var r = e.target.closest("[data-adm-role]");
    if (r) adminUpdate(r.getAttribute("data-adm-role"), { role: r.value }, "角色已更新");
  });
  document.addEventListener("click", function (e) {
    if (!isAdmin()) return;
    var a = e.target.closest("[data-adm-active]");
    if (a) {
      var m = (S.adminMembers || []).filter(function (x) { return x.id === a.getAttribute("data-adm-active"); })[0];
      if (m) adminUpdate(m.id, { is_active: !m.is_active }, m.is_active ? "已停用该成员" : "已启用该成员");
      return;
    }
    var rn = e.target.closest("[data-grp-rename]");
    if (rn) { S.grpEditing = rn.getAttribute("data-grp-rename"); renderAdminGroups(); return; }
    if (e.target.closest("[data-grp-cancel]")) { S.grpEditing = null; renderAdminGroups(); return; }
    var sv = e.target.closest("[data-grp-save]");
    if (sv) {
      var gid = sv.getAttribute("data-grp-save");
      var name = ($("#grpNameInput") || {}).value || "";
      name = name.trim();
      if (!name) { toast("小组名不能为空"); return; }
      (async function () {
        try {
          var res = await sb.from("groups").update({ name: name }).eq("id", gid);
          if (res.error) throw res.error;
          S.grpEditing = null;
          await loadGroups();
          fillMe();
          toast("小组已改名");
          renderAdmin();
        } catch (err) { toast("改名失败（名字可能已被占用）"); }
      })();
      return;
    }
    var del = e.target.closest("[data-grp-del]");
    if (del) {
      var g2 = S.groups.filter(function (x) { return x.id === del.getAttribute("data-grp-del"); })[0];
      if (!g2) return;
      if (!window.confirm("确定要删除小组「" + g2.name + "」吗？组员会变成未分组，可再重新分配。")) return;
      (async function () {
        try {
          var res = await sb.from("groups").delete().eq("id", g2.id);
          if (res.error) throw res.error;
          await loadGroups();
          fillMe();
          toast("小组已删除");
          renderAdmin();
        } catch (err) { toast("删除没有成功，请再试一次"); }
      })();
    }
  });
  $("#addGroupBtn").addEventListener("click", async function () {
    if (!isAdmin()) return;
    var name = $("#newGroupName").value.trim();
    if (!name) { toast("先输入新小组的名称"); return; }
    try {
      var res = await sb.from("groups").insert({ name: name });
      if (res.error) throw res.error;
      $("#newGroupName").value = "";
      await loadGroups();
      toast("小组已添加");
      renderAdmin();
    } catch (e) { toast("添加失败（小组名可能已存在）"); }
  });

  /* ---- 新成员三步引导卡（关闭后不再显示） ---- */
  var obCard = $("#onboardCard");
  if (obCard) {
    var obDone = false;
    try { obDone = !!localStorage.getItem("churchOnboarded"); } catch (e) {}
    if (!obDone) obCard.hidden = false;
    $("#onboardDismiss").addEventListener("click", function () {
      obCard.hidden = true;
      try { localStorage.setItem("churchOnboarded", "1"); } catch (e) {}
    });
  }

  /* ---------------- calendar ---------------- */
  var calCursor = new Date(); calCursor.setDate(1);
  function buildCalendar() {
    var y = calCursor.getFullYear(), m = calCursor.getMonth();
    var title = $("#calMonthTitle");
    if (title) title.textContent = y + "年" + (m + 1) + "月";
    var startDay = new Date(y, m, 1).getDay();
    var days = new Date(y, m + 1, 0).getDate();
    var tStr = todayStr(), html = "", i, d, ds, cls;
    for (i = 0; i < startDay; i++) html += '<span class="dim"></span>';
    for (d = 1; d <= days; d++) {
      ds = dateStr(new Date(y, m, d));
      cls = "";
      var done = FORMAL ? !!S.myCheckins[ds] : (ds < tStr || (ds === tStr && demoChecked));
      if (done) cls = "done";
      if (ds === tStr) cls = (cls ? cls + " " : "") + "today";
      html += '<span class="' + cls + '" data-day="' + d + '">' + d + "</span>";
    }
    var trail = (7 - (startDay + days) % 7) % 7;
    for (i = 1; i <= trail; i++) html += '<span class="dim">' + i + "</span>";
    $("#calGrid").innerHTML = html;
  }
  $("#calPrev").addEventListener("click", function () { calCursor.setMonth(calCursor.getMonth() - 1); buildCalendar(); });
  $("#calNext").addEventListener("click", function () { calCursor.setMonth(calCursor.getMonth() + 1); buildCalendar(); });

  /* ---------------- streak ---------------- */
  function computeStreak() {
    var n = 0, d = new Date();
    if (!S.myCheckins[dateStr(d)]) d.setDate(d.getDate() - 1);
    while (S.myCheckins[dateStr(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* ---------------- scope pickers ---------------- */
  function scopePicker(rowId) {
    var row = $("#" + rowId);
    row.addEventListener("click", function (e) {
      var b = e.target.closest("[data-scope]");
      if (!b) return;
      $$("button", row).forEach(function (x) { x.classList.toggle("on", x === b); });
    });
    return function () {
      var on = row.querySelector("button.on");
      return on ? on.getAttribute("data-scope") : "group";
    };
  }
  var getComposeScope = scopePicker("scopeRow");
  var getPrayerScope = scopePicker("prayerScopeRow");
  function visOf(scope) { return scope === "mine" ? "private" : (scope === "all" ? "church" : "group"); }

  /* ---------------- card builders ---------------- */
  var ICON_BOOK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>';
  function scopeTag(vis) {
    if (vis === "group") return '<span class="tag olive">小组内</span>';
    if (vis === "church") return '<span class="tag gold">全教会</span>';
    if (vis === "private") return '<span class="tag">仅自己</span>';
    return "";
  }
  // o: {id, cat, vis, name, meta, ref, body, amen, amenOn, pray, prayOn, comments, showPray}
  function shareCard(o) {
    var acts = '<button class="act-btn' + (o.amenOn ? " on-amen" : "") + '" data-amen-btn>阿们 <b>' + (o.amen || 0) + "</b></button>";
    if (o.showPray) acts += '<button class="act-btn' + (o.prayOn ? " on-prayed" : "") + '" data-pray-btn>为你祷告 <b>' + (o.pray || 0) + "</b></button>";
    acts += '<button class="act-btn" data-comment-btn>留言 <b>' + (o.comments || 0) + "</b></button>";
    return '<article class="card post" data-target-type="share" data-cat="' + o.cat + '" data-id="' + (o.id || "") + '">' +
      '<div class="post-head">' +
        '<span class="avatar" style="background:' + colorFor(o.name) + '">' + escapeHtml(String(o.name || "?").charAt(0)) + "</span>" +
        '<div class="p-main"><div class="p-name">' + escapeHtml(o.name) + " " + scopeTag(o.vis) + "</div>" +
        '<div class="p-meta">' + escapeHtml(o.meta) + "</div></div>" +
      "</div>" +
      (o.ref ? '<div class="post-ref">' + ICON_BOOK + escapeHtml(o.ref) + "</div>" : "") +
      '<p class="post-body">' + escapeHtml(o.body) + "</p>" +
      '<div class="post-actions">' + acts + "</div>" +
      '<div class="comments-box" hidden></div>' +
      "</article>";
  }
  // o: {id, vis, anon, name, meta, body, prayed, prayedOn, amen, amenOn, mine, status}
  function prayerCard(o) {
    var dispName = o.anon ? "匿名" : o.name;
    var acts = '<button class="act-btn' + (o.prayedOn ? " on-prayed" : "") + '" data-pray-btn>我来代祷 <b>' + (o.prayed || 0) + "</b></button>";
    acts += '<button class="act-btn' + (o.amenOn ? " on-amen" : "") + '" data-amen-btn>阿们 <b>' + (o.amen || 0) + "</b></button>";
    if (o.mine && o.status === "open") acts += '<button class="act-btn" data-answered-btn>标记已蒙应允</button>';
    var tags = scopeTag(o.vis) + (o.anon ? ' <span class="tag rose">匿名</span>' : "") + (o.status === "answered" ? ' <span class="tag olive">已蒙应允</span>' : "");
    return '<article class="card post pray-card" data-target-type="prayer" data-id="' + (o.id || "") + '">' +
      '<div class="post-head">' +
        '<span class="avatar" style="background:' + colorFor(dispName) + '">' + (o.anon ? "匿" : escapeHtml(String(o.name || "?").charAt(0))) + "</span>" +
        '<div class="p-main"><div class="p-name">' + escapeHtml(dispName) + " " + tags + "</div>" +
        '<div class="p-meta">' + escapeHtml(o.meta) + "</div></div>" +
      "</div>" +
      '<p class="pray-body">' + escapeHtml(o.body) + "</p>" +
      '<div class="post-actions">' + acts + "</div></article>";
  }

  /* ---------------- demo data ---------------- */
  var demoChecked = false;
  var demoPosts = [
    { id: "", cat: "group", vis: "group", name: "林小慧", meta: "以琳小组 · 2小时前", ref: "约翰福音 15:5", body: "读到「离了我，你们就不能做什么」，心里很被提醒。这周工作压力特别大，我一直想靠自己撑过去。今天决定先放下手机祷告十分钟，再开始处理事情，心里平静了很多。", amen: 12, pray: 5, comments: 3, showPray: true },
    { id: "", cat: "all", vis: "church", name: "陈志远", meta: "迦南小组 · 3小时前", ref: "约翰福音 15:2", body: "「他就修理干净，使枝子结果子更多。」原来修剪不是惩罚，而是为了结更多的果子。最近生活里有几处调整我一直不理解，今天好像想通了。感谢主。", amen: 21, pray: 8, comments: 5, showPray: true },
    { id: "", cat: "group", vis: "group", name: "王美玲", meta: "以琳小组 · 5小时前", ref: "约翰福音 15:12", body: "「你们要彼此相爱，像我爱你们一样。」中午给很久没联系的姐妹打了个电话，她正好在低谷里。原来连结不只是读经，也是主动去爱身边的人。", amen: 16, pray: 11, comments: 4, showPray: true },
    { id: "", cat: "mine", vis: "church", name: "陈安琪（我）", meta: "以琳小组 · 昨天", ref: "约翰福音 14:27", body: "「我留下平安给你们，我将我的平安赐给你们。」为家人担心的这一周，这句话一直陪着我。主的平安不是环境变好了，而是心里先安稳了。", amen: 19, pray: 14, comments: 7, showPray: true }
  ];
  var demoPrayers = [
    { id: "", vis: "group", anon: true, name: "一位姐妹", meta: "以琳小组 · 1小时前", body: "请为我父亲下周的手术代祷。心里有些害怕，求主赐下平安，也保守医生的手。", prayed: 23, amen: 9, status: "open" },
    { id: "", vis: "church", anon: false, name: "周建国", meta: "敬拜团契 · 4小时前", body: "为教会青年营会的筹备代祷：求主预备同工、合适的天气，也让每一位年轻人的心被触摸。", prayed: 41, amen: 17, status: "open" },
    { id: "", vis: "group", anon: false, name: "林小慧", meta: "以琳小组 · 昨天", body: "这周要带小组查经，第一次带，有些紧张。求主给我智慧和从容，也求组员们都有得着。", prayed: 15, amen: 6, status: "open" }
  ];

  /* ---------------- share filter ---------------- */
  function setShareFilter(f) {
    $$("#shareTabs button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-filter") === f); });
    var visible = 0;
    $$("#shareFeed .post").forEach(function (card) {
      var cat = card.getAttribute("data-cat");
      var show = f === "all" || cat === f || (f === "group" && cat === "mine");
      card.style.display = show ? "" : "none";
      if (show) visible++;
    });
    $("#shareEmpty").style.display = visible ? "none" : "block";
  }
  $("#shareTabs").addEventListener("click", function (e) {
    var b = e.target.closest("[data-filter]");
    if (b) setShareFilter(b.getAttribute("data-filter"));
  });

  /* ---------------- reaction toggles ---------------- */
  function localToggle(btn, onClass) {
    var b = btn.querySelector("b");
    var n = b ? (parseInt(b.textContent, 10) || 0) : 0;
    var on = btn.classList.toggle(onClass);
    if (b) b.textContent = on ? n + 1 : Math.max(0, n - 1);
    return on;
  }
  async function dbToggleReaction(btn, targetType, targetId, kind, onClass) {
    var b = btn.querySelector("b");
    var wasOn = btn.classList.contains(onClass);
    try {
      if (wasOn) {
        var del = await sb.from("reactions").delete()
          .eq("user_id", S.user.id).eq("target_type", targetType).eq("target_id", targetId).eq("kind", kind);
        if (del.error) throw del.error;
        btn.classList.remove(onClass);
        if (b) b.textContent = Math.max(0, (parseInt(b.textContent, 10) || 0) - 1);
      } else {
        var ins = await sb.from("reactions").insert({ user_id: S.user.id, target_type: targetType, target_id: targetId, kind: kind });
        if (ins.error) throw ins.error;
        btn.classList.add(onClass);
        if (b) b.textContent = (parseInt(b.textContent, 10) || 0) + 1;
        if (kind === "prayed") toast("已记下，愿主垂听我们的祷告");
      }
    } catch (e) {
      toast("网络好像不太顺，请再试一次");
    }
  }
  document.addEventListener("click", function (e) {
    var card = e.target.closest("[data-target-type]");
    var amen = e.target.closest("[data-amen-btn]");
    if (amen && card) {
      if (FORMAL && card.getAttribute("data-id")) dbToggleReaction(amen, card.getAttribute("data-target-type"), card.getAttribute("data-id"), "amen", "on-amen");
      else localToggle(amen, "on-amen");
      return;
    }
    var pf = e.target.closest("[data-pray-btn]");
    if (pf && card) {
      if (FORMAL && card.getAttribute("data-id")) dbToggleReaction(pf, card.getAttribute("data-target-type"), card.getAttribute("data-id"), "prayed", "on-prayed");
      else { var on = localToggle(pf, "on-prayed"); if (on) toast("已记下，愿主垂听我们的祷告"); }
    }
  });

  /* ---------------- comments ---------------- */
  async function loadComments(box, shareId) {
    box.innerHTML = '<p style="color:var(--muted);font-size:14px;padding:10px 2px">正在加载留言……</p>';
    try {
      var res = await sb.from("comments")
        .select("*, profiles(display_name)")
        .eq("share_id", shareId)
        .order("created_at", { ascending: true });
      if (res.error) throw res.error;
      var html = "";
      (res.data || []).forEach(function (c) {
        var nm = (c.profiles && c.profiles.display_name) || "弟兄姐妹";
        html += '<div class="comment-item"><span class="avatar sm" style="background:' + colorFor(nm) + '">' + escapeHtml(nm.charAt(0)) + "</span>" +
          '<div class="c-main"><b>' + escapeHtml(nm) + '</b> <span class="c-time">' + timeAgo(c.created_at) + "</span>" +
          "<p>" + escapeHtml(c.content) + "</p></div></div>";
      });
      if (!html) html = '<p style="color:var(--muted);font-size:14px;padding:8px 2px">还没有留言，来写第一句鼓励的话吧。</p>';
      html += '<div class="comment-form"><input class="text-input" data-comment-input placeholder="写一句鼓励的话……" />' +
        '<button class="btn btn-olive" data-send-comment>发送</button></div>';
      box.innerHTML = html;
    } catch (err) {
      box.innerHTML = '<p style="color:var(--muted);font-size:14px;padding:10px 2px">留言加载失败，请检查网络后再试。</p>';
    }
  }
  document.addEventListener("click", function (e) {
    var cb = e.target.closest("[data-comment-btn]");
    if (cb) {
      var card = cb.closest("[data-target-type]");
      if (!FORMAL || !card || !card.getAttribute("data-id")) { toast(FORMAL ? "这条内容暂时不能留言" : "演示模式：留言在正式版中可用"); return; }
      var box = card.querySelector(".comments-box");
      if (!box) return;
      if (box.hidden) { box.hidden = false; loadComments(box, card.getAttribute("data-id")); }
      else box.hidden = true;
      return;
    }
    var send = e.target.closest("[data-send-comment]");
    if (send && FORMAL) {
      var box2 = send.closest(".comments-box");
      var card2 = send.closest("[data-target-type]");
      var input = box2 ? box2.querySelector("[data-comment-input]") : null;
      var text = input ? input.value.trim() : "";
      if (!text) { toast("先写一句留言吧"); return; }
      (async function () {
        try {
          var res = await sb.from("comments").insert({ user_id: S.user.id, share_id: card2.getAttribute("data-id"), content: text });
          if (res.error) throw res.error;
          var cnt = card2.querySelector("[data-comment-btn] b");
          if (cnt) cnt.textContent = (parseInt(cnt.textContent, 10) || 0) + 1;
          loadComments(box2, card2.getAttribute("data-id"));
          toast("留言已发送");
        } catch (err) { toast("留言没有发出去，请检查网络后再试"); }
      })();
    }
  });

  /* ---------------- check-in ---------------- */
  $$("[data-checkin]").forEach(function (b) { b.setAttribute("data-orig", b.textContent); });
  function renderReaderCheckin(b, done, streak) {
    b.innerHTML = "✓" + (done && streak >= 2 ? '<span class="ck-badge">' + streak + "</span>" : "");
    b.classList.toggle("btn-done", done);
    b.classList.toggle("btn-olive", !done);
    b.title = done ? ("已打卡 · 连续 " + streak + " 天（点一下取消）") : "读完打卡";
    b.setAttribute("aria-label", b.title);
  }
  function demoCheckin() {
    if (demoChecked) { toast("今天已经打过卡啦"); return; }
    demoChecked = true;
    S.myCheckins[todayStr()] = true;
    $$("[data-checkin]").forEach(function (b) {
      if (b.id === "readerCheckinBtn") { renderReaderCheckin(b, true, 24); return; }
      b.textContent = "✓ 已打卡 · 第 24 天";
      b.classList.add(b.classList.contains("btn-outline-light") ? "btn-checkin-done" : "btn-done");
      b.classList.remove("btn-outline-light");
    });
    $("#streakNum").textContent = "24";
    $("#statStreak").textContent = "24";
    var gc = $("#groupCount"); if (gc) gc.textContent = "6";
    var st = $("#todayChapterState"); if (st) st.textContent = "已读 ✓";
    buildCalendar();
    toast("打卡成功！连续读经 24 天");
  }
  function refreshCheckinUI() {
    var done = !!S.myCheckins[todayStr()];
    var streak = computeStreak();
    $$("[data-checkin]").forEach(function (b) {
      if (b.id === "readerCheckinBtn") { renderReaderCheckin(b, done, streak); return; }
      if (done) {
        b.textContent = "✓ 已打卡 · 连续 " + streak + " 天（点一下取消）";
        b.classList.add(b.classList.contains("btn-outline-light") || b.classList.contains("btn-light") ? "btn-checkin-done" : "btn-done");
      } else {
        b.textContent = b.getAttribute("data-orig");
        b.classList.remove("btn-checkin-done", "btn-done");
      }
    });
    $("#streakNum").textContent = streak;
    $("#statStreak").textContent = streak;
    $("#statTotal").textContent = Object.keys(S.myCheckins).length;
    var st = $("#todayChapterState");
    if (st) st.textContent = done ? "已读 ✓" : "去读 →";
    var todayBtn = $('#weekList .chapter[data-today="1"]');
    if (todayBtn) {
      todayBtn.classList.toggle("done", done);
      var stEl = todayBtn.querySelector(".c-state");
      if (stEl) stEl.textContent = done ? "已读" : "去读 →";
    }
    checkReminder();
  }
  var checkinBusy = false;
  async function formalCheckin() {
    if (checkinBusy) return;
    var d = todayStr();
    if (S.myCheckins[d] && !window.confirm("确定要取消今天的打卡吗？")) return;
    checkinBusy = true;
    try {
      if (S.myCheckins[d]) {
        var del = await sb.from("checkins").delete().eq("user_id", S.user.id).eq("checkin_date", d);
        if (del.error) throw del.error;
        delete S.myCheckins[d];
        toast("已取消今天的打卡");
      } else {
        var ins = await sb.from("checkins").insert({
          user_id: S.user.id, checkin_date: d,
          reading_id: S.todayReading ? S.todayReading.id : null
        });
        if (ins.error) throw ins.error;
        S.myCheckins[d] = true;
        toast("打卡成功，愿主的话语陪伴你");
      }
      refreshCheckinUI();
      buildCalendar();
      loadGroupToday();
    } catch (e) {
      toast("打卡没有成功，请检查网络后再试一次");
    } finally { checkinBusy = false; }
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-checkin]")) { if (FORMAL) formalCheckin(); else demoCheckin(); }
  });

  /* ---------------- publish share / prayer ---------------- */
  $("#publishBtn").addEventListener("click", async function () {
    var text = $("#composeText").value.trim();
    if (!text) { toast("先写一句你的领受吧"); return; }
    var scope = getComposeScope();
    if (!FORMAL) {
      var card = shareCard({
        id: "", cat: "mine", vis: visOf(scope), name: "陈安琪（我）",
        meta: "以琳小组 · 刚刚", ref: "约翰福音 15:1–17", body: text, amen: 0, pray: 0, comments: 0, showPray: true
      });
      $("#shareFeed").insertAdjacentHTML("afterbegin", card);
      var n = $("#statShares");
      n.textContent = parseInt(n.textContent, 10) + 1;
      $("#composeText").value = "";
      closeSheets(); go("share"); setShareFilter("all");
      toast(scope === "mine" ? "已保存，仅自己可见" : "分享已发布");
      return;
    }
    var btn = this;
    btn.disabled = true; btn.textContent = "发布中…";
    try {
      var res = await sb.from("shares").insert({
        user_id: S.user.id,
        group_id: S.profile ? S.profile.group_id : null,
        reading_ref: S.todayReading ? S.todayReading.reference : "",
        content: text,
        visibility: visOf(scope)
      });
      if (res.error) throw res.error;
      $("#composeText").value = "";
      closeSheets(); go("share");
      await loadShares();
      setShareFilter("all");
      toast("分享已发布");
    } catch (e) { toast("发布没有成功，请检查网络后再试"); }
    finally { btn.disabled = false; btn.textContent = "发布分享"; }
  });

  $("#publishPrayerBtn").addEventListener("click", async function () {
    var text = $("#prayerText").value.trim();
    if (!text) { toast("先写下代祷事项吧"); return; }
    var anon = $("#anonToggle").checked;
    var scope = getPrayerScope();
    if (!FORMAL) {
      var card = prayerCard({
        id: "", vis: visOf(scope), anon: anon,
        name: anon ? "一位弟兄/姐妹" : "陈安琪（我）",
        meta: "以琳小组 · 刚刚", body: text, prayed: 0, amen: 0, status: "open", mine: true
      });
      $("#prayFeed").insertAdjacentHTML("afterbegin", card);
      $("#prayerText").value = "";
      closeSheets(); go("pray");
      toast("已发布到祷告墙");
      return;
    }
    var btn2 = this;
    btn2.disabled = true; btn2.textContent = "发布中…";
    try {
      var res = await sb.from("prayers").insert({
        user_id: S.user.id,
        group_id: S.profile ? S.profile.group_id : null,
        content: text, is_anonymous: anon, visibility: visOf(scope)
      });
      if (res.error) throw res.error;
      $("#prayerText").value = "";
      closeSheets(); go("pray");
      await loadPrayers();
      toast("已发布到祷告墙");
    } catch (e) { toast("发布没有成功，请检查网络后再试"); }
    finally { btn2.disabled = false; btn2.textContent = "发布到祷告墙"; }
  });

  /* ---------------- answered (formal) ---------------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-answered-btn]");
    if (!b || !FORMAL) return;
    var card = b.closest("[data-target-type]");
    if (!card || !card.getAttribute("data-id")) return;
    (async function () {
      try {
        var res = await sb.from("prayers").update({ status: "answered" }).eq("id", card.getAttribute("data-id"));
        if (res.error) throw res.error;
        toast("感谢主！已移到感恩见证区");
        loadPrayers();
      } catch (err) { toast("操作没有成功，请再试一次"); }
    })();
  });

  /* ---------------- notes (formal) ---------------- */
  async function loadNotes() {
    var list = $("#notesList");
    if (!list) return;
    try {
      var res = await sb.from("notes").select("*").eq("user_id", S.user.id).order("created_at", { ascending: false });
      if (res.error) throw res.error;
      S.notesCache = res.data || [];
      renderNotes();
    } catch (e) {
      list.innerHTML = '<p style="color:var(--muted);font-size:14.5px;padding:6px 2px">笔记加载失败，请检查网络。</p>';
    }
  }
  function parseRefTitle(title) {
    var m = /^(.+?)\s*(\d+)\s*[:：]\s*(\d+)(?:\s*[-–]\s*\d+)?$/.exec((title || "").trim());
    if (!m) return null;
    if (bookOrder()[m[1]] !== undefined) return { book: m[1], ch: +m[2] };
    /* 日文版下写笔记时，标题是日文书名（如「創世記 1:1」），按 JP_BOOKS 同序换回中文键，「看经文」按钮才出现。 */
    var jpIdx = JP_BOOKS.indexOf(m[1]);
    if (jpIdx < 0) return null;
    return { book: OT_BOOKS.concat(NT_BOOKS)[jpIdx][0], ch: +m[2] };
  }
  function updateNoteBadge() {
    var n = (S.notesCache || []).length;
    var b = $("#noteBadge");
    if (b) { b.textContent = n + " 篇"; b.style.display = n ? "" : "none"; }
  }
  function renderNotes() {
    var list = $("#notesList");
    if (!list) return;
    updateNoteBadge();
    var all = S.notesCache || [];
    if (!all.length) {
      list.innerHTML = '<p style="color:var(--muted);font-size:14.5px;padding:6px 2px">还没有笔记。读经时有触动，就随手记一句吧。</p>';
      return;
    }
    var q = (($("#noteSearch") && $("#noteSearch").value) || "").trim().toLowerCase();
    var rows = all.filter(function (n) {
      return !q || ((n.title || "") + " " + (n.content || "")).toLowerCase().indexOf(q) !== -1;
    });
    if (!rows.length) {
      list.innerHTML = '<p style="color:var(--muted);font-size:14.5px;padding:6px 2px">没有找到包含「' + escapeHtml(q) + "」的笔记。</p>";
      return;
    }
    S.notesById = {};
    list.innerHTML = rows.map(function (n) {
      S.notesById[n.id] = n;
      var d = new Date(n.created_at);
      var ref = parseRefTitle(n.title);
      return '<div class="card note-card" data-note-card="' + n.id + '"><div class="n-date">' + (d.getMonth() + 1) + "月" + d.getDate() + "日" +
        (n.title ? " · " + escapeHtml(n.title) : "") +
        '<button class="note-del" data-del-note="' + n.id + '">删除</button>' +
        (ref ? '<button class="note-goto" data-note-goto="' + escapeHtml(ref.book + "|" + ref.ch) + '">看经文</button>' : "") +
        '</div>' +
        '<p class="n-text">' + escapeHtml(n.content) + '</p><p class="n-edit-hint" style="color:var(--muted);font-size:12.5px;margin-top:6px">点开可编辑</p></div>';
    }).join("");
  }
  var noteSearchEl = $("#noteSearch");
  if (noteSearchEl) noteSearchEl.addEventListener("input", function () { renderNotes(); });
  document.addEventListener("click", function (e) {
    var add = e.target.closest("#addNoteBtn");
    if (add && FORMAL) {
      var title = $("#noteTitle").value.trim();
      var text = $("#noteText").value.trim();
      if (!text) { toast("先写一点内容吧"); return; }
      (async function () {
        try {
          var res = await sb.from("notes").insert({ user_id: S.user.id, title: title, content: text });
          if (res.error) throw res.error;
          $("#noteTitle").value = ""; $("#noteText").value = "";
          loadNotes();
          toast("笔记已保存，只有你能看到");
        } catch (err) { toast("保存失败，请检查网络后再试"); }
      })();
      return;
    }
    var del = e.target.closest("[data-del-note]");
    if (del && FORMAL) {
      if (!window.confirm("确定要删除这篇笔记吗？")) return;
      (async function () {
        try {
          var res = await sb.from("notes").delete().eq("id", del.getAttribute("data-del-note"));
          if (res.error) throw res.error;
          loadNotes();
          toast("笔记已删除");
        } catch (err) { toast("删除失败，请再试一次"); }
      })();
      return;
    }
    var ng = e.target.closest("[data-note-goto]");
    if (ng && FORMAL) {
      var gp = ng.getAttribute("data-note-goto").split("|");
      openReading({ single: [gp[0], +gp[1]], reference: dispRef(gp[0], +gp[1], bibleVer), read_date: null, content: "" });
      return;
    }
    var save = e.target.closest("[data-note-save]");
    if (save && FORMAL) {
      var sid = save.getAttribute("data-note-save");
      var ta = document.querySelector('[data-note-edit="' + sid + '"]');
      var txt = ta ? ta.value.trim() : "";
      if (!txt) { toast("内容不能为空"); return; }
      var ti = document.querySelector('[data-note-title="' + sid + '"]');
      var newTitle = ti ? ti.value.trim() : undefined;
      (async function () {
        try {
          var patch = { content: txt };
          if (newTitle !== undefined) patch.title = newTitle;
          var res = await sb.from("notes").update(patch).eq("id", sid);
          if (res.error) throw res.error;
          loadNotes();
          toast("笔记已更新");
        } catch (err) { toast("保存失败，请再试一次"); }
      })();
      return;
    }
    if (e.target.closest("[data-note-cancel]")) { loadNotes(); return; }
    var card2 = e.target.closest("[data-note-card]");
    if (card2 && FORMAL && !e.target.closest("textarea, button")) {
      var nid = card2.getAttribute("data-note-card");
      var note = (S.notesById || {})[nid];
      if (!note || card2.querySelector("textarea")) return;
      var pEl = card2.querySelector(".n-text");
      var hint = card2.querySelector(".n-edit-hint");
      if (hint) hint.style.display = "none";
      if (pEl) {
        var ti2 = document.createElement("input");
        ti2.setAttribute("data-note-title", nid);
        ti2.className = "text-input";
        ti2.value = note.title || "";
        ti2.placeholder = "标题（可不填）";
        ti2.style.cssText = "width:100%;margin-top:8px";
        var ta2 = document.createElement("textarea");
        ta2.setAttribute("data-note-edit", nid);
        ta2.value = note.content;
        ta2.rows = 4;
        ta2.style.cssText = "width:100%;margin-top:8px";
        pEl.replaceWith(ti2, ta2);
        var bar = document.createElement("div");
        bar.style.cssText = "display:flex;gap:10px;margin-top:10px";
        bar.innerHTML = '<button class="btn btn-olive" data-note-save="' + nid + '" style="flex:1">保存</button>' +
          '<button class="btn btn-ghost" data-note-cancel="1" style="flex:1">取消</button>';
        card2.appendChild(bar);
        ta2.focus();
      }
    }
  });

  /* ================================================================
     正式模式：数据加载
  ================================================================ */
  async function loadGroups() {
    var res = await sb.from("groups").select("*").order("created_at", { ascending: true });
    if (res.error) throw res.error;
    S.groups = res.data || [];
  }

  async function loadMyCheckins() {
    var res = await sb.from("checkins").select("checkin_date").eq("user_id", S.user.id);
    if (res.error) throw res.error;
    S.myCheckins = {};
    (res.data || []).forEach(function (r) { S.myCheckins[r.checkin_date] = true; });
  }

  /* ================================================================
     读经计划：按日期自动计算（不依赖数据库预排）
     规则：每天旧约 1 章 + 新约 1 章，各自按书卷顺序推进，读完自动回绕。
     锚点：2026-11-17 = 耶利米哀歌 5 章 + 以弗所书 5 章（教会确认）。
     译本：教会读经用新译本（仅给出出处）；站内阅读全文为公有领域的
     和合本，存于 bible_verses 表，按书卷/章从数据库实时取。
  ================================================================ */
  var PLAN_ANCHOR = "2026-11-17";
  var OT_BOOKS = [["创世纪",50],["出埃及记",40],["利未记",27],["民数记",36],["申命记",34],["约书亚记",24],["士师记",21],["路得记",4],["撒母耳记上",31],["撒母耳记下",24],["列王纪上",22],["列王纪下",25],["历代志上",29],["历代志下",36],["以斯拉记",10],["尼希米记",13],["以斯帖记",10],["约伯记",42],["诗篇",150],["箴言",31],["传道书",12],["雅歌",8],["以赛亚书",66],["耶利米书",52],["耶利米哀歌",5],["以西结书",48],["但以理书",12],["何西阿书",14],["约珥书",3],["阿摩司书",9],["俄巴底亚书",1],["约拿书",4],["弥迦书",7],["那鸿书",3],["哈巴谷书",3],["西番雅书",3],["哈该书",2],["撒迦利亚书",14],["玛拉基书",4]];
  var NT_BOOKS = [["马太福音",28],["马可福音",16],["路加福音",24],["约翰福音",21],["使徒行传",28],["罗马书",16],["哥林多前书",16],["哥林多后书",13],["加拉太书",6],["以弗所书",6],["腓立比书",4],["歌罗西书",4],["帖撒罗尼迦前书",5],["帖撒罗尼迦后书",3],["提摩太前书",6],["提摩太后书",4],["提多书",3],["腓利门书",1],["希伯来书",13],["雅各书",5],["彼得前书",5],["彼得后书",3],["约翰一书",5],["约翰二书",1],["约翰三书",1],["犹大书",1],["启示录",22]];
  function chapterSeq(books) {
    var out = [];
    books.forEach(function (b) { for (var c = 1; c <= b[1]; c++) out.push([b[0], c]); });
    return out;
  }
  var OT_SEQ = chapterSeq(OT_BOOKS);   // 929 章
  var NT_SEQ = chapterSeq(NT_BOOKS);   // 260 章
  function seqIndex(seq, book, ch) {
    for (var i = 0; i < seq.length; i++) if (seq[i][0] === book && seq[i][1] === ch) return i;
    return 0;
  }
  var OT_ANCHOR_IDX = seqIndex(OT_SEQ, "耶利米哀歌", 5);
  var NT_ANCHOR_IDX = seqIndex(NT_SEQ, "以弗所书", 5);
  function utcDay(ds) {
    var p = ds.split("-");
    return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000;
  }
  function mod(n, m) { return ((n % m) + m) % m; }
  function computedReading(ds) {
    var diff = utcDay(ds) - utcDay(PLAN_ANCHOR);
    var oi = mod(OT_ANCHOR_IDX + diff, OT_SEQ.length);
    var ni = mod(NT_ANCHOR_IDX + diff, NT_SEQ.length);
    var ob = OT_SEQ[oi], nb = NT_SEQ[ni];
    var ref = ob[0] + " " + ob[1] + "章 · " + nb[0] + " " + nb[1] + "章";
    return {
      id: null, plan_id: null, read_date: ds, reference: ref, key_verse: "",
      ot: ob, nt: nb,
      otPos: oi + 1, ntPos: ni + 1, diff: diff,
      content: "今日经文：" + ob[0] + "第" + ob[1] + "章、" + nb[0] + "第" + nb[1] + "章（教会读经译本：新译本）。\n站内附新译本全文供阅读（阅读页可切换和合本 / 新改訳2017）；如未能加载，请配合纸本圣经或圣经 App 阅读。"
    };
  }

  async function loadToday() {
    var t = todayStr();
    try {
      var r = computedReading(t);
      S.todayReading = r;
      S.todayIsSample = false;
      S.planTitle = "每日读经计划";
      $("#todayPlanLabel").textContent = S.planTitle || "今日读经";
      $("#todayPassage").textContent = r.reference;
      var theme = $("#todayTheme");
      if (r.key_verse) { theme.textContent = ""; theme.style.display = "none"; }
      if (r.key_verse) {
        $("#verseText").textContent = "「" + r.key_verse + "」";
        $("#verseRef").textContent = "— " + r.reference;
      } else {
        var vc = $("#verseCard"); if (vc) vc.style.display = "none";
      }
      var cr = $("#composeRefText");
      if (cr) cr.textContent = r.reference + " · 今日经文";
      // 计划进度：按日期自动计算。圆环显示新约本轮进度（260 章一轮），
      // 旧约一轮 929 章，进度条下方文字里一并说明。
      var pct = Math.round(r.ntPos / NT_SEQ.length * 100);
      $("#ringPct").textContent = pct + "%";
      var ringLabel = document.querySelector(".ring-num span");
      if (ringLabel) ringLabel.textContent = "新约本轮进度";
      var arc = $("#ringArc");
      if (arc) arc.setAttribute("stroke-dashoffset", String(Math.round(201 * (1 - pct / 100))));
      if (r.diff >= 0) $("#todayPlanLabel").textContent = S.planTitle + " · 第 " + (r.diff + 1) + " 天";
      $("#planBarTitle").textContent = S.planTitle;
      $("#planBarNum").textContent = r.diff >= 0 ? ("第 " + (r.diff + 1) + " 天") : "";
      $("#planBarFill").style.width = pct + "%";
      $("#planBarDesc").textContent = "每天旧约 1 章、新约 1 章，按日期自动排定，今天读「" + r.reference + "」。新约本轮第 " + r.ntPos + " / 260 章，旧约本轮第 " + r.otPos + " / 929 章。";
    } catch (e) {
      S.todayIsSample = true;
      var tag2 = $("#sampleTag"); if (tag2) tag2.hidden = false;
    }
  }

  async function loadWeek() {
    try {
      var now = new Date();
      var monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      // 本周经文同样按日期自动计算（周一到周日）
      S.weekReadings = [];
      for (var wd = 0; wd < 7; wd++) {
        var day = new Date(monday); day.setDate(monday.getDate() + wd);
        S.weekReadings.push(computedReading(dateStr(day)));
      }
      var list = $("#weekList");
      if (!S.weekReadings.length) {
        list.innerHTML = '<p style="color:var(--muted);font-size:15px;padding:10px 2px">本周的经文还没有排定，请联系管理员或小组长。</p>';
        return;
      }
      var t = todayStr();
      list.innerHTML = S.weekReadings.map(function (r, i) {
        var done = !!S.myCheckins[r.read_date];
        var isToday = r.read_date === t;
        var d = new Date(r.read_date + "T00:00:00");
        var sub = (isToday ? "今天" : "周" + WEEK[d.getDay()]) + " · " + (d.getMonth() + 1) + "月" + d.getDate() + "日";
        var icon = done
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>';
        return '<button class="chapter' + (done ? " done" : "") + (isToday ? " now" : "") + '" data-open-reader data-ridx="' + i + '"' + (isToday ? ' data-today="1"' : "") + ">" +
          '<span class="c-ic">' + icon + "</span>" +
          '<span class="c-main"><span class="c-title">' + escapeHtml(r.reference) + '</span><span class="c-sub" style="display:block">' + sub + "</span></span>" +
          '<span class="c-state">' + (done ? "已读" : (isToday ? "去读 →" : "未开始")) + "</span></button>";
      }).join("");
    } catch (e) {
      $("#weekList").innerHTML = '<p style="color:var(--muted);font-size:15px;padding:10px 2px">本周经文加载失败，请检查网络。</p>';
    }
  }

  async function loadGroupToday() {
    var card = $("#groupCard");
    if (!S.profile || !S.profile.group_id) { if (card) card.style.display = "none"; return; }
    try {
      var members = await sb.from("profiles").select("id, display_name").eq("group_id", S.profile.group_id);
      if (members.error) throw members.error;
      var list = members.data || [];
      var t = todayStr();
      var cks = await sb.from("checkins").select("user_id").eq("checkin_date", t);
      if (cks.error) throw cks.error;
      var doneSet = {};
      (cks.data || []).forEach(function (c) { doneSet[c.user_id] = true; });
      var doneCount = 0;
      var avatars = list.map(function (m) {
        var on = !!doneSet[m.id];
        if (on) doneCount++;
        var nm = m.display_name || "友";
        return '<span class="avatar sm' + (on ? "" : " off") + '" style="background:' + colorFor(nm) + '">' + escapeHtml(nm.charAt(0)) + "</span>";
      }).join("");
      $("#groupCardTitle").textContent = (myGroupName() || "我的小组") + " · 今日读经";
      $("#groupCount").textContent = doneCount;
      $("#gAvatars").innerHTML = avatars + '<span class="g-count">' + doneCount + " / " + list.length + " 人" + (doneCount === 0 ? " · 还没人打卡，来做第一个" : "") + "</span>";
    } catch (e) {
      if (card) card.style.display = "none";
    }
  }

  async function reactionStats(targetType, ids) {
    var counts = {}, mine = {};
    if (!ids.length) return { counts: counts, mine: mine };
    var res = await sb.from("reactions").select("target_id, kind, user_id").eq("target_type", targetType).in("target_id", ids);
    if (res.error) throw res.error;
    (res.data || []).forEach(function (r) {
      var k = r.target_id + ":" + r.kind;
      counts[k] = (counts[k] || 0) + 1;
      if (r.user_id === S.user.id) mine[k] = true;
    });
    return { counts: counts, mine: mine };
  }

  async function loadShares() {
    try {
      var res = await sb.from("shares")
        .select("*, profiles(display_name), groups(name)")
        .order("created_at", { ascending: false }).limit(50);
      if (res.error) throw res.error;
      S.shares = res.data || [];
      var ids = S.shares.map(function (s) { return s.id; });
      var stats = { counts: {}, mine: {} };
      try { stats = await reactionStats("share", ids); } catch (e2) { /* 计数失败不挡列表 */ }
      var commentCounts = {};
      if (ids.length) {
        try {
          var cr = await sb.from("comments").select("share_id").in("share_id", ids);
          if (!cr.error) (cr.data || []).forEach(function (c) { commentCounts[c.share_id] = (commentCounts[c.share_id] || 0) + 1; });
        } catch (e3) { /* 同上 */ }
      }
      var html = S.shares.map(function (s) {
        var nm = (s.profiles && s.profiles.display_name) || "弟兄姐妹";
        var gn = (s.groups && s.groups.name) || myGroupName() || "";
        var cat = s.user_id === S.user.id ? "mine" : (s.visibility === "group" ? "group" : "all");
        return shareCard({
          id: s.id, cat: cat, vis: s.visibility,
          name: nm + (s.user_id === S.user.id ? "（我）" : ""),
          meta: (gn ? gn + " · " : "") + timeAgo(s.created_at),
          ref: s.reading_ref || "", body: s.content,
          amen: stats.counts[s.id + ":amen"] || 0, amenOn: !!stats.mine[s.id + ":amen"],
          comments: commentCounts[s.id] || 0, showPray: false
        });
      }).join("");
      $("#shareFeed").innerHTML = html || '<p style="text-align:center;color:var(--muted);font-size:15px;padding:34px 0">还没有人分享，来写第一篇吧。</p>';
      var first = $("#shareFeed .post");
      $("#todayShareSlot").innerHTML = first ? first.outerHTML : "";
      var mineCount = S.shares.filter(function (s) { return s.user_id === S.user.id; }).length;
      $("#statShares").textContent = mineCount;
    } catch (e) {
      $("#shareFeed").innerHTML = '<p style="text-align:center;color:var(--muted);font-size:15px;padding:34px 0">分享加载失败，请检查网络后下拉重试。</p>';
    }
  }

  async function loadPrayers() {
    try {
      var res = await sb.from("prayers")
        .select("*, profiles(display_name), groups(name)")
        .order("created_at", { ascending: false }).limit(50);
      if (res.error) throw res.error;
      S.prayers = res.data || [];
      var badge = $("#myPrayBadge");
      if (badge) {
        var myOpen = S.prayers.filter(function (p) { return p.user_id === S.user.id && p.status !== "answered"; }).length;
        badge.textContent = myOpen + " 件待祷告";
        badge.style.display = myOpen ? "" : "none";
      }
      var ids = S.prayers.map(function (p) { return p.id; });
      var stats = { counts: {}, mine: {} };
      try { stats = await reactionStats("prayer", ids); } catch (e2) { /* 同上 */ }
      function toCard(p) {
        var nm = (p.profiles && p.profiles.display_name) || "弟兄姐妹";
        var gn = (p.groups && p.groups.name) || "";
        return prayerCard({
          id: p.id, vis: p.visibility, anon: p.is_anonymous,
          name: nm + (p.user_id === S.user.id && !p.is_anonymous ? "（我）" : ""),
          meta: (gn ? gn + " · " : "") + timeAgo(p.created_at),
          body: p.content,
          prayed: stats.counts[p.id + ":prayed"] || 0, prayedOn: !!stats.mine[p.id + ":prayed"],
          amen: stats.counts[p.id + ":amen"] || 0, amenOn: !!stats.mine[p.id + ":amen"],
          mine: p.user_id === S.user.id, status: p.status
        });
      }
      var open = S.prayers.filter(function (p) { return p.status !== "answered"; });
      var answered = S.prayers.filter(function (p) { return p.status === "answered"; });
      $("#prayFeed").innerHTML = open.map(toCard).join("") ||
        '<p style="text-align:center;color:var(--muted);font-size:15px;padding:26px 0">祷告墙上还没有事项，点右下角 + 发起第一条代祷。</p>';
      var demoCard = $("#answeredDemoCard");
      if (demoCard) demoCard.style.display = "none";
      $("#answeredFeed").innerHTML = answered.map(toCard).join("") ||
        '<p style="color:var(--muted);font-size:14.5px;padding:4px 2px">暂时还没有已蒙应允的见证。</p>';
    } catch (e) {
      $("#prayFeed").innerHTML = '<p style="text-align:center;color:var(--muted);font-size:15px;padding:26px 0">祷告墙加载失败，请检查网络。</p>';
    }
  }

  function fillMe() {
    var p = S.profile || {};
    var nm = p.display_name || "弟兄姐妹";
    $("#meName").textContent = nm;
    $("#meAvatar").textContent = nm.charAt(0);
    $("#meAvatar").style.background = colorFor(nm);
    var roleLabel = p.role === "admin" ? "管理员" : (p.role === "leader" ? "小组长" : "成员");
    $("#meMeta").textContent = (myGroupName() || "还没有选小组") + " · " + roleLabel;
    var gl = $("#meGroupLabel");
    if (gl) gl.textContent = "我的小组 · " + (myGroupName() || "未选择");
    var ab = $("#openAdminBtn");
    if (ab) ab.style.display = p.role === "admin" ? "" : "none";
    $$(".group-scope-name").forEach(function (el) { el.textContent = myGroupName() || "我的小组"; });
    var greet = $("#greetLine");
    if (greet) greet.textContent = greetingWord() + "，" + nm;
    refreshCheckinUI();
  }

  async function loadAll() {
    await loadGroups().catch(function () { S.groups = []; });
    await loadMyCheckins().catch(function () { S.myCheckins = {}; });
    fillMe();
    buildCalendar();
    await loadToday();
    refreshCheckinUI();
    loadWeek();
    loadGroupToday();
    loadShares();
    loadPrayers();
    loadNotes();
    loadHighlights();
  }

  /* ================================================================
     正式模式：登录（用户名 + 密码）与完善资料
     用户名账号在 Auth 里以 username@church.local 的内部邮箱形式
     存在，全程不发邮件；登录框输入真实邮箱 + 密码也可以
     （管理员早先用邮箱注册的账号，设过密码后可用）。
  ================================================================ */
  var gate = $("#authGate");
  function authMsg(msg) { var el = $("#authMsg"); if (el) el.textContent = msg || ""; }
  function showGate(step) {
    if (!gate) return;
    gate.hidden = false;
    $("#authStepLogin").hidden = step !== "login";
    $("#authStepRegister").hidden = step !== "register";
    $("#authStepProfile").hidden = step !== "profile";
    var ina = $("#authStepInactive"); if (ina) ina.hidden = step !== "inactive";
    fab.classList.remove("show");
  }
  function hideGate() { if (gate) gate.hidden = true; }

  var USER_DOMAIN = "church.local";
  function accountEmail(id) {
    id = (id || "").trim();
    return id.indexOf("@") >= 0 ? id : id.toLowerCase() + "@" + USER_DOMAIN;
  }
  function authError(e, fallback) {
    if (window.console) console.warn("auth error", e);
    var raw = (e && e.message) || "";
    if (/invalid login credentials/i.test(raw)) return "用户名或密码不正确，请重新输入。";
    if (/email not confirmed/i.test(raw)) return "这个账号还没有开通，请联系管理员处理。";
    if (/already registered/i.test(raw)) return "这个用户名已经被注册了，换一个试试，或直接去登录。";
    if (/password should be at least/i.test(raw)) return "密码太短了，至少要 6 位。";
    if (/unable to validate email|invalid format/i.test(raw)) return "用户名格式不对：只能用小写字母、数字和下划线，3-20 位。";
    return fallback + (raw ? "（" + raw + "）" : "");
  }
  $("#gotoRegisterBtn").addEventListener("click", function () { authMsg(""); showGate("register"); });
  $("#gotoLoginBtn").addEventListener("click", function () { authMsg(""); showGate("login"); });
  async function doLogin() {
    var id = $("#loginId").value.trim();
    var pw = $("#loginPw").value;
    if (!id) { authMsg("请先填写用户名。"); return; }
    if (!pw) { authMsg("请填写密码。"); return; }
    authMsg("正在登录，请稍等……");
    try {
      var res = await sb.auth.signInWithPassword({ email: accountEmail(id), password: pw });
      if (res.error) throw res.error;
      authMsg("");
      if (res.data && res.data.user) afterLogin(res.data.user);
    } catch (e) { authMsg(authError(e, "登录没有成功，请检查网络后再试一次。")); }
  }
  $("#loginBtn").addEventListener("click", doLogin);
  $$(".pw-toggle").forEach(function (cb) {
    cb.addEventListener("change", function () {
      cb.getAttribute("data-pw-targets").split(",").forEach(function (id) {
        var inp = document.getElementById(id);
        if (inp) inp.type = cb.checked ? "text" : "password";
      });
    });
  });
  $("#loginPw").addEventListener("keydown", function (ev) { if (ev.key === "Enter") doLogin(); });
  async function doRegister() {
    var uname = $("#regName").value.trim().toLowerCase();
    var pw = $("#regPw").value, pw2 = $("#regPw2").value;
    if (!/^[a-z0-9_]{3,20}$/.test(uname)) { authMsg("用户名只能用小写字母、数字和下划线，3-20 位（例如 chen_anqi）。"); return; }
    if (pw.length < 6) { authMsg("密码至少要 6 位。"); return; }
    if (pw !== pw2) { authMsg("两次输入的密码不一样，请重新输入。"); return; }
    authMsg("正在注册，请稍等……");
    try {
      var res = await sb.auth.signUp({
        email: uname + "@" + USER_DOMAIN, password: pw,
        options: { data: { username: uname } }
      });
      if (res.error) throw res.error;
      if (res.data && res.data.session && res.data.user) {
        authMsg("");
        toast("注册成功，欢迎你");
        afterLogin(res.data.user);
      } else if (res.data && res.data.user && (res.data.user.identities || []).length === 0) {
        authMsg("这个用户名已经被注册了，换一个试试，或直接去登录。");
      } else {
        authMsg("注册已提交，但网站后台还没关掉「邮箱确认」，新账号暂时登不进来。请告诉管理员：到 Supabase 的 Authentication → Providers → Email 关掉 Confirm email，你就能直接登录了。");
      }
    } catch (e) { authMsg(authError(e, "注册没有成功，请检查网络后再试一次。")); }
  }
  $("#registerBtn").addEventListener("click", doRegister);
  $("#regPw2").addEventListener("keydown", function (ev) { if (ev.key === "Enter") doRegister(); });

  async function loadProfileRow() {
    var res = await sb.from("profiles").select("*").eq("id", S.user.id).limit(1);
    if (res.error) throw res.error;
    return (res.data || [])[0] || null;
  }
  async function showProfileSetup(profile) {
    try { await loadGroups(); } catch (e) { S.groups = []; }
    var sel = $("#profileGroup");
    sel.innerHTML = S.groups.map(function (g) {
      return '<option value="' + g.id + '">' + escapeHtml(g.name) + "</option>";
    }).join("") || '<option value="">（暂无小组，请联系管理员）</option>';
    if (profile) {
      if (profile.display_name) $("#profileName").value = profile.display_name;
      if (profile.group_id) sel.value = profile.group_id;
    }
    showGate("profile");
  }
  $("#saveProfileBtn").addEventListener("click", async function () {
    var name = $("#profileName").value.trim();
    var gid = $("#profileGroup").value || null;
    if (!name) { authMsg("请填写你的姓名，弟兄姐妹好认得你。"); return; }
    if (!gid) { authMsg("请选择你所在的小组；如果列表是空的，请联系管理员先建小组。"); return; }
    authMsg("正在保存……");
    try {
      var existing = S.profile;
      var res;
      if (existing) {
        res = await sb.from("profiles").update({ display_name: name, group_id: gid }).eq("id", S.user.id);
      } else {
        res = await sb.from("profiles").insert({ id: S.user.id, display_name: name, group_id: gid });
      }
      if (res.error) throw res.error;
      S.profile = await loadProfileRow();
      authMsg("");
      hideGate();
      toast("欢迎你，" + name);
      loadAll();
    } catch (e) {
      authMsg("保存没有成功，请检查网络后再试一次。");
    }
  });

  async function afterLogin(user) {
    if (S.booted) return;
    S.booted = true;
    S.user = user;
    try {
      S.profile = await loadProfileRow();
    } catch (e) { S.profile = null; }
    var uname = user.user_metadata && user.user_metadata.username;
    if (uname && S.profile && !S.profile.username) {
      try {
        var up = await sb.from("profiles").update({ username: uname }).eq("id", user.id);
        if (!up.error) S.profile.username = uname;
      } catch (e) { /* 补写用户名失败不影响使用 */ }
    }
    if (S.profile && S.profile.is_active === false) {
      showGate("inactive");
      return;
    }
    if (!S.profile || !S.profile.display_name || !S.profile.group_id) {
      showProfileSetup(S.profile);
      return;
    }
    hideGate();
    loadAll();
  }

  $("#signOutBtn").addEventListener("click", async function () {
    try { await sb.auth.signOut(); } catch (e) { /* 忽略 */ }
    S.user = null; S.profile = null; S.booted = false;
    toast("已退出登录");
    showGate("login");
  });

  async function initFormal() {
    showGate("login");
    try {
      var res = await sb.auth.getSession();
      var session = res.data && res.data.session;
      if (session && session.user) afterLogin(session.user);
    } catch (e) { /* 停在登录页即可 */ }
    sb.auth.onAuthStateChange(function (event, session) {
      if (session && session.user) {
        if (!S.user) afterLogin(session.user);
      } else if (event === "SIGNED_OUT") {
        S.user = null; S.profile = null; S.booted = false;
        showGate("login");
      }
    });
  }

  /* ================================================================
     演示模式：与原型一致的本地演示
  ================================================================ */
  function initDemo() {
    setDateLine();
    // 演示连续天数：今天之前连续 23 天（与原型展示一致）
    var d = new Date();
    for (var i = 1; i <= 23; i++) { var x = new Date(d); x.setDate(d.getDate() - i); S.myCheckins[dateStr(x)] = true; }
    buildCalendar();
    var rt = $("#readerTip"); if (rt) rt.textContent = "演示模式 · 正式版中点经文可以划线、写笔记";
    $("#shareFeed").innerHTML = demoPosts.map(shareCard).join("");
    $("#todayShareSlot").innerHTML = shareCard(demoPosts[0]);
    $("#prayFeed").innerHTML = demoPrayers.map(prayerCard).join("");
  }

  /* ---------------- init ---------------- */
  setDateLine();
  $$("[data-checkin]").forEach(function (b) { if (!b.getAttribute("data-orig")) b.setAttribute("data-orig", b.textContent); });
  if (FORMAL) {
    var so = $("#signOutBtn"); if (so) so.style.display = "";
    var vs = $("#verSwitch"); if (vs) { vs.style.display = ""; syncVerSwitch(); }
    var nf = $("#noteForm"); if (nf) nf.style.display = "";
    var nse = $("#noteSearch"); if (nse) nse.style.display = "";
    var dc = $("#demoNoteCard"); if (dc) dc.style.display = "none";
    initFormal();
  } else {
    initDemo();
  }
})();
