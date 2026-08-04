/* Push notifications for the admin.
 *
 * Deliberately tiny. A service worker sits between the browser and every
 * request for this origin once it is installed, so anything clever in
 * here is something that can break the whole site from a cache. This one
 * does not touch fetch at all: it only receives pushes and opens a
 * window when one is clicked.
 */

self.addEventListener("install", () => {
  // Take over straight away rather than waiting for every tab to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // A push with an unreadable body still means something happened, so
    // it is worth showing rather than dropping.
  }

  const title = data.title || "Lowcountry Business Spotlight";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      // Same tag replaces rather than stacks, so five artwork uploads
      // leave one notification saying the latest, not five to dismiss.
      tag: data.tag || "lbs",
      renotify: true,
      data: { url: data.url || "/admin" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Focus a tab that is already on the site instead of opening a
        // third copy of the admin.
        for (const client of clients) {
          if (client.url.includes("/admin") && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
