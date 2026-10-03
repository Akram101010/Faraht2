/* ==========================================================================
   ui-app.js — إحساس "التطبيق" على الموقع
   --------------------------------------------------------------------------
   1) شريط تنقل سفلي على الموبايل (الرئيسية، الأقسام، البحث، العروض، السلة)
   2) بانر "ثبّت تطبيق فرحات" + شرح الآيفون جوّه الموقع
   3) صفحة تفاصيل المنتج (صورة كبيرة، شارك على واتساب، منتجات مشابهة)
   4) المفضلة (قلب على كل منتج + قايمة المفضلة)
   الملف ده بيشتغل فوق app.js ومابيغيّرش في منطق السلة أو الأسعار، بيستخدم
   نفس الدوال (buildCard وغيرها) عشان كل حاجة تفضل متزامنة.
   ========================================================================== */

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* تجاهل */ } },
  };
  const isMobile = () => window.matchMedia("(max-width: 720px)").matches;
  const svg = (inner, extra = "") =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${inner}</svg>`;

  const ICON = {
    home: svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>'),
    grid: svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>'),
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
    tag: svg('<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7.2" cy="7.2" r="1.3" fill="currentColor" stroke="none"/>'),
    cart: svg('<path d="M3 3h2l2.4 12.4a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L22 8H6"/><circle cx="9" cy="21" r="1.4" fill="currentColor" stroke="none"/><circle cx="18" cy="21" r="1.4" fill="currentColor" stroke="none"/>'),
    heart: svg('<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>'),
    share: svg('<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1"/>'),
    plusSquare: svg('<rect x="3" y="3" width="18" height="18" rx="4.5"/><path d="M12 8v8M8 12h8"/>'),
    link: svg('<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>'),
    zoom: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M11 8v6M8 11h6"/>'),
    install: svg('<path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/>'),
    wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.72.45 3.4 1.31 4.89L2 22l5.35-1.4a9.9 9.9 0 0 0 4.69 1.19h.01c5.46 0 9.9-4.45 9.9-9.91C22 6.45 17.5 2 12.04 2zm5.8 14.14c-.24.68-1.4 1.3-1.93 1.38-.49.08-1.11.11-1.79-.11-.41-.13-.94-.31-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.55-1.16-2.96 0-1.4.73-2.09 1-2.38.24-.27.53-.33.7-.33h.5c.16 0 .38-.03.58.45.24.58.8 2 .87 2.14.07.14.11.31.02.5-.08.19-.13.31-.26.47-.13.16-.27.36-.39.48-.13.13-.26.27-.11.53.14.27.63 1.05 1.36 1.71.94.85 1.73 1.12 1.99 1.24.27.13.42.11.58-.06.16-.18.68-.79.86-1.06.19-.27.37-.22.62-.13.26.08 1.63.77 1.91.91.27.14.46.2.53.32.06.14.06.71-.19 1.39z"/></svg>',
  };

  const anyOverlayOpen = () =>
    !!document.querySelector(
      ".cart-overlay.open, .search-overlay.open, .sections-menu-overlay.open, .fs-overlay.open, .pd-lightbox.open"
    );

  /* ===================================================================
     1) شريط التنقل السفلي (موبايل بس — الـ CSS هو اللي بيظهره)
     =================================================================== */

  const bn = { el: null, items: {}, lastCount: 0 };

  function initBottomNav() {
    const defs = [
      { id: "home", label: "الرئيسية", icon: ICON.home },
      { id: "menu", label: "الأقسام", icon: ICON.grid },
      { id: "search", label: "البحث", icon: ICON.search },
      { id: "deals", label: "العروض", icon: ICON.tag },
      { id: "cart", label: "السلة", icon: ICON.cart },
    ];
    const nav = document.createElement("nav");
    nav.className = "bottom-nav";
    nav.id = "bottomNav";
    nav.setAttribute("aria-label", "التنقل الرئيسي");
    nav.innerHTML = defs
      .map(
        (d) => `
      <button type="button" class="bn-item" data-bn="${d.id}" aria-label="${d.label}">
        <span class="bn-ic">${d.icon}<b class="bn-badge" hidden>0</b><i class="bn-dot" hidden></i></span>
        <span class="bn-label">${d.label}</span>
      </button>`
      )
      .join("");
    document.body.appendChild(nav);
    bn.el = nav;
    defs.forEach((d) => (bn.items[d.id] = $(`[data-bn="${d.id}"]`, nav)));

    bn.items.home.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    bn.items.menu.addEventListener("click", () => openSectionsMenu());
    bn.items.search.addEventListener("click", () => openSearch());
    bn.items.deals.addEventListener("click", () => {
      const d = document.getElementById("deals");
      if (d) d.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    bn.items.cart.addEventListener("click", () => openCart());

    // دايمًا فيه واحد "نشط" زي التطبيقات الحقيقية
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; updateNavActive(); });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    updateNavActive();

    document.addEventListener("farahat:cart", (e) => updateNavCart(e.detail.count, e.detail.total));
    updateNavCart(typeof cartCount === "function" ? cartCount() : 0, typeof cartTotalValue === "function" ? cartTotalValue() : 0, true);

    document.addEventListener("farahat:deals", (e) => setDealsDot(e.detail.count > 0));
    const slider = document.getElementById("dealsSlider");
    setDealsDot(!!slider && !slider.hidden);
  }

  function updateNavActive() {
    if (!bn.el) return;
    let active = "menu";
    if (window.scrollY < 140) active = "home";
    else {
      const d = document.getElementById("deals");
      if (d) {
        const r = d.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.38) active = "deals";
      }
    }
    Object.entries(bn.items).forEach(([id, el]) => el.classList.toggle("active", id === active));
  }

  function updateNavCart(count, total, silent) {
    const item = bn.items.cart;
    if (!item) return;
    const badge = $(".bn-badge", item);
    const label = $(".bn-label", item);
    badge.hidden = count <= 0;
    badge.textContent = count;
    label.textContent = count > 0 ? `${money(Math.round(total))} ج.م` : "السلة";
    label.classList.toggle("is-total", count > 0);
    if (!silent && count > bn.lastCount) {
      item.classList.remove("bump");
      void item.offsetWidth;
      item.classList.add("bump");
    }
    bn.lastCount = count;
    const pdCount = $(".pd-cart-count");
    if (pdCount) { pdCount.hidden = count <= 0; pdCount.textContent = count; }
  }

  function setDealsDot(on) {
    if (bn.items.deals) $(".bn-dot", bn.items.deals).hidden = !on;
  }

  /* ===================================================================
     2) تثبيت التطبيق (PWA) — أندرويد بالبانر، آيفون بشرح جوّه الموقع
     =================================================================== */

  const INSTALL = { deferred: null, banner: null, iosOverlay: null, shown: false, retries: 0 };
  const DISMISS_KEY = "farahat_install_dismissed";
  const DISMISS_DAYS = 7;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const canInstall = () => !isStandalone() && !!(INSTALL.deferred || isIOS());
  const recentlyDismissed = () => {
    const t = store.get(DISMISS_KEY, 0);
    return t && Date.now() - t < DISMISS_DAYS * 86400000;
  };

  function initInstall() {
    // البانر
    const banner = document.createElement("div");
    banner.className = "install-banner";
    banner.id = "installBanner";
    banner.hidden = true;
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "تثبيت التطبيق");
    banner.innerHTML = `
      <img class="ib-icon" src="images/pwa/icon-192.png" alt="" width="46" height="46">
      <div class="ib-text">
        <strong>ثبّت تطبيق فرحات</strong>
        <span>أسرع وأسهل، وتطلب من شاشتك الرئيسية على طول</span>
      </div>
      <button type="button" class="ib-install"></button>
      <button type="button" class="ib-close" aria-label="مش دلوقتي">✕</button>`;
    document.body.appendChild(banner);
    INSTALL.banner = banner;
    $(".ib-install", banner).addEventListener("click", startInstall);
    $(".ib-close", banner).addEventListener("click", () => {
      store.set(DISMISS_KEY, Date.now());
      hideBanner();
    });

    // شرح الآيفون
    const ov = document.createElement("div");
    ov.className = "fs-overlay ios-overlay";
    ov.id = "iosOverlay";
    ov.innerHTML = `
      <div class="fs-sheet ios-sheet" role="dialog" aria-modal="true" aria-label="تثبيت فرحات على الآيفون">
        <div class="fs-grip"></div>
        <button type="button" class="fs-close" aria-label="إغلاق">✕</button>
        <div class="ios-head">
          <img src="images/pwa/icon-192.png" alt="" width="64" height="64">
          <h3>ثبّت فرحات على الآيفون</h3>
          <p>3 خطوات بسيطة، وتلاقي أيقونة فرحات على شاشتك زي أي تطبيق.</p>
        </div>
        <ol class="ios-steps">
          <li><span class="ios-n">1</span><div class="ios-t"><strong>دوس على زرار المشاركة</strong><small>المربع اللي فيه سهم لفوق، موجود في شريط سفاري</small></div><span class="ios-i">${ICON.share}</span></li>
          <li><span class="ios-n">2</span><div class="ios-t"><strong>اختار "Add to Home Screen"</strong><small>"إضافة إلى الشاشة الرئيسية"، اسحب لتحت لو مش ظاهرة</small></div><span class="ios-i">${ICON.plusSquare}</span></li>
          <li><span class="ios-n">3</span><div class="ios-t"><strong>دوس "Add" وخلاص</strong><small>هتلاقي أيقونة فرحات على شاشتك الرئيسية</small></div><span class="ios-i ios-ok">✓</span></li>
        </ol>
        <div class="ios-arrow" aria-hidden="true">${svg('<path d="M12 5v14"/><path d="M6 13l6 6 6-6"/>')}<span>زرار المشاركة تحت في سفاري</span></div>
      </div>`;
    document.body.appendChild(ov);
    INSTALL.iosOverlay = ov;
    $(".fs-close", ov).addEventListener("click", closeIosGuide);
    ov.addEventListener("click", (e) => { if (e.target === ov) closeIosGuide(); });

    // زراير ثابتة (منيو الأقسام + الفوتر)
    const menuPanel = $(".sections-menu-panel");
    if (menuPanel) {
      const extra = document.createElement("div");
      extra.className = "smp-extra";
      extra.innerHTML = `<button type="button" class="install-link" data-install-btn hidden>${ICON.install}<span>ثبّت تطبيق فرحات</span></button>`;
      menuPanel.appendChild(extra);
    }
    const social = $(".footer-brand .social-links");
    if (social) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "install-link install-link-footer";
      btn.setAttribute("data-install-btn", "");
      btn.hidden = true;
      btn.innerHTML = `${ICON.install}<span>ثبّت تطبيق فرحات</span>`;
      social.after(btn);
    }
    $$("[data-install-btn]").forEach((b) => b.addEventListener("click", () => { closeSectionsMenuSafe(); startInstall(); }));

    // أندرويد / كروم: نمسك إشارة التثبيت ونعرض البانر بتاعنا
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      INSTALL.deferred = e;
      refreshInstallButtons();
      scheduleBanner(35000);
    });
    window.addEventListener("appinstalled", () => {
      INSTALL.deferred = null;
      hideBanner();
      refreshInstallButtons();
      store.set(DISMISS_KEY, Date.now() + 365 * 86400000);
      if (typeof showToast === "function") showToast("🎉 اتثبّت تطبيق فرحات على جهازك");
    });

    if (isIOS()) scheduleBanner(35000);
    refreshInstallButtons();

    // أول إضافة للسلة = لحظة مناسبة نعرض فيها البانر
    let firstAdd = true;
    document.addEventListener("farahat:cart", (e) => {
      if (firstAdd && e.detail.count > 0) {
        firstAdd = false;
        scheduleBanner(1600);
      }
    });
  }

  function closeSectionsMenuSafe() {
    if (typeof closeSectionsMenu === "function") closeSectionsMenu();
  }

  function refreshInstallButtons() {
    const on = canInstall();
    $$("[data-install-btn]").forEach((b) => (b.hidden = !on));
    const extra = $(".smp-extra");
    if (extra) extra.hidden = !on;
    const btn = INSTALL.banner && $(".ib-install", INSTALL.banner);
    if (btn) btn.textContent = INSTALL.deferred ? "ثبّت" : "شوف الطريقة";
  }

  function scheduleBanner(delay) {
    if (INSTALL.shown) return;
    clearTimeout(INSTALL.timer);
    INSTALL.timer = setTimeout(tryShowBanner, delay);
  }

  function tryShowBanner() {
    if (INSTALL.shown || !canInstall() || recentlyDismissed()) return;
    if (anyOverlayOpen() && INSTALL.retries < 6) {
      INSTALL.retries++;
      INSTALL.timer = setTimeout(tryShowBanner, 4000);
      return;
    }
    INSTALL.shown = true;
    refreshInstallButtons();
    INSTALL.banner.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => INSTALL.banner.classList.add("show")));
  }

  function hideBanner() {
    if (!INSTALL.banner) return;
    INSTALL.banner.classList.remove("show");
    setTimeout(() => { INSTALL.banner.hidden = true; }, 600);
  }

  async function startInstall() {
    if (INSTALL.deferred) {
      const ev = INSTALL.deferred;
      hideBanner();
      try {
        await ev.prompt();
        await ev.userChoice;
      } catch (e) { /* تجاهل */ }
      INSTALL.deferred = null;
      refreshInstallButtons();
    } else if (isIOS()) {
      hideBanner();
      openIosGuide();
    }
  }

  function openIosGuide() { INSTALL.iosOverlay.classList.add("open"); document.documentElement.classList.add("sheet-lock"); }
  function closeIosGuide() {
    INSTALL.iosOverlay.classList.remove("open");
    if (!anyOverlayOpen()) document.documentElement.classList.remove("sheet-lock");
  }

  /* ===================================================================
     4) المفضلة
     =================================================================== */

  const FAV_KEY = "farahat_favs_v1";
  let favs = new Set(store.get(FAV_KEY, []));
  const favSheet = { el: null };

  const favKey = (subId, name) => `${subId}::${name}`;
  function parseKey(key) {
    const i = key.indexOf("::");
    return i < 1 ? null : { subId: key.slice(0, i), name: key.slice(i + 2) };
  }
  function resolveKey(key) {
    const p = parseKey(key);
    if (!p) return null;
    const sub = findSubById(p.subId);
    const item = sub && (sub.items || []).find((i) => i.name === p.name);
    return item ? { sub, item } : null;
  }

  function toggleFav(key, btn) {
    const adding = !favs.has(key);
    if (adding) favs.add(key); else favs.delete(key);
    store.set(FAV_KEY, [...favs]);
    updateFavUI();
    if (btn) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); }
    if (typeof showToast === "function") showToast(adding ? "❤️ اتضاف للمفضلة" : "اتشال من المفضلة");
  }

  function updateFavUI() {
    $$(".fav-btn[data-fav-key]").forEach((b) => {
      const on = favs.has(b.dataset.favKey);
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", on ? "شيل من المفضلة" : "أضف للمفضلة");
    });
    const count = [...favs].filter((k) => resolveKey(k)).length;
    const badge = $("#favCount");
    if (badge) { badge.hidden = count === 0; badge.textContent = count; }
    if (favSheet.el && favSheet.el.classList.contains("open")) renderFavSheet();
  }

  // بنحط القلب على أي كارت منتج جديد (بيتبني من app.js في أكتر من مكان)
  function decorateCard(card) {
    if (card.dataset.favReady || card.classList.contains("card-in-sheet")) return;
    const sid = card.dataset.searchId || "";
    if (sid.startsWith("sheet::")) return;
    const key = sid.replace(/^deal::/, "");
    const parsed = parseKey(key);
    if (!parsed || parsed.subId === "deals") return; // عروض مستقلة مش في الكتالوج
    const media = $(".card-media", card);
    if (!media) return;
    card.dataset.favReady = "1";
    card.dataset.pdKey = key;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fav-btn";
    btn.dataset.favKey = key;
    btn.innerHTML = ICON.heart;
    media.appendChild(btn);
    if (favs.has(key)) { btn.classList.add("active"); btn.setAttribute("aria-pressed", "true"); }
  }

  function decorateAll(root = document) {
    $$(".card", root).forEach(decorateCard);
    if (root.matches && root.matches(".card")) decorateCard(root);
  }

  function initFavorites() {
    decorateAll();
    new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => { if (n.nodeType === 1) decorateAll(n); });
      }
    }).observe(document.body, { childList: true, subtree: true });

    const ov = document.createElement("div");
    ov.className = "fs-overlay fav-overlay";
    ov.id = "favOverlay";
    ov.innerHTML = `
      <div class="fs-sheet fav-sheet" role="dialog" aria-modal="true" aria-label="المفضلة">
        <div class="fs-grip"></div>
        <button type="button" class="fs-close" aria-label="إغلاق">✕</button>
        <div class="fav-head"><span class="fav-head-ic">${ICON.heart}</span><h3>المفضلة</h3><small id="favSub"></small></div>
        <div class="fav-body" id="favBody"></div>
      </div>`;
    document.body.appendChild(ov);
    favSheet.el = ov;
    $(".fs-close", ov).addEventListener("click", closeFavSheet);
    ov.addEventListener("click", (e) => { if (e.target === ov) closeFavSheet(); });
    $("#favHeaderBtn").addEventListener("click", openFavSheet);
    updateFavUI();
  }

  function renderFavSheet() {
    const body = $("#favBody");
    const rows = [...favs].map((k) => ({ key: k, r: resolveKey(k) })).filter((x) => x.r);
    $("#favSub").textContent = rows.length ? `${money(rows.length)} منتج` : "";
    if (!rows.length) {
      body.innerHTML = `<div class="fav-empty"><span>${ICON.heart}</span><strong>لسه مفيش منتجات في المفضلة</strong><p>دوس على القلب في أي منتج وهتلاقيه هنا، تقدر ترجعله بسهولة وقت ما تحب.</p></div>`;
      return;
    }
    body.innerHTML = `<div class="fav-grid">${rows
      .map(({ key, r }) => {
        const { sub, item } = r;
        const price = item.soldOut ? "نفد مؤقتًا" : item.customBox ? "كوّن علبتك" : `${money(Math.round(effectivePrice(item, null)))} ج.م`;
        const media = item.img ? `<img src="${item.img}" alt="${item.name}" loading="lazy">` : `<span class="ph">${sub.icon || "🛍️"}</span>`;
        return `<div class="fav-tile" data-open="${key.replace(/"/g, "&quot;")}">
          <div class="ft-media">${media}<button type="button" class="fav-btn active" data-fav-key="${key.replace(/"/g, "&quot;")}" aria-pressed="true" aria-label="شيل من المفضلة">${ICON.heart}</button></div>
          <div class="ft-name">${item.name}</div>
          <div class="ft-price">${price}</div>
        </div>`;
      })
      .join("")}</div>`;
  }

  function openFavSheet() {
    renderFavSheet();
    favSheet.el.classList.add("open");
    document.documentElement.classList.add("sheet-lock");
  }
  function closeFavSheet() {
    favSheet.el.classList.remove("open");
    if (!anyOverlayOpen()) document.documentElement.classList.remove("sheet-lock");
  }

  /* ===================================================================
     3) صفحة تفاصيل المنتج
     =================================================================== */

  const PD = { overlay: null, sheet: null, open: false, sub: null, item: null, lightbox: null, pending: null };

  function pdUrl(subId, name) {
    return `${location.origin}${location.pathname}#p=${encodeURIComponent(`${subId}::${name}`)}`;
  }
  function parseHash() {
    const m = location.hash.match(/^#p=(.+)$/);
    if (!m) return null;
    try {
      const v = decodeURIComponent(m[1]);
      const i = v.indexOf("::");
      return i < 1 ? null : { sub: v.slice(0, i), name: v.slice(i + 2) };
    } catch (e) { return null; }
  }

  function initProductSheet() {
    const ov = document.createElement("div");
    ov.className = "fs-overlay pd-overlay";
    ov.id = "pdOverlay";
    ov.setAttribute("aria-hidden", "true");
    ov.innerHTML = `
      <div class="fs-sheet pd-sheet" role="dialog" aria-modal="true" aria-label="تفاصيل المنتج">
        <div class="pd-drag"><div class="fs-grip"></div></div>
        <div class="pd-topbar">
          <button type="button" class="pd-btn pd-close" aria-label="إغلاق">✕</button>
          <div class="pd-top-actions">
            <button type="button" class="pd-btn pd-cartbtn" aria-label="السلة">${ICON.cart}<b class="pd-cart-count" hidden>0</b></button>
            <button type="button" class="pd-btn fav-btn pd-fav" data-fav-key="" aria-label="أضف للمفضلة">${ICON.heart}</button>
          </div>
        </div>
        <div class="pd-scroll">
          <div class="pd-media" id="pdMedia"></div>
          <div class="pd-info">
            <span class="pd-path" id="pdPath"></span>
            <h2 class="pd-name" id="pdName"></h2>
            <div class="pd-slot" id="pdSlot"></div>
            <p class="pd-desc" id="pdDesc" hidden></p>
            <div class="pd-share">
              <a class="pd-wa" id="pdWa" href="#" target="_blank" rel="noopener">${ICON.wa}<span>شارك على واتساب</span></a>
              <button type="button" class="pd-copy" id="pdCopy" aria-label="نسخ الرابط">${ICON.link}</button>
            </div>
            <div class="pd-sim-wrap" id="pdSimWrap" hidden>
              <h3 class="pd-sim-title">منتجات مشابهة</h3>
              <div class="pd-sim" id="pdSim"></div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(ov);
    PD.overlay = ov;
    PD.sheet = $(".pd-sheet", ov);

    const lb = document.createElement("div");
    lb.className = "pd-lightbox";
    lb.innerHTML = `<button type="button" class="pd-lb-close" aria-label="إغلاق الصورة">✕</button><img alt="">`;
    document.body.appendChild(lb);
    PD.lightbox = lb;
    lb.addEventListener("click", closeLightbox);

    $(".pd-close", ov).addEventListener("click", () => closeProduct());
    ov.addEventListener("click", (e) => { if (e.target === ov) closeProduct(); });
    $(".pd-cartbtn", ov).addEventListener("click", () => { closeProduct(); setTimeout(() => openCart(), 120); });
    $("#pdMedia").addEventListener("click", () => {
      const img = $("#pdMedia img");
      if (!img) return;
      $("img", lb).src = img.src;
      lb.classList.add("open");
    });
    $("#pdCopy").addEventListener("click", copyProductLink);

    setupSwipeToClose();

    // فتح المنتج من أي كارت (الصورة أو الاسم)
    document.addEventListener("click", (e) => {
      const heart = e.target.closest(".fav-btn");
      if (heart) {
        e.preventDefault();
        e.stopPropagation();
        const key = heart.dataset.favKey;
        if (key) toggleFav(key, heart);
        return;
      }
      const tile = e.target.closest(".fav-tile");
      if (tile && !e.target.closest(".fav-btn")) {
        const p = parseKey(tile.dataset.open);
        if (p) openProduct(p.subId, p.name);
        return;
      }
      const hit = e.target.closest(".card .card-media, .card h3");
      if (!hit) return;
      const card = hit.closest(".card");
      if (!card || card.classList.contains("card-in-sheet")) return;
      const key = card.dataset.pdKey || (card.dataset.searchId || "").replace(/^deal::/, "");
      const p = parseKey(key);
      if (p && p.subId !== "deals") openProduct(p.subId, p.name);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (PD.lightbox.classList.contains("open")) closeLightbox();
      else if (PD.open) closeProduct();
    });

    window.addEventListener("popstate", () => {
      const p = parseHash();
      if (p) {
        if (!PD.open || !PD.item || PD.item.name !== p.name) openProduct(p.sub, p.name, { push: false });
      } else if (PD.open) {
        closeProductUI();
      }
    });

    // لو الكتالوج اتحدّث من Firebase والمنتج مفتوح أو فيه لينك مستني
    document.addEventListener("farahat:catalog", () => {
      updateFavUI();
      if (PD.pending) {
        const p = PD.pending;
        if (openProduct(p.sub, p.name, { push: false })) PD.pending = null;
      } else if (PD.open && PD.sub && PD.item) {
        const sub = findSubById(PD.sub.id);
        const item = sub && (sub.items || []).find((i) => i.name === PD.item.name);
        if (item) renderProduct(sub, item);
        else closeProduct();
      }
    });

    // لينك مباشر لمنتج (#p=قسم::اسم)
    const initial = parseHash();
    if (initial && !openProduct(initial.sub, initial.name, { push: false })) PD.pending = initial;
  }

  function renderProduct(sub, item) {
    PD.sub = sub;
    PD.item = item;
    const key = favKey(sub.id, item.name);
    const unit = sub.unit || "";

    // الصورة + الشارات
    const badges = [];
    if (item.soldOut) badges.push(`<span class="pd-badge pd-b-sold">⏳ نفد مؤقتًا</span>`);
    else {
      if (item.bestseller) badges.push(`<span class="pd-badge pd-b-best">⭐ الأكثر طلبًا</span>`);
      if (hasActiveDeal(item)) badges.push(`<span class="pd-badge pd-b-deal">🔥 عرض −${money(item.deal.percent)}%</span>`);
    }
    $("#pdMedia").innerHTML = `${
      item.img ? `<img src="${item.img}" alt="${item.name}">` : `<span class="pd-ph">${sub.icon || "🛍️"}</span>`
    }<div class="pd-badges">${badges.join("")}</div>${item.img ? `<span class="pd-zoom" aria-hidden="true">${ICON.zoom}</span>` : ""}`;
    $("#pdMedia").classList.toggle("no-img", !item.img);

    // العنوان
    const parent = STORE.sections.find((s) => (s.tabs || []).some((t) => t.id === sub.id));
    $("#pdPath").textContent = parent ? `${parent.title} › ${sub.title}` : sub.title;
    $("#pdName").textContent = item.name;

    // نفس كارت المنتج (نفس الأسعار والسلة) من غير الصورة والاسم
    const card = buildCard(sub, item);
    card.classList.add("card-in-sheet");
    card.dataset.searchId = `sheet::${sub.id}::${item.name}`;
    $(".card-media", card)?.remove();
    $("h3", card)?.remove();
    $(".custom-box-btn", card)?.addEventListener("click", () => closeProduct());
    $("#pdSlot").replaceChildren(card);

    // الوصف (من الداشبورد)
    const desc = $("#pdDesc");
    const text = (item.description || "").trim();
    desc.hidden = !text;
    desc.textContent = text;

    // المشاركة
    const price = typeof item.price === "number" && !item.customBox ? ` — ${money(Math.round(effectivePrice(item, null)))} ج.م ${unit ? `(${unit})` : ""}` : "";
    const msg = `شوف ${item.name} من فرحات${price}\n${pdUrl(sub.id, item.name)}`;
    $("#pdWa").href = `https://wa.me/?text=${encodeURIComponent(msg)}`;

    // القلب
    const fav = $(".pd-fav", PD.overlay);
    fav.dataset.favKey = key;
    fav.classList.toggle("active", favs.has(key));
    fav.setAttribute("aria-pressed", favs.has(key) ? "true" : "false");

    // منتجات مشابهة
    const simItems = sortForDisplay((sub.items || []).filter((i) => i !== item && i.name !== item.name && !i.soldOut && !i.customBox)).slice(0, 8);
    $("#pdSimWrap").hidden = simItems.length === 0;
    $("#pdSim").innerHTML = simItems
      .map((i) => {
        const media = i.img ? `<img src="${i.img}" alt="${i.name}">` : `<span class="ph">${sub.icon || "🛍️"}</span>`;
        return `<button type="button" class="pd-sim-card" data-name="${i.name.replace(/"/g, "&quot;")}">
          <span class="sc-media">${media}</span><span class="sc-name">${i.name}</span>
          <span class="sc-price">${money(Math.round(effectivePrice(i, null)))} <small>ج.م</small></span></button>`;
      })
      .join("");
    $$(".pd-sim-card", PD.overlay).forEach((b) =>
      b.addEventListener("click", () => {
        const target = (sub.items || []).find((i) => i.name === b.dataset.name);
        if (!target) return;
        if (history.state && history.state.pd) history.replaceState({ pd: true }, "", `#p=${encodeURIComponent(`${sub.id}::${target.name}`)}`);
        renderProduct(sub, target);
        $(".pd-scroll", PD.overlay).scrollTo({ top: 0, behavior: "smooth" });
      })
    );
  }

  function openProduct(subId, name, { push = true } = {}) {
    const sub = findSubById(subId);
    const item = sub && (sub.items || []).find((i) => i.name === name);
    if (!item) return false;
    renderProduct(sub, item);
    if (!PD.open) {
      PD.open = true;
      PD.overlay.setAttribute("aria-hidden", "false");
      PD.overlay.classList.add("open");
      document.documentElement.classList.add("sheet-lock");
      $(".pd-scroll", PD.overlay).scrollTop = 0;
      if (push) history.pushState({ pd: true }, "", `#p=${encodeURIComponent(`${subId}::${name}`)}`);
    } else if (push) {
      history.replaceState({ pd: true }, "", `#p=${encodeURIComponent(`${subId}::${name}`)}`);
    }
    return true;
  }

  function closeProduct() {
    if (!PD.open) return;
    if (history.state && history.state.pd) history.back(); // popstate هيقفل الواجهة
    else {
      closeProductUI();
      if (parseHash()) history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function closeProductUI() {
    if (!PD.open) return;
    PD.open = false;
    PD.overlay.classList.remove("open");
    PD.overlay.setAttribute("aria-hidden", "true");
    closeLightbox();
    if (!anyOverlayOpen()) document.documentElement.classList.remove("sheet-lock");
    // لو الصنف ليه سادة/محوج، نرجّع كارت القسم يعكس اختيارك من جوه الصفحة
    const { sub, item } = PD;
    if (sub && item && sub.grindOptions && !item.noGrind) {
      $$(`.card[data-search-id="${CSS.escape(`${sub.id}::${item.name}`)}"]`).forEach((old) => old.replaceWith(buildCard(sub, item)));
    }
    setTimeout(() => { if (!PD.open) $("#pdSlot").replaceChildren(); }, 450);
  }

  function closeLightbox() { PD.lightbox && PD.lightbox.classList.remove("open"); }

  async function copyProductLink() {
    const url = pdUrl(PD.sub.id, PD.item.name);
    try {
      await navigator.clipboard.writeText(url);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (err) { /* تجاهل */ }
      ta.remove();
    }
    if (typeof showToast === "function") showToast("🔗 اتنسخ رابط المنتج");
  }

  // سحب الصفحة لتحت لقفلها (موبايل)
  function setupSwipeToClose() {
    const handle = $(".pd-drag", PD.overlay);
    let drag = null;
    handle.addEventListener("pointerdown", (e) => {
      if (!isMobile()) return;
      drag = { y0: e.clientY, dy: 0 };
      handle.setPointerCapture(e.pointerId);
      PD.sheet.style.transition = "none";
    });
    handle.addEventListener("pointermove", (e) => {
      if (!drag) return;
      drag.dy = Math.max(0, e.clientY - drag.y0);
      PD.sheet.style.transform = `translateY(${drag.dy}px)`;
    });
    const end = () => {
      if (!drag) return;
      const dy = drag.dy;
      drag = null;
      PD.sheet.style.transition = "";
      PD.sheet.style.transform = "";
      if (dy > 110) closeProduct();
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  /* ===================================================================
     تشغيل
     =================================================================== */

  function init() {
    const yearEl = $("#copyYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    initBottomNav();
    initFavorites();
    initProductSheet();
    initInstall();
    document.documentElement.classList.add("app-ui");
  }

  init();
})();
