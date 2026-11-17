/* 教会读经 · 服务工作线程
   只负责推送通知的接收与点击，不缓存页面（避免大家看到旧版本）。 */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });

self.addEventListener("push", function (e) {
  var data = { title: "读经提醒", body: "今天的经文已经备好，点开开始读经吧。", url: "./" };
  try {
    var j = e.data ? e.data.json() : null;
    if (j) { data.title = j.title || data.title; data.body = j.body || data.body; data.url = j.url || data.url; }
  } catch (err) { /* 用默认文案 */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { url: data.url }
    })
  );
});

self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if ("focus" in list[i]) return list[i].focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
