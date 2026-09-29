/* Service Worker: بيخلي الموقع "قابل للتثبيت" (PWA)، وكمان بيسرّع الزيارات
   اللي بعد الأولى للعميل الراجع. الإستراتيجية: صفحات الـ HTML وملفات الكود
   (CSS/JS) بتيجي من النت على طول دايمًا — عشان أي تحديث تعمله يوصل العميل
   فورًا من غير ما "يعلق" على نسخة قديمة. أما الصور والخطوط (اللي بتاخد
   المساحة والوقت الحقيقي، ونادرًا ما تتغيّر) فبتتجاب من النسخة المحفوظة على
   طول (سريع جدًا)، وفي نفس الوقت بيتحقق من النت في الخلفية ويحدّث النسخة
   المحفوظة لأي زيارة جايه. */

const CACHE_NAME = "farahat-static-v1";
// الصور والخطوط بس — دي اللي بتاخد المساحة والوقت الحقيقي، ونادرًا ما
// تتغيّر. الكود (CSS/JS) سيبناه دايمًا من النت على طول، عشان أي تحديث
// تعمله على الموقع يوصل للعميل من أول زيارة من غير أي نسخة قديمة محفوظة.
const STATIC_EXTENSIONS = /\.(png|jpe?g|webp|svg|woff2?)$/i;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  // بس ملفاتنا الثابتة من نفس الموقع، وبعيد عن لوحة التحكم بالكامل (عشان أي
  // تحديث لكود الداشبورد يوصلك فورًا من غير أي تأخير أو نسخة قديمة محفوظة)
  if (url.origin !== self.location.origin || !STATIC_EXTENSIONS.test(url.pathname)) return;
  if (url.pathname.includes("/admin/")) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    const networkFetch = fetch(req)
      .then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => cached);
    return cached || networkFetch;
  })());
});
