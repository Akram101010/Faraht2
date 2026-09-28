/* ============================== منطق الموقع ============================== */

const cart = {}; // key: "sectionId|itemName" أو "sectionId|itemName|factor" لو الصنف بيتباع بالوزن

// حالة العروض (لازم تتعرّف هنا فوق عشان buildSections بتستخدمها وقت التشغيل)
let allDeals = [];
let dealsTicker = null;
let nextDealExpiry = 0;
const DEAL_PSEUDO_SECTION = { id: "deals", title: "عروض اليوم", icon: "🔥", unit: "جنيه / قطعة" };

// حفظ السلة: لو العميل عمل ريفريش بالغلط السلة ترجع، وبتتنضّف أسعارها من
// الكتالوج الحالي أول ما البيانات الحية توصل. بتتمسح بعد 3 أيام، وبعد ما
// الطلب يتبعت على واتساب مابنحفظهاش تاني (عشان مايتكرّرش طلب بالغلط).
const CART_STORAGE_KEY = "farahat_cart_v1";
const CART_MAX_AGE = 3 * 24 * 3600 * 1000;
let sentCartSig = null;
let restoredFromStorage = false;
let cartFinalized = false;
let productsSettled = false;
let dealsSettled = false;

const els = {
  sections: document.getElementById("sections"),
  nav: document.getElementById("mainNav"),
  navMoreBtn: document.getElementById("navMoreBtn"),
  chips: document.getElementById("categoryChips"),
  cartFab: document.getElementById("cartFab"),
  fabCount: document.getElementById("fabCount"),
  fabTotal: document.getElementById("fabTotal"),
  overlay: document.getElementById("cartOverlay"),
  cartItems: document.getElementById("cartItems"),
  cartTotal: document.getElementById("cartTotal"),
  confirmBtn: document.getElementById("confirmBtn"),
  toast: document.getElementById("toast"),
  custName: document.getElementById("custName"),
  custPhone: document.getElementById("custPhone"),
  custAddress: document.getElementById("custAddress"),
  custNote: document.getElementById("custNote"),
  custRegion: document.getElementById("custRegion"),
  deliveryHint: document.getElementById("deliveryHint"),
  boxOverlay: document.getElementById("boxBuilderOverlay"),
  boxTitle: document.getElementById("boxBuilderTitle"),
  boxCloseBtn: document.getElementById("boxBuilderCloseBtn"),
  boxRangeText: document.getElementById("boxBuilderRangeText"),
  boxItems: document.getElementById("boxBuilderItems"),
  boxWeight: document.getElementById("boxBuilderWeight"),
  boxPrice: document.getElementById("boxBuilderPrice"),
  boxWarning: document.getElementById("boxBuilderWarning"),
  boxConfirmBtn: document.getElementById("boxBuilderConfirmBtn"),
  searchToggleBtn: document.getElementById("searchToggleBtn"),
  searchOverlay: document.getElementById("searchOverlay"),
  searchInput: document.getElementById("searchInput"),
  searchCloseBtn: document.getElementById("searchCloseBtn"),
  searchResults: document.getElementById("searchResults"),
  menuToggleBtn: document.getElementById("menuToggleBtn"),
  sectionsMenuOverlay: document.getElementById("sectionsMenuOverlay"),
  sectionsMenuCloseBtn: document.getElementById("sectionsMenuCloseBtn"),
  sectionsMenuList: document.getElementById("sectionsMenuList"),
  toTopFab: document.getElementById("toTopFab"),
};

const money = (n) => n.toLocaleString("ar-EG");

function cartKey(sectionId, name, factor) {
  return factor == null ? `${sectionId}|${name}` : `${sectionId}|${name}|${factor}`;
}

function weightUnitNoun(section) {
  return section.weightUnit || (section.unit.includes("لتر") ? "لتر" : "كيلو");
}

function weightLabelFor(w, unitNoun) {
  return w.factor === 1 ? unitNoun : `${w.label} ${unitNoun}`;
}

function addIcon() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>`;
}

/* --------------------------- بناء الأقسام والكروت -------------------------- */

function sectionItemCount(section) {
  if (section.tabs) {
    return section.tabs.reduce((sum, t) => sum + (t.comingSoon || !t.items ? 0 : t.items.length), 0);
  }
  return section.comingSoon || section.items.length === 0 ? 0 : section.items.length;
}

function buildSections() {
  applyDealsToCatalog(); // أي عرض شغال يبان على كارت المنتج نفسه في قسمه
  els.sections.innerHTML = ""; // عشان نقدر نعيد البناء بأمان لما بيانات Firestore توصل
  els.nav.innerHTML = "";
  els.chips.innerHTML = "";
  STORE.sections.forEach((section) => {
    const sec = document.createElement("section");
    sec.className = "product-section";
    sec.id = section.id;

    const inner = document.createElement("div");
    inner.className = "container";

    const count = sectionItemCount(section);
    inner.innerHTML = `
      <div class="section-heading reveal">
        <span class="icon">${section.icon}</span>
        <div class="heading-text">
          <h2>${section.title}</h2>
          <span class="count">${count > 0 ? `${count} صنف` : ""}</span>
        </div>
      </div>
    `;

    if (section.tabs) {
      inner.appendChild(buildTabbedSection(section));
    } else if (section.comingSoon || section.items.length === 0) {
      inner.innerHTML += `
        <div class="coming-soon reveal">
          <span class="icon">${section.icon}</span>
          <strong>قائمة ${section.title} هتضاف قريبًا</strong>
          هنكمّل الأصناف أول ما توصلنا التفاصيل
        </div>`;
    } else {
      const grid = document.createElement("div");
      grid.className = "grid reveal";
      sortForDisplay(section.items).forEach((item) => grid.appendChild(buildCard(section, item)));
      inner.appendChild(grid);
    }

    sec.appendChild(inner);
    els.sections.appendChild(sec);

    // نفس الشيء في الناف بار وشريط الأقسام
    const navLink = document.createElement("a");
    navLink.href = `#${section.id}`;
    navLink.innerHTML = `<span class="nav-icon">${section.icon}</span>${section.title}`;
    els.nav.appendChild(navLink);

    const chip = document.createElement("a");
    chip.href = `#${section.id}`;
    chip.className = "chip";
    chip.innerHTML = `<span class="icon">${section.icon}</span><span>${section.title}</span>`;
    els.chips.appendChild(chip);
  });
  enhanceGridSliders();
}

/* --------------------------- قسم بتبويبات (المزاج) ------------------------- */

// ترتيب العرض: الأكثر طلبًا الأول (عشان أهم أصنافك تبان قبل ما العميل يكسل
// يسحب)، وبعدها باقي الأصناف من الأرخص للأغلى، والأصناف "النافدة مؤقتًا"
// في الآخر عشان ماياخدوش مكان من المتاح.
function sortForDisplay(items) {
  const rank = (i) => (i.soldOut ? 2 : i.bestseller ? 0 : 1);
  return [...items].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    const pa = typeof a.price === "number" ? a.price : Infinity;
    const pb = typeof b.price === "number" ? b.price : Infinity;
    return pa - pb;
  });
}

function buildTabbedSection(section) {
  const wrap = document.createDocumentFragment();

  const tabsBar = document.createElement("div");
  tabsBar.className = "mood-tabs reveal";
  section.tabs.forEach((tab, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mood-tab" + (i === 0 ? " active" : "");
    btn.dataset.tab = tab.id;
    const tabCount = tab.comingSoon || !tab.items ? 0 : tab.items.length;
    btn.innerHTML = `<span class="icon">${tab.icon}</span><span>${tab.title}${tabCount > 0 ? ` <span class="tab-count">(${tabCount})</span>` : ""}</span>`;
    btn.addEventListener("click", () => {
      tabsBar.querySelectorAll(".mood-tab").forEach((b) => b.classList.toggle("active", b === btn));
      panels.querySelectorAll(".mood-panel").forEach((p) => p.classList.toggle("active", p.dataset.tab === tab.id));
      requestAnimationFrame(updateSliderUIs);
    });
    tabsBar.appendChild(btn);
  });
  wrap.appendChild(tabsBar);

  const panels = document.createElement("div");
  panels.className = "mood-panels";
  section.tabs.forEach((tab, i) => {
    const panel = document.createElement("div");
    panel.className = "mood-panel" + (i === 0 ? " active" : "");
    panel.dataset.tab = tab.id;
    if (tab.comingSoon || tab.items.length === 0) {
      panel.innerHTML = `
        <div class="coming-soon">
          <span class="icon">${tab.icon}</span>
          <strong>قائمة ${tab.title} هتضاف قريبًا</strong>
          هنكمّل الأصناف أول ما توصلنا التفاصيل
        </div>`;
    } else {
      const grid = document.createElement("div");
      grid.className = "grid";
      sortForDisplay(tab.items).forEach((item) => grid.appendChild(buildCard(tab, item)));
      panel.appendChild(grid);

      // تنويه في آخر كل تبويب إن في أنواع تانية في نفس القسم، عشان محدش
      // يوصل لآخر القايمة ويفتكر إن دي كل الأنواع الموجودة
      const others = section.tabs.filter((t) => t.id !== tab.id);
      if (others.length > 0) {
        const hint = document.createElement("div");
        hint.className = "other-tabs-hint";
        hint.innerHTML = `
          <span class="oth-label">فيه كمان في ${section.title}:</span>
          ${others.map((t) => {
            const c = t.comingSoon || !t.items ? 0 : t.items.length;
            return `<button type="button" class="oth-chip" data-tab="${t.id}"><span>${t.icon}</span>${t.title}${c > 0 ? ` (${c})` : ""}</button>`;
          }).join("")}
        `;
        hint.querySelectorAll(".oth-chip").forEach((chip) => {
          chip.addEventListener("click", () => {
            const targetBtn = tabsBar.querySelector(`.mood-tab[data-tab="${cssEscape(chip.dataset.tab)}"]`);
            if (targetBtn) targetBtn.click();
            tabsBar.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        });
        panel.appendChild(hint);
      }
    }
    panels.appendChild(panel);
  });
  wrap.appendChild(panels);

  return wrap;
}

/* ------------------------- تسعير العروض على الكروت ------------------------- */
// أي صنف عليه عرض شغال بيكون عليه item.deal = { id, percent, endsAt(ms) }.
// كل الأسعار (الكارت، أزرار الوزن، السلة) بتعدّي على الدوال دي، فالسعر بعد
// الخصم بيتحسب في مكان واحد بس ومفيش احتمال يتلخبط.

function hasActiveDeal(item) {
  return !!(item && item.deal && item.deal.endsAt > Date.now());
}
function dealFactor(item) {
  return hasActiveDeal(item) ? 1 - item.deal.percent / 100 : 1;
}
function basePriceOf(item, grind) {
  return item.price + (grind ? grind.priceAdd || 0 : 0);
}
function effectivePrice(item, grind) {
  return basePriceOf(item, grind) * dealFactor(item);
}
function cardPriceInner(item, grind) {
  const now = Math.round(effectivePrice(item, grind));
  if (hasActiveDeal(item)) {
    const was = Math.round(basePriceOf(item, grind));
    return `<s class="price-was">${money(was)}</s> ${money(now)} <span class="cur">ج.م</span>`;
  }
  return `${money(now)} <span class="cur">ج.م</span>`;
}

function formatRemaining(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d > 0 ? `${d} يوم ` : ""}${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function dealTimerCompactHTML(item) {
  return `<div class="card-deal-timer"><span>⏳ العرض ينتهي بعد</span><b class="cdt" data-ends="${item.deal.endsAt}">${formatRemaining(item.deal.endsAt - Date.now())}</b></div>`;
}

function dealTimerSegHTML(item) {
  return `
    <div class="deal-timer" data-ends="${item.deal.endsAt}">
      <div class="dt-seg"><b class="dt-h">00</b><span>ساعة</span></div>
      <div class="dt-seg"><b class="dt-m">00</b><span>دقيقة</span></div>
      <div class="dt-seg"><b class="dt-s">00</b><span>ثانية</span></div>
    </div>`;
}

function buildCard(section, item, opts = {}) {
  const card = document.createElement("article");
  card.className = "card";
  // كارت الشريحة في سكشن العروض ليه مفتاح بحث مختلف، عشان البحث يوصل
  // لكارت المنتج الأصلي في قسمه مش لنسخة العروض
  card.dataset.searchId = opts.slide ? `deal::${section.id}::${item.name}` : `${section.id}::${item.name}`;
  const soldOut = !!item.soldOut;
  const dealOn = hasActiveDeal(item) && !soldOut;
  if (dealOn) card.classList.add("card-has-deal");
  if (soldOut) card.classList.add("card-soldout");

  const bestsellerBadge = item.bestseller
    ? `<span class="badge-bestseller"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6L12 2z"/></svg>الأكثر طلبًا</span>`
    : "";
  const dealBadge = dealOn ? `<span class="badge-deal">🔥 عرض −${money(item.deal.percent)}%</span>` : "";
  const soldBadge = soldOut ? `<span class="badge-soldout">⏳ نفد مؤقتًا</span>` : "";
  const badges = soldOut ? soldBadge : `${bestsellerBadge}${dealBadge}`;
  const media = item.img
    ? `<div class="card-media">${badges}<img src="${item.img}" alt="${item.name}" loading="lazy"></div>`
    : `<div class="card-media placeholder">${badges}${section.icon}</div>`;

  if (soldOut) {
    const ask = encodeURIComponent(`السلام عليكم، عايز أعرف ${item.name} هيتوفر امتى؟`);
    card.innerHTML = `
      ${media}
      <div class="card-body">
        <h3>${item.name}</h3>
        ${typeof item.price === "number" ? `<div class="card-price-row"><span class="card-price muted">${money(item.price)} <span class="cur">ج.م</span></span><span class="card-unit">${section.unit}</span></div>` : ""}
        <div class="soldout-note">⏳ نفد مؤقتًا — <strong>هيتوفر قريبًا</strong></div>
        <a class="soldout-ask" href="https://wa.me/${STORE.whatsapp}?text=${ask}" target="_blank" rel="noopener">🔔 اسأل عن موعد توفره</a>
      </div>
    `;
    return card;
  }

  if (item.customBox) {
    card.classList.add("card-custom-box");
    const unitLabel = item.weightUnitLabel || "كيلو";
    card.innerHTML = `
      ${media}
      <div class="card-body">
        <h3>${item.name}</h3>
        <div class="custom-box-range">من ${item.minWeight} لحد ${item.maxWeight} ${unitLabel}</div>
        ${item.note ? `<p class="custom-box-note">${item.note}</p>` : ""}
        <button type="button" class="card-add custom-box-btn">${addIcon()} كوّن علبتك دلوقتي</button>
      </div>
    `;
    card.querySelector(".custom-box-btn").addEventListener("click", () => openBoxBuilder(section, item));
    return card;
  }

  const timerBlock = dealOn ? (opts.slide ? dealTimerSegHTML(item) : dealTimerCompactHTML(item)) : "";

  if (section.hasWeights) {
    const hasGrind = Array.isArray(section.grindOptions) && section.grindOptions.length > 1 && !item.noGrind;
    card.innerHTML = `
      ${media}
      <div class="card-body">
        <h3>${item.name}</h3>
        <div class="card-price-row">
          <span class="card-price">${cardPriceInner(item, currentGrind(section, item))}</span>
          <span class="card-unit">${section.unit}</span>
        </div>
        ${timerBlock}
        ${dealOn && opts.slide ? `<div class="deal-cta-label">اختار الكمية واطلب العرض فورًا 👇</div>` : ""}
        ${hasGrind ? `<div class="grind-toggle"></div>` : ""}
        <div class="weight-grid" data-item="${item.name}"></div>
      </div>
    `;
    if (hasGrind) {
      buildGrindToggle(card.querySelector(".grind-toggle"), section, item);
    }
    card.querySelector(".weight-grid").appendChild(buildWeightGrid(section, item, currentGrind(section, item)));
  } else {
    const key = cartKey(section.id, item.name);
    card.innerHTML = `
      ${media}
      <div class="card-body">
        <h3>${item.name}</h3>
        <div class="card-price-row">
          <span class="card-price">${cardPriceInner(item, null)}</span>
          <span class="card-unit">${section.unit}</span>
        </div>
        ${timerBlock}
        <div class="card-action" data-key="${key}"></div>
      </div>
    `;
    renderCardAction(card.querySelector(".card-action"), section, item, key);
  }

  return card;
}

/* --------------------------- بوب-أب "كوّن علبتك" ---------------------------- */

let boxBuilderState = null; // { item, tab, selections: { itemName: quarters(int) } }
let boxBuilderCounter = 0;

function findLinkedTab(item) {
  for (const section of STORE.sections) {
    if (!section.tabs) continue;
    const tab = section.tabs.find((t) => t.id === item.linkToTab);
    if (tab) return tab;
  }
  return null;
}

function openBoxBuilder(section, item) {
  const tab = findLinkedTab(item);
  if (!tab) return;

  boxBuilderState = { item, tab, selections: {} };

  els.boxTitle.textContent = item.name;
  const unitLabel = item.weightUnitLabel || "كيلو";
  els.boxRangeText.textContent = `من ${item.minWeight} لحد ${item.maxWeight} ${unitLabel}`;

  els.boxItems.innerHTML = "";
  tab.items.filter((wItem) => !wItem.excludeFromBox && !wItem.soldOut).forEach((wItem) => {
    const row = document.createElement("div");
    row.className = "box-builder-row";
    row.dataset.name = wItem.name;
    row.innerHTML = `
      <div class="bb-thumb">${wItem.img ? `<img src="${wItem.img}" alt="${wItem.name}">` : `<span>${tab.icon}</span>`}</div>
      <div class="bb-info">
        <h4>${wItem.name}</h4>
        <span class="bb-unit-price">${money(wItem.price)} ج.م / كيلو</span>
      </div>
      <div class="bb-stepper">
        <button type="button" data-dir="-1" aria-label="تقليل">−</button>
        <span class="bb-val">0</span>
        <button type="button" data-dir="1" aria-label="زيادة">+</button>
      </div>
    `;
    row.querySelectorAll(".bb-stepper button").forEach((btn) => {
      btn.addEventListener("click", () => changeBoxQuarters(wItem, Number(btn.dataset.dir)));
    });
    els.boxItems.appendChild(row);
  });

  updateBoxBuilderTotals();
  els.boxOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeBoxBuilder() {
  els.boxOverlay.classList.remove("open");
  document.body.style.overflow = "";
  boxBuilderState = null;
}

function changeBoxQuarters(wItem, dir) {
  if (!boxBuilderState) return;
  const cur = boxBuilderState.selections[wItem.name] || 0;
  const next = Math.max(0, cur + dir);
  if (next === 0) delete boxBuilderState.selections[wItem.name];
  else boxBuilderState.selections[wItem.name] = next;

  const row = els.boxItems.querySelector(`.box-builder-row[data-name="${cssEscape(wItem.name)}"]`);
  if (row) {
    const kg = next * 0.25;
    row.querySelector(".bb-val").textContent = kg > 0 ? `${kg} كجم` : "0";
    row.classList.toggle("active", next > 0);
  }
  updateBoxBuilderTotals();
}

function updateBoxBuilderTotals() {
  if (!boxBuilderState) return;
  const { item, tab, selections } = boxBuilderState;

  let totalQuarters = 0;
  let totalPrice = 0;
  Object.entries(selections).forEach(([name, quarters]) => {
    const wItem = tab.items.find((i) => i.name === name);
    if (!wItem) return;
    totalQuarters += quarters;
    totalPrice += wItem.price * (quarters * 0.25);
  });

  const totalWeight = totalQuarters * 0.25;
  const unitLabel = item.weightUnitLabel || "كيلو";
  els.boxWeight.textContent = `${totalWeight} ${unitLabel}`;
  els.boxPrice.textContent = `${money(Math.round(totalPrice))} ج.م`;

  let warning = "";
  let valid = totalWeight >= item.minWeight && totalWeight <= item.maxWeight;
  if (totalWeight === 0) {
    warning = "ابدأ اختار الأنواع اللي تحبها من فوق";
  } else if (totalWeight < item.minWeight) {
    warning = `لسه محتاج ${round2(item.minWeight - totalWeight)} ${unitLabel} عشان توصل للحد الأدنى (${item.minWeight} ${unitLabel})`;
  } else if (totalWeight > item.maxWeight) {
    warning = `تجاوزت الحد الأقصى (${item.maxWeight} ${unitLabel}) — قلل ${round2(totalWeight - item.maxWeight)} ${unitLabel}`;
  }
  els.boxWarning.textContent = warning;
  els.boxConfirmBtn.disabled = !valid;
}

function round2(n) { return Math.round(n * 100) / 100; }

function confirmBoxBuilder() {
  if (!boxBuilderState) return;
  const { item, tab, selections } = boxBuilderState;

  const parts = Object.entries(selections)
    .filter(([, q]) => q > 0)
    .map(([name, q]) => `${name} (${q * 0.25} كجم)`);
  if (parts.length === 0) return;

  let totalQuarters = 0;
  let totalPrice = 0;
  Object.entries(selections).forEach(([name, quarters]) => {
    const wItem = tab.items.find((i) => i.name === name);
    if (!wItem) return;
    totalQuarters += quarters;
    totalPrice += wItem.price * (quarters * 0.25);
  });
  const totalWeight = totalQuarters * 0.25;
  const unitLabel = item.weightUnitLabel || "كيلو";

  boxBuilderCounter += 1;
  const key = `choc-boxes|${item.name}|custom-${boxBuilderCounter}`;
  cart[key] = {
    name: item.name,
    price: Math.round(totalPrice),
    weightLabel: `${totalWeight} ${unitLabel}`,
    composition: parts.join("، "),
    section: "علب شكولاتة",
    img: item.img,
    qty: 1,
    boxLink: item.linkToTab,
    boxSelections: { ...selections },
  };

  refreshCartUI();
  closeBoxBuilder();
  showToast(`✓ اتضافت ${item.name} للسلة`);
}

els.boxCloseBtn.addEventListener("click", closeBoxBuilder);
els.boxOverlay.addEventListener("click", (e) => { if (e.target === els.boxOverlay) closeBoxBuilder(); });
els.boxConfirmBtn.addEventListener("click", confirmBoxBuilder);

/* --------------------------- تلميح "فيه أقسام تانية" ------------------------ */
// شريط الأقسام في الهيدر بيعمل اسكرول أفقي، وده مش واضح دايمًا للعميل إنه
// موجود. الزرار ده بيفضل ظاهر لحد ما آخر قسم في الشريط يبقى ظاهر بالكامل.

function setupNavScrollHint() {
  const nav = els.nav;
  const btn = els.navMoreBtn;
  if (!nav || !btn) return;

  function refresh() {
    const links = nav.querySelectorAll("a");
    if (links.length === 0) { btn.classList.add("at-end"); return; }
    const last = links[links.length - 1];
    const navRect = nav.getBoundingClientRect();
    const lastRect = last.getBoundingClientRect();
    const fullyVisible = lastRect.left >= navRect.left - 2 && lastRect.right <= navRect.right + 2;
    btn.classList.toggle("at-end", fullyVisible);
  }

  nav.addEventListener("scroll", refresh);
  window.addEventListener("resize", refresh);
  btn.addEventListener("click", () => {
    const links = nav.querySelectorAll("a");
    const last = links[links.length - 1];
    if (last) last.scrollIntoView({ behavior: "smooth", inline: "end", block: "nearest" });
  });

  refresh();
}

/* ------------------------------ منيو "أقسام فرحات" -------------------------- */
// بتظهر بدل شريط الأقسام على شاشات الموبايل الضيقة. كل قسم فيه تبويبات
// (زي المزاج والشكولاتة) بيتفتح بضغطة عشان يوري التبويبات اللي جواه، وأي
// قسم من غير تبويبات بيودّي على طول لمكانه في الصفحة.

function buildSectionsMenu() {
  if (!els.sectionsMenuList) return;
  els.sectionsMenuList.innerHTML = "";

  STORE.sections.forEach((section) => {
    const item = document.createElement("div");
    item.className = "smi-item";

    if (section.tabs && section.tabs.length > 0) {
      item.innerHTML = `
        <button type="button" class="smi-row" data-toggle>
          <span class="smi-icon">${section.icon}</span>
          <span class="smi-title">${section.title}</span>
          <svg class="smi-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <div class="smi-sub">
          <div class="smi-sub-inner">
            ${section.tabs.map((tab) => `
              <button type="button" class="smi-subitem" data-section="${section.id}" data-tab="${tab.id}">
                <span>${tab.icon}</span>${tab.title}
              </button>
            `).join("")}
          </div>
        </div>
      `;
      item.querySelector(".smi-row").addEventListener("click", () => {
        const willOpen = !item.classList.contains("open");
        // أكورديون حقيقي: فتح قسم بيقفل اللي قبله، فمفيش قوايم تتزاحم فوق بعض
        els.sectionsMenuList.querySelectorAll(".smi-item.open").forEach((o) => o.classList.remove("open"));
        if (willOpen) item.classList.add("open");
      });
      item.querySelectorAll(".smi-subitem").forEach((btn) => {
        btn.addEventListener("click", () => goToMenuTarget(btn.dataset.section, btn.dataset.tab));
      });
    } else {
      item.innerHTML = `
        <button type="button" class="smi-row" data-section="${section.id}">
          <span class="smi-icon">${section.icon}</span>
          <span class="smi-title">${section.title}</span>
        </button>
      `;
      item.querySelector(".smi-row").addEventListener("click", () => goToMenuTarget(section.id, null));
    }

    els.sectionsMenuList.appendChild(item);
  });
}

function goToMenuTarget(sectionId, tabId) {
  closeSectionsMenu();
  if (tabId) {
    const tabBtn = document.querySelector(`.mood-tab[data-tab="${cssEscape(tabId)}"]`);
    if (tabBtn) tabBtn.click();
  }
  requestAnimationFrame(() => {
    const target = document.getElementById(sectionId);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function openSectionsMenu() {
  els.sectionsMenuOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeSectionsMenu() {
  els.sectionsMenuOverlay.classList.remove("open");
  document.body.style.overflow = "";
}

els.menuToggleBtn.addEventListener("click", openSectionsMenu);
els.sectionsMenuCloseBtn.addEventListener("click", closeSectionsMenu);
els.sectionsMenuOverlay.addEventListener("click", (e) => {
  if (e.target === els.sectionsMenuOverlay) closeSectionsMenu();
});

/* ------------------------------ زرار "لأول الصفحة" -------------------------- */

function setupToTopButton() {
  const btn = els.toTopFab;
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 600);
  });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

document.getElementById("logoHomeLink")?.addEventListener("click", (e) => {
  e.preventDefault();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

/* --------------------------------- البحث ---------------------------------- */

const tabParentSectionId = {}; // tabId -> id السكشن الأساسي (عشان نعرف نسكرول لفين)
let searchIndex = [];

function normalizeArabic(str) {
  return str
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "") // تشكيل وتطويل
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((w) => (w.length > 3 && w.startsWith("ال") ? w.slice(2) : w)) // "البرسيم" ≈ "برسيم"
    .join(" ");
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function buildSearchIndex() {
  const idx = [];
  STORE.sections.forEach((section) => {
    const targets = section.tabs
      ? section.tabs.map((tab) => { tabParentSectionId[tab.id] = section.id; return { sub: tab, parentTitle: section.title }; })
      : [{ sub: section, parentTitle: null }];

    targets.forEach(({ sub, parentTitle }) => {
      if (sub.comingSoon || !sub.items) return;
      sub.items.forEach((item) => {
        const dealOn = hasActiveDeal(item);
        const priceLabel = item.soldOut
          ? "نفد مؤقتًا"
          : item.customBox
            ? `من ${item.minWeight} لـ ${item.maxWeight} ${item.weightUnitLabel || "كيلو"}`
            : `${money(Math.round(effectivePrice(item, null)))} ج.م`;
        idx.push({
          name: item.name,
          img: item.img,
          sectionId: sub.id,
          pathLabel: parentTitle ? `${parentTitle} › ${sub.title}` : sub.title,
          priceLabel,
          hasDeal: dealOn && !item.soldOut,
          soldOut: !!item.soldOut,
          dealPercent: dealOn ? item.deal.percent : 0,
          searchNorm: normalizeArabic(item.name),
        });
      });
    });
  });
  return idx;
}

function renderSearchResults(list, rawQuery) {
  if (rawQuery.length === 0) {
    els.searchResults.innerHTML = `<div class="search-hint"><span class="icon">🔍</span>ابدأ اكتب اسم أي منتج تدور عليه</div>`;
    return;
  }
  if (list.length === 0) {
    els.searchResults.innerHTML = `<div class="search-empty"><span class="icon">🙁</span>مفيش نتائج مطابقة لـ "${escapeHtml(rawQuery)}"<br>جرب كلمة تانية</div>`;
    return;
  }
  els.searchResults.innerHTML = "";
  list.forEach((entry) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "search-result";
    row.innerHTML = `
      <div class="thumb">${entry.img ? `<img src="${entry.img}" alt="${entry.name}">` : "🛍️"}</div>
      <div class="sr-info">
        <h4>${entry.name}${entry.hasDeal ? ` <span class="sr-deal">🔥 عرض −${money(entry.dealPercent)}%</span>` : ""}</h4>
        <div class="sr-path">${entry.pathLabel}</div>
      </div>
      <div class="sr-price${entry.soldOut ? " soldout" : ""}">${entry.priceLabel}</div>
    `;
    row.addEventListener("click", () => goToSearchResult(entry));
    els.searchResults.appendChild(row);
  });
}

// الإضاءة على المنتج اللي العميل دوّر عليه: بنعتّم الصفحة كلها ونسيب كارت
// المنتج منوّر بإطار دهبي نابض وعلامة واضحة فوقه، لحد ما العميل يدوس في أي
// مكان أو يعدّي حوالي 5 ثواني. الطبقة دي خارج الكارت فمفيش قص أو تداخل.
let spotlightState = null;

function endSpotlight() {
  if (!spotlightState) return;
  const st = spotlightState;
  spotlightState = null;
  cancelAnimationFrame(st.raf);
  clearTimeout(st.timer);
  window.removeEventListener("pointerdown", st.onDown, true);
  document.removeEventListener("keydown", st.onKey, true);
  st.ring.classList.remove("on");
  st.label.classList.remove("on");
  st.card.classList.remove("search-highlight");
  setTimeout(() => { st.ring.remove(); st.label.remove(); }, 450);
}

function startSpotlight(card) {
  endSpotlight();
  const ring = document.createElement("div");
  ring.className = "search-spotlight";
  const label = document.createElement("div");
  label.className = "search-spotlight-label";
  label.textContent = "ده المنتج اللي دورت عليه";
  document.body.append(ring, label);

  const place = () => {
    const r = card.getBoundingClientRect();
    const pad = 7;
    ring.style.left = `${r.left - pad}px`;
    ring.style.top = `${r.top - pad}px`;
    ring.style.width = `${r.width + pad * 2}px`;
    ring.style.height = `${r.height + pad * 2}px`;
    const above = r.top > 78;
    label.classList.toggle("below", !above);
    label.style.left = `${Math.min(Math.max(r.left + r.width / 2, 90), window.innerWidth - 90)}px`;
    label.style.top = `${above ? r.top - pad - 10 : r.bottom + pad + 10}px`;
  };
  place();

  const onDown = () => endSpotlight();
  const onKey = (e) => { if (e.key === "Escape") endSpotlight(); };
  const loop = () => {
    place();
    if (spotlightState) spotlightState.raf = requestAnimationFrame(loop);
  };
  spotlightState = { ring, label, card, raf: requestAnimationFrame(loop), timer: setTimeout(endSpotlight, 5500), onDown, onKey };
  window.addEventListener("pointerdown", onDown, true);
  document.addEventListener("keydown", onKey, true);
  card.classList.add("search-highlight");
  requestAnimationFrame(() => { ring.classList.add("on"); label.classList.add("on"); });
}

// بنستنى السكرول يهدى (الكارت يبطّل يتحرك) قبل ما نضيّء عليه
function whenScrollSettles(card, cb) {
  let lastTop = null, lastLeft = null, stable = 0, frames = 0;
  const step = () => {
    const r = card.getBoundingClientRect();
    if (lastTop !== null && Math.abs(r.top - lastTop) < 0.5 && Math.abs(r.left - lastLeft) < 0.5) stable++;
    else stable = 0;
    lastTop = r.top; lastLeft = r.left; frames++;
    if (stable >= 8 || frames > 150) cb();
    else requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function goToSearchResult(entry) {
  closeSearch();

  const tabBtn = document.querySelector(`.mood-tab[data-tab="${cssEscape(entry.sectionId)}"]`);
  if (tabBtn) tabBtn.click();

  requestAnimationFrame(() => {
    const card = document.querySelector(`.card[data-search-id="${cssEscape(entry.sectionId + "::" + entry.name)}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      setTimeout(() => whenScrollSettles(card, () => startSpotlight(card)), 120);
    } else {
      const topId = tabParentSectionId[entry.sectionId] || entry.sectionId;
      const topSection = document.getElementById(topId);
      if (topSection) topSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function openSearch() {
  els.searchOverlay.classList.add("open");
  document.body.style.overflow = "hidden";
  renderSearchResults([], "");
  requestAnimationFrame(() => els.searchInput.focus());
}
function closeSearch() {
  els.searchOverlay.classList.remove("open");
  document.body.style.overflow = "";
  els.searchInput.value = "";
}

els.searchToggleBtn.addEventListener("click", openSearch);
els.searchCloseBtn.addEventListener("click", closeSearch);
els.searchOverlay.addEventListener("click", (e) => { if (e.target === els.searchOverlay) closeSearch(); });
els.searchInput.addEventListener("input", () => {
  const raw = els.searchInput.value.trim();
  const q = normalizeArabic(raw);
  const results = q ? searchIndex.filter((e) => e.searchNorm.includes(q)).slice(0, 40) : [];
  renderSearchResults(results, raw);
});

/* ------------------------------- اختيار الوزن ----------------------------- */

function weightOptionsFor(section) {
  return section.weightOptions || WEIGHT_OPTIONS;
}

// حالة اختيار سادة/محوج لكل صنف (افتراضيًا أول خيار في grindOptions)
const grindSelection = {};

function currentGrind(section, item) {
  if (!Array.isArray(section.grindOptions) || section.grindOptions.length === 0) return null;
  if (item.noGrind) return null;
  const key = `${section.id}|${item.name}`;
  const savedKey = grindSelection[key];
  return section.grindOptions.find((g) => g.key === savedKey) || section.grindOptions[0];
}

function buildGrindToggle(container, section, item) {
  const key = `${section.id}|${item.name}`;
  container.innerHTML = section.grindOptions
    .map((g) => `<button type="button" class="grind-btn" data-grind="${g.key}">${g.label}${g.priceAdd ? ` <span class="grind-extra">+${money(g.priceAdd)}</span>` : ""}</button>`)
    .join("");

  const refreshActive = () => {
    const active = currentGrind(section, item);
    container.querySelectorAll(".grind-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.grind === active.key);
    });
  };

  container.querySelectorAll(".grind-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      grindSelection[key] = btn.dataset.grind;
      refreshActive();
      const card = container.closest(".card");
      const grid = card.querySelector(".weight-grid");
      grid.innerHTML = "";
      grid.appendChild(buildWeightGrid(section, item, currentGrind(section, item)));
      const priceEl = card.querySelector(".card-price");
      priceEl.innerHTML = cardPriceInner(item, currentGrind(section, item));
    });
  });

  refreshActive();
}

function effectiveName(item, grind) {
  if (!grind || !grind.priceAdd) return item.name;
  return `${item.name} (${grind.label})`;
}

function buildWeightGrid(section, item, grind) {
  const wrap = document.createDocumentFragment();
  const grid = document.createElement("div");
  grid.className = "weight-grid-inner";

  weightOptionsFor(section).forEach((w) => {
    const key = cartKey(section.id, effectiveName(item, grind), w.factor);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "weight-btn";
    btn.dataset.key = key;
    fillWeightBtn(btn, w, section, item, grind);
    btn.addEventListener("click", (e) => {
      // الـ ✕ الأحمر الصغير: للتراجع لو العميل داس بالغلط (بيشيل واحدة)
      if (e.target.closest(".wb-undo")) {
        e.stopPropagation();
        changeWeightQty(section, item, w, -1, grind);
        return;
      }
      changeWeightQty(section, item, w, 1, grind);
    });
    grid.appendChild(btn);
  });

  wrap.appendChild(grid);
  return wrap;
}

function fillWeightBtn(btn, w, section, item, grind) {
  const unitNoun = weightUnitNoun(section);
  const unitPrice = Math.round(effectivePrice(item, grind) * w.factor);
  const label = weightLabelFor(w, unitNoun);
  const key = cartKey(section.id, effectiveName(item, grind), w.factor);
  const qty = cart[key] ? cart[key].qty : 0;

  btn.classList.toggle("active", qty > 0);
  btn.innerHTML = `
    ${qty > 0 ? `<span class="wb-badge">${qty}</span><span class="wb-undo" role="button" aria-label="شيل واحدة من السلة" title="شيل واحدة">✕</span>` : ""}
    <span class="wb-label">${label}</span>
    <span class="wb-price">${money(unitPrice)} ج.م</span>
  `;
}

function changeWeightQty(section, item, w, dir, grind) {
  const name = effectiveName(item, grind);
  const key = cartKey(section.id, name, w.factor);
  const unitNoun = weightUnitNoun(section);
  const unitPrice = Math.round(effectivePrice(item, grind) * w.factor);
  const label = weightLabelFor(w, unitNoun);

  if (!cart[key]) {
    cart[key] = {
      name, weightLabel: label, section: section.title, img: item.img, qty: 0,
      subId: section.id, itemName: item.name, factor: w.factor, grindKey: grind ? grind.key : null,
    };
  }
  applyLinePricing(cart[key], item, unitPrice, Math.round(basePriceOf(item, grind) * w.factor));
  cart[key].qty += dir;
  if (cart[key].qty <= 0) delete cart[key];

  document.querySelectorAll(`.weight-btn[data-key="${cssEscape(key)}"]`).forEach((btn) => {
    fillWeightBtn(btn, w, section, item, grind);
  });

  refreshCartUI();
  if (dir > 0) showToast(`✓ اتضاف ${name} (${label}) للسلة`);
  else showToast(`↩️ اتشال ${name} (${label}) من السلة`);
}

// بنحدّث سعر السطر في كل إضافة، فلو العرض بدأ أو خلص بين إضافة والتانية
// السطر ياخد السعر الصح. وبنحفظ السعر الأصلي ووقت انتهاء العرض عشان لو
// العرض خلص والعميل لسه في السلة، السعر يرجع للعادي تلقائي.
function applyLinePricing(line, item, unitPrice, basePrice) {
  line.price = unitPrice;
  if (hasActiveDeal(item)) {
    line.basePrice = basePrice;
    line.dealEndsAt = item.deal.endsAt;
    line.dealPercent = item.deal.percent;
    line.dealId = item.deal.id;
  } else {
    delete line.basePrice;
    delete line.dealEndsAt;
    delete line.dealPercent;
    delete line.dealId;
  }
}

function reconcileCartDeals() {
  const now = Date.now();
  const expired = [];
  let removedAny = false;
  Object.entries(cart).forEach(([key, l]) => {
    if (l.dealEndsAt && l.dealEndsAt <= now) {
      expired.push({ name: l.name, removed: !!l.standaloneDeal });
      if (l.standaloneDeal) { delete cart[key]; removedAny = true; return; } // عرض مستقل مالوش سعر عادي
      l.price = l.basePrice;
      delete l.basePrice;
      delete l.dealEndsAt;
      delete l.dealPercent;
      delete l.dealId;
    }
  });
  if (expired.length) {
    refreshCartUI();
    if (removedAny) rebuildAllCardActions();
    const first = expired[0];
    showToast(first.removed
      ? `⏰ انتهى عرض ${first.name}${expired.length > 1 ? " وغيره" : ""} واتشال من السلة`
      : `⏰ انتهى عرض ${first.name}${expired.length > 1 ? " وغيره" : ""}، واتحسب بالسعر العادي`);
  }
  return expired.length > 0;
}

/* ------------------------------ حفظ واسترجاع السلة ------------------------- */

function cartSignature() {
  return Object.entries(cart).map(([k, l]) => `${k}:${l.qty}`).sort().join("|");
}

function saveCartToStorage() {
  try {
    const sig = cartSignature();
    if (!sig || sig === sentCartSig) { localStorage.removeItem(CART_STORAGE_KEY); return; }
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ ts: Date.now(), lines: cart }));
  } catch (e) { /* تجاهل لو التخزين مش متاح */ }
}

function loadSavedCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (!data || !data.lines || Date.now() - (data.ts || 0) > CART_MAX_AGE) {
      localStorage.removeItem(CART_STORAGE_KEY);
      return;
    }
    Object.entries(data.lines).forEach(([k, l]) => {
      if (l && l.qty > 0 && typeof l.price === "number" && l.name) cart[k] = l;
    });
    restoredFromStorage = Object.keys(cart).length > 0;
  } catch (e) { /* تجاهل */ }
}

function findSubById(subId) {
  for (const section of STORE.sections) {
    const subs = section.tabs ? section.tabs : [section];
    for (const sub of subs) if (sub.id === subId) return sub;
  }
  return null;
}

// بتعيد تسعير كل سطر من الكتالوج الحالي: السعر الجديد، العرض الشغال، وبتشيل
// أي صنف اتحذف أو نفد أو خلص عرضه المستقل
function repriceSavedCart() {
  const changed = [];
  const dropped = [];
  Object.entries(cart).forEach(([key, line]) => {
    // علبة اختيار حر (زي علبة هدايا فرحات)
    if (line.boxSelections) {
      const tab = findLinkedTab({ linkToTab: line.boxLink });
      let ok = !!tab;
      let total = 0;
      const parts = [];
      if (tab) {
        for (const [name, q] of Object.entries(line.boxSelections)) {
          const w = tab.items.find((i) => i.name === name && !i.soldOut);
          if (!w) { ok = false; break; }
          total += w.price * (q * 0.25);
          parts.push(`${name} (${q * 0.25} كجم)`);
        }
      }
      if (!ok) { delete cart[key]; dropped.push(line.name); return; }
      const np = Math.round(total);
      if (np !== line.price) changed.push(line.name);
      line.price = np;
      line.composition = parts.join("، ");
      return;
    }
    // عرض مستقل (مش موجود في الكتالوج)
    if (line.standaloneDeal) {
      const deal = liveDeals().find((d) => d.id === line.dealId);
      if (!deal) { delete cart[key]; dropped.push(line.name); return; }
      const np = Math.round(deal.originalPrice * (1 - deal.discountPercent / 100));
      if (np !== line.price) changed.push(line.name);
      line.price = np;
      line.basePrice = deal.originalPrice;
      line.dealEndsAt = dealEndsMs(deal);
      line.dealPercent = deal.discountPercent;
      return;
    }
    // صنف عادي
    const sub = findSubById(line.subId);
    const item = sub && (sub.items || []).find((i) => i.name === line.itemName);
    if (!item || item.soldOut) { delete cart[key]; dropped.push(line.name); return; }
    const grind = line.grindKey && sub.grindOptions ? (sub.grindOptions.find((g) => g.key === line.grindKey) || null) : null;
    const factor = line.factor || 1;
    const np = Math.round(effectivePrice(item, grind) * factor);
    const nb = Math.round(basePriceOf(item, grind) * factor);
    if (np !== line.price) changed.push(line.name);
    applyLinePricing(line, item, np, nb);
  });
  return { changed, dropped };
}

function finalizeCartRestore() {
  if (cartFinalized) return;
  cartFinalized = true;
  if (!restoredFromStorage) return;
  const { changed, dropped } = repriceSavedCart();
  refreshCartUI();
  rebuildAllCardActions();
  if (Object.keys(cart).length === 0 && dropped.length === 0) return;
  if (dropped.length) showToast(`⚠️ ${dropped.length === 1 ? dropped[0] : `${dropped.length} أصناف`} مبقاش متاح واتشال من سلتك${changed.length ? "، وأسعار تانية اتحدّثت" : ""}`);
  else if (changed.length) showToast("💲 أسعار في سلتك اتحدّثت، راجعها قبل التأكيد");
  else showToast("🛒 رجّعنالك سلتك اللي كنت مجهزها");
}

function markSettled(which) {
  if (which === "products") productsSettled = true;
  else dealsSettled = true;
  if (productsSettled && dealsSettled) finalizeCartRestore();
}

function renderCardAction(slot, section, item, key) {
  slot._ctx = { section, item, key };
  const inCart = cart[key];
  if (!inCart) {
    slot.innerHTML = `<button class="card-add" type="button">${hasActiveDeal(item) ? "🔥 اطلب العرض" : `${addIcon()} أضف للسلة`}</button>`;
    slot.querySelector("button").addEventListener("click", () => {
      changeQty(section, item, key, 1);
    });
  } else {
    slot.innerHTML = `
      <div class="qty-row">
        ${inCart.qty === 1
          ? `<button type="button" class="qty-remove" data-dir="-1" aria-label="شيل من السلة" title="شيل من السلة">✕</button>`
          : `<button type="button" data-dir="-1" aria-label="تقليل">−</button>`}
        <span class="qty-val">${inCart.qty}</span>
        <button type="button" data-dir="1" aria-label="زيادة">+</button>
      </div>`;
    slot.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => changeQty(section, item, key, Number(btn.dataset.dir)));
    });
  }
}

/* --------------------------------- السلة --------------------------------- */

function changeQty(section, item, key, dir) {
  if (!cart[key]) {
    cart[key] = {
      name: item.name, unit: section.unit, section: section.title, img: item.img, qty: 0,
      subId: section.id, itemName: item.name, factor: null, standaloneDeal: section.id === "deals",
    };
  }
  applyLinePricing(cart[key], item, Math.round(effectivePrice(item, null)), Math.round(basePriceOf(item, null)));
  cart[key].qty += dir;
  if (cart[key].qty <= 0) delete cart[key];

  // حدّث كل الكروت اللي بتشاور على نفس الصنف ده على الصفحة
  document.querySelectorAll(`.card-action[data-key="${cssEscape(key)}"]`).forEach((slot) => {
    renderCardAction(slot, section, item, key);
  });

  refreshCartUI();
  if (dir > 0) showToast(`✓ اتضاف ${item.name} للسلة`);
}

function cssEscape(str) { return str.replace(/[|\s]/g, (m) => `\\${m === " " ? " " : m}`); }

function cartCount() { return Object.values(cart).reduce((s, l) => s + l.qty, 0); }
function cartTotalValue() { return Object.values(cart).reduce((s, l) => s + l.qty * l.price, 0); }

function refreshCartUI() {
  saveCartToStorage();
  const count = cartCount();
  const total = cartTotalValue();

  els.cartFab.classList.toggle("visible", count > 0);
  if (els.fabCount.textContent !== String(count)) {
    els.fabCount.classList.remove("pop");
    void els.fabCount.offsetWidth; // ريستارت للأنيميشن
    els.fabCount.classList.add("pop");
  }
  els.fabCount.textContent = count;
  els.fabTotal.textContent = `${money(total)} ج.م`;
  els.cartTotal.textContent = `${money(total)} ج.م`;
  els.confirmBtn.disabled = count === 0;

  els.cartItems.innerHTML = "";
  const lines = Object.entries(cart);

  if (lines.length === 0) {
    els.cartItems.innerHTML = `
      <div class="cart-empty">
        <span class="icon">🛒</span>
        السلة فاضية دلوقتي<br>ابدأ اختار من المنتجات
      </div>`;
    return;
  }

  lines.forEach(([key, line]) => {
    const div = document.createElement("div");
    div.className = "cart-line";
    const thumb = line.img ? `<img src="${line.img}" alt="${line.name}">` : "🛍️";
    div.innerHTML = `
      <button type="button" class="line-remove" data-act="remove" aria-label="حذف ${line.name} من السلة">✕</button>
      <div class="thumb">${thumb}</div>
      <div class="info">
        <h4>${line.name}${line.weightLabel ? ` <span class="line-weight">— ${line.weightLabel}</span>` : ""}</h4>
        ${line.composition ? `<div class="line-composition">${line.composition}</div>` : ""}
        ${line.dealPercent ? `<div class="line-deal">🔥 عرض −${money(line.dealPercent)}% <s>${money(line.basePrice * line.qty)} ج.م</s></div>` : ""}
        <div class="line-price">${money(line.price)} ج.م × ${line.qty} = <strong>${money(line.price * line.qty)} ج.م</strong></div>
      </div>
      <div class="qty-row">
        <button type="button" data-act="dec">−</button>
        <span class="qty-val">${line.qty}</span>
        <button type="button" data-act="inc">+</button>
      </div>
    `;
    div.querySelector('[data-act="inc"]').addEventListener("click", () => bumpLine(key, 1));
    div.querySelector('[data-act="dec"]').addEventListener("click", () => bumpLine(key, -1));
    div.querySelector('[data-act="remove"]').addEventListener("click", () => removeLine(key));
    els.cartItems.appendChild(div);
  });
}

function removeLine(key) {
  if (!cart[key]) return;
  delete cart[key];
  refreshCartUI();
  rebuildAllCardActions();
}

function bumpLine(key, dir) {
  if (!cart[key]) return;
  cart[key].qty += dir;
  if (cart[key].qty <= 0) delete cart[key];
  refreshCartUI();
  rebuildAllCardActions();
}

function refreshWeightBadge(btn) {
  const key = btn.dataset.key;
  const qty = cart[key] ? cart[key].qty : 0;
  btn.classList.toggle("active", qty > 0);
  const existingBadge = btn.querySelector(".wb-badge");
  if (qty > 0) {
    if (existingBadge) existingBadge.textContent = qty;
    else btn.insertAdjacentHTML("afterbegin", `<span class="wb-badge">${qty}</span><span class="wb-undo" role="button" aria-label="شيل واحدة من السلة" title="شيل واحدة">✕</span>`);
  } else if (existingBadge) {
    existingBadge.remove();
    btn.querySelector(".wb-undo")?.remove();
  }
}

function rebuildAllCardActions() {
  // كروت الوزن (بما فيها أنواع القهوة سادة/محوج) بترجع حالتها من data-key
  // بتاعها مباشرة، فمش محتاجين نعيد حساب الاسم الفعلي (مع/من غير التحويج) هنا
  document.querySelectorAll(".weight-btn").forEach(refreshWeightBadge);

  document.querySelectorAll(".card-action").forEach((slot) => {
    if (slot._ctx) renderCardAction(slot, slot._ctx.section, slot._ctx.item, slot._ctx.key);
  });
}

/* ------------------------------- فتح/قفل السلة ---------------------------- */

function openCart() {
  els.overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}
function closeCart() {
  els.overlay.classList.remove("open");
  document.body.style.overflow = "";
}

els.cartFab.addEventListener("click", openCart);
els.overlay.addEventListener("click", (e) => { if (e.target === els.overlay) closeCart(); });
document.getElementById("cartCloseBtn").addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (els.sectionsMenuOverlay.classList.contains("open")) closeSectionsMenu();
  else if (els.searchOverlay.classList.contains("open")) closeSearch();
  else if (els.boxOverlay.classList.contains("open")) closeBoxBuilder();
  else closeCart();
});

/* ------------------------------- منطقة التوصيل ----------------------------- */

function setupDeliveryRegion() {
  els.custRegion.innerHTML = "";

  const localOpt = document.createElement("option");
  localOpt.value = "local";
  localOpt.textContent = "داخل المنزلة";
  els.custRegion.appendChild(localOpt);

  const group = document.createElement("optgroup");
  group.label = "محافظة تانية";
  EGYPT_GOVERNORATES.forEach((gov) => {
    const opt = document.createElement("option");
    opt.value = gov;
    opt.textContent = gov;
    group.appendChild(opt);
  });
  els.custRegion.appendChild(group);

  updateDeliveryHint();
  els.custRegion.addEventListener("change", () => {
    updateDeliveryHint();
    saveCustomerInfo();
  });
}

function updateDeliveryHint() {
  if (els.custRegion.value === "local") {
    els.deliveryHint.textContent =
      "🛵 التوصيل داخل المنزلة من 15 لـ 20 جنيه حسب قرب أو بعد عنوانك، هيتأكد لك في الشات.";
  } else {
    els.deliveryHint.textContent =
      "📦 التوصيل بره المنزلة بيتحدد حسب وزن الطلب، هنأكدلك تكلفة الشحن بالظبط في الشات بعد إرسال طلبك.";
  }
}

/* -------------------------------- الطلب في واتساب -------------------------- */

function buildOrderMessage() {
  const lines = Object.values(cart);
  let msg = `*طلب جديد من موقع ${STORE.name}* 🛍️\n\n`;

  const bySection = {};
  lines.forEach((l) => {
    if (!bySection[l.section]) bySection[l.section] = [];
    bySection[l.section].push(l);
  });

  Object.entries(bySection).forEach(([sectionName, items]) => {
    msg += `*${sectionName}*\n`;
    items.forEach((l) => {
      const weightPart = l.weightLabel ? ` (${l.weightLabel})` : "";
      const dealPart = l.dealPercent ? ` 🔥(عرض −${l.dealPercent}%)` : "";
      msg += `• ${l.name}${weightPart} × ${l.qty} — ${money(l.price * l.qty)} ج.م${dealPart}\n`;
      if (l.composition) msg += `   🍫 ${l.composition}\n`;
    });
    msg += `\n`;
  });

  msg += `*الإجمالي: ${money(cartTotalValue())} ج.م*\n`;

  const name = els.custName.value.trim();
  const phone = cleanPhone(els.custPhone.value);
  const address = els.custAddress.value.trim();
  const note = els.custNote.value.trim();
  const region = els.custRegion.value;

  if (name || phone || address || note) {
    msg += `\n------------------\n`;
    if (name) msg += `👤 الاسم: ${name}\n`;
    if (phone) msg += `📱 الموبايل: ${phone}\n`;
    if (address) msg += `📍 العنوان: ${address}\n`;
    if (note) msg += `📝 ملاحظات: ${note}\n`;
  }

  if (region === "local") {
    msg += `🛵 منطقة التوصيل: داخل المنزلة (التوصيل من 15 إلى 20 جنيه حسب موقعي بالظبط)\n`;
  } else {
    msg += `📦 منطقة التوصيل: محافظة ${region} (محتاج أعرف تكلفة الشحن حسب وزن الطلب)\n`;
  }

  return msg;
}

els.confirmBtn.addEventListener("click", () => {
  if (cartCount() === 0) return;
  reconcileCartDeals(); // لو عرض خلص وقته والعميل لسه في السلة، السعر يرجع للعادي قبل الإرسال
  if (!validateCustomerFields()) return;
  const text = encodeURIComponent(buildOrderMessage());
  const url = `https://wa.me/${STORE.whatsapp}?text=${text}`;
  window.open(url, "_blank");
  logOrderToFirestore(); // من غير ما ننتظرها، عشان متأخرش فتح واتساب
  sentCartSig = cartSignature(); // الطلب اتبعت: لو عمل ريفريش تبقى السلة فاضية مش طلب مكرر
  saveCartToStorage();
});

// بتسجّل الطلب في لوحة التحكم (لو الاتصال بـ Firebase شغال). لو فشلت لأي
// سبب (نت واقع، إعدادات لسه ماتظبطتش)، الطلب برضو بيوصل عادي على واتساب —
// دي مجرد نسخة إضافية للإحصائيات، مش شرط لإتمام الطلب.
function logOrderToFirestore() {
  if (!window.Farahat || !window.Farahat.addOrder) return;
  const items = Object.values(cart).map((l) => ({
    name: l.name,
    price: l.price,
    qty: l.qty,
    weightLabel: l.weightLabel || null,
    composition: l.composition || null,
    section: l.section,
    dealPercent: l.dealPercent || null,
  }));
  window.Farahat
    .addOrder({
      items,
      total: cartTotalValue(),
      customerName: els.custName.value.trim(),
      customerPhone: cleanPhone(els.custPhone.value),
      address: els.custAddress.value.trim(),
      note: els.custNote.value.trim(),
      region: els.custRegion.value,
      status: "pending",
    })
    .catch((e) => console.warn("Farahat: تعذّر تسجيل الطلب في لوحة التحكم.", e));
}

/* ---------------------- التحقق المنطقي من بيانات العميل --------------------- */
// الاسم لازم يبقى اسم حقيقي (كلمتين حروف بس)، والموبايل لازم رقم مصري صحيح
// (11 رقم بيبدأ بـ 010/011/012/015). الأرقام العربي (٠١٢) بتتحوّل لإنجليزي
// لوحدها، و+20 بتتحوّل لـ 0، وأي حرف زيادة في الرقم بيتشال وهو بيكتب.

function toLatinDigits(str) {
  return str
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
}

function cleanPhone(raw) {
  let d = toLatinDigits(raw || "").replace(/[^0-9+]/g, "");
  if (d.startsWith("+20")) d = "0" + d.slice(3);
  else if (d.startsWith("0020")) d = "0" + d.slice(4);
  else if (/^20(1[0125])/.test(d) && d.length >= 12) d = "0" + d.slice(2);
  return d.replace(/\D/g, "").slice(0, 11);
}

function checkName(raw) {
  const name = (raw || "").replace(/\s+/g, " ").trim();
  if (!name) return "من فضلك اكتب اسمك";
  if (/[0-9٠-٩۰-۹]/.test(name)) return "الاسم مينفعش يحتوي على أرقام";
  if (/[^\u0600-\u06FFa-zA-Z\s.'-]/.test(name)) return "الاسم لازم يكون حروف بس";
  const words = name.split(" ").filter((w) => w.replace(/[^\u0600-\u06FFa-zA-Z]/g, "").length >= 2);
  if (words.length < 2) return "اكتب اسمك الأول والأخير (كلمتين على الأقل)";
  if (/(.)\1{3,}/.test(name)) return "الاسم شكله مش صحيح، اكتبه تاني";
  return "";
}

function checkPhone(raw) {
  const d = cleanPhone(raw);
  if (!d) return "من فضلك اكتب رقم الموبايل";
  if (!/^01[0125]/.test(d)) return "الرقم لازم يبدأ بـ 010 أو 011 أو 012 أو 015";
  if (d.length < 11) return `الرقم ناقص — لسه ${11 - d.length} أرقام`;
  return "";
}

function checkAddress(raw) {
  const a = (raw || "").replace(/\s+/g, " ").trim();
  if (!a) return "من فضلك اكتب عنوانك";
  if (a.length < 6 || !/[\u0600-\u06FFa-zA-Z]/.test(a)) return "اكتب عنوانك بالتفصيل (المنطقة واسم الشارع)";
  return "";
}

const FIELD_RULES = [
  { el: els.custName, errId: "nameError", check: checkName },
  { el: els.custPhone, errId: "phoneError", check: checkPhone },
  { el: els.custAddress, errId: "addressError", check: checkAddress },
];

function showFieldState(rule, message, { silentIfEmpty = false } = {}) {
  const errEl = document.getElementById(rule.errId);
  const empty = !rule.el.value.trim();
  if (message && !(silentIfEmpty && empty)) {
    rule.el.classList.add("invalid");
    rule.el.classList.remove("valid");
    errEl.textContent = message;
    errEl.classList.add("visible");
  } else {
    rule.el.classList.remove("invalid");
    errEl.classList.remove("visible");
    rule.el.classList.toggle("valid", !message);
  }
}

function validateCustomerFields() {
  let ok = true;
  FIELD_RULES.forEach((rule) => {
    const msg = rule.check(rule.el.value);
    showFieldState(rule, msg);
    if (msg) ok = false;
  });
  if (!ok) {
    const firstInvalid = document.querySelector(".cart-form .invalid");
    if (firstInvalid) firstInvalid.focus();
    showToast("راجع البيانات المكتوبة بالأحمر قبل تأكيد الطلب");
  }
  return ok;
}

els.custPhone.setAttribute("autocomplete", "tel");
els.custPhone.setAttribute("maxlength", "16");
els.custName.setAttribute("autocomplete", "name");
els.custAddress.setAttribute("autocomplete", "street-address");

FIELD_RULES.forEach((rule) => {
  rule.el.addEventListener("input", () => {
    if (rule.el === els.custPhone) {
      // بنشيل أي حاجة مش رقم أثناء الكتابة ونحوّل الأرقام العربي
      const cleaned = toLatinDigits(rule.el.value).replace(/[^0-9+\s]/g, "");
      if (cleaned !== rule.el.value) rule.el.value = cleaned;
    }
    // لو الحقل كان فيه خطأ أو العميل كتب كفاية، نراجع وهو بيكتب
    const msg = rule.check(rule.el.value);
    if (rule.el.classList.contains("invalid") || !msg) showFieldState(rule, msg);
    else rule.el.classList.remove("valid");
  });
  rule.el.addEventListener("blur", () => {
    if (rule.el === els.custPhone) {
      const d = cleanPhone(rule.el.value);
      if (d) rule.el.value = d;
    }
    if (rule.el === els.custName) rule.el.value = rule.el.value.replace(/\s+/g, " ").trim();
    showFieldState(rule, rule.check(rule.el.value), { silentIfEmpty: true });
  });
});

/* --------------------------------- توست بسيط ------------------------------ */

let toastTimer;
function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 1800);
}

/* --------------------------- تفعيل رابط القسم النشط ------------------------ */

function setupScrollSpy() {
  const sections = STORE.sections.map((s) => document.getElementById(s.id));
  const navLinks = [...els.nav.querySelectorAll("a")];

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${id}`));
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
  );
  sections.forEach((s) => s && io.observe(s));
}

/* ------------------------------ أنيميشن الظهور ----------------------------- */

function setupScrollReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("in-view"));
    return;
  }
  const io = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  items.forEach((el) => io.observe(el));
}

/* ------------------------------------ بدء ---------------------------------- */

document.getElementById("brandName").textContent = STORE.name;
document.getElementById("heroWhatsappLink").href = `https://wa.me/${STORE.whatsapp}`;
document.getElementById("footerWhatsappLink").href = `https://wa.me/${STORE.whatsapp}`;
document.getElementById("facebookLink").href = STORE.facebook;
document.getElementById("instagramLink").href = STORE.instagram;
document.getElementById("heroLocationLink").href = STORE.mapsUrl;
document.getElementById("footerMapsLink").href = STORE.mapsUrl;
document.querySelectorAll(".js-phone-display").forEach((el) => (el.textContent = "0" + STORE.whatsapp.slice(2)));
document.querySelectorAll(".js-phone-link").forEach((el) => (el.href = `tel:0${STORE.whatsapp.slice(2)}`));
document.querySelectorAll(".js-address").forEach((el) => (el.textContent = STORE.address));

loadSavedCart();
buildSections();
buildSectionsMenu();
searchIndex = buildSearchIndex();
setupScrollSpy();
setupScrollReveal();
setupNavScrollHint();
setupToTopButton();
refreshCartUI();
setupDeliveryRegion();
restoreCustomerInfo();

requestAnimationFrame(() => {
  setTimeout(() => document.querySelector(".hero-content").classList.add("in-view"), 80);
});

// حفظ بسيط لبيانات العميل بمتصفحه (اسم/موبايل/عنوان/منطقة) عشان مايكتبهاش كل مرة
function saveCustomerInfo() {
  try {
    localStorage.setItem(
      "farahat_customer",
      JSON.stringify({
        name: els.custName.value,
        phone: els.custPhone.value,
        address: els.custAddress.value,
        region: els.custRegion.value,
      })
    );
  } catch (e) { /* تجاهل لو المتصفح مايدعمش */ }
}

function restoreCustomerInfo() {
  try {
    const saved = JSON.parse(localStorage.getItem("farahat_customer") || "{}");
    if (saved.name) els.custName.value = saved.name;
    if (saved.phone) els.custPhone.value = saved.phone;
    if (saved.address) els.custAddress.value = saved.address;
    if (saved.region) {
      els.custRegion.value = saved.region;
      updateDeliveryHint();
    }
  } catch (e) { /* تجاهل لو المتصفح مايدعمش */ }
  [els.custName, els.custPhone, els.custAddress].forEach((input) =>
    input.addEventListener("change", saveCustomerInfo)
  );
}

/* ------------------------------- شاشة التحميل ------------------------------ */
// بتظهر 3 ثواني كل مرة الصفحة بتفتح فيها (مش مرة واحدة بس)، عشان تدي شكل
// جمالي هادئ في البداية بدل ما المحتوى يظهر فجأة.

(function initPageLoader() {
  const loader = document.getElementById("pageLoader");
  if (!loader) return;
  setTimeout(() => {
    loader.classList.add("hide");
    document.body.classList.remove("loading");
    loader.addEventListener("transitionend", () => loader.remove(), { once: true });
  }, 3000);
})();

/* --------------------- ربط المنتجات الحية من لوحة التحكم ------------------- */
// الموقع بيتبني الأول بالأسعار الأساسية اللي في data.js (عشان يظهر فورًا من
// غير ما ينتظر النت)، وبعد كده لو لقى منتجات محدّثة من لوحة التحكم (Firestore)
// بيستبدلها بهدوء من غير ما يحتاج تحميل الصفحة تاني.

function mergeLiveProducts(products) {
  if (!Array.isArray(products) || products.length === 0) return false;

  const bySectionTab = {};
  products.forEach((p) => {
    const key = `${p.sectionId}::${p.tabId || ""}`;
    if (!bySectionTab[key]) bySectionTab[key] = [];
    if (p.active === false) return; // صنف مخفي من لوحة التحكم — يتسجل مكانه بس مايتعرضش
    bySectionTab[key].push(p);
  });

  let changed = false;
  STORE.sections.forEach((section) => {
    if (section.tabs) {
      section.tabs.forEach((tab) => {
        const key = `${section.id}::${tab.id}`;
        if (bySectionTab[key]) {
          tab.items = bySectionTab[key];
          changed = true;
        }
      });
    } else {
      const key = `${section.id}::`;
      if (bySectionTab[key]) {
        section.items = bySectionTab[key];
        changed = true;
      }
    }
  });
  return changed;
}

/* ------------------------------- سلايدر عام ------------------------------- */
// بيتستخدم في سلايدر العروض، وفي شبكات المنتجات على الموبايل (سحب أفقي بدل
// الطول الكبير). كله بيعتمد على scroll-snap بتاع المتصفح فالحركة ناعمة وطبيعية.

function isRtl(el) { return getComputedStyle(el).direction === "rtl"; }

function sliderMove(track, dir) {
  const step = Math.max(160, track.clientWidth * 0.85);
  track.scrollBy({ left: (isRtl(track) ? -1 : 1) * dir * step, behavior: "smooth" });
}

function sliderMetrics(track) {
  const max = Math.max(0, track.scrollWidth - track.clientWidth);
  return { max, pos: Math.min(max, Math.abs(track.scrollLeft)) };
}

// حالة "عرض الكل" لكل شبكة (بتفضل محفوظة لحد ما الصفحة تتقفل). الأقسام
// الكبيرة (أكتر من 24 صنف زي الشكولاتة بالوزن) بتفتح "عرض الكل" من الأول.
const expandedGrids = {};
const AUTO_EXPAND_OVER = 24;

function gridKey(grid) {
  const panel = grid.closest(".mood-panel");
  return panel ? `tab:${panel.dataset.tab}` : `sec:${grid.closest(".product-section")?.id || ""}`;
}
function isGridExpanded(grid) {
  const k = gridKey(grid);
  if (k in expandedGrids) return expandedGrids[k];
  return grid.children.length > AUTO_EXPAND_OVER;
}

function updateSliderUIs() {
  document.querySelectorAll(".gs-controls").forEach((ctl) => {
    const grid = ctl.previousElementSibling;
    if (!grid) return;
    const count = grid.children.length;
    const expanded = isGridExpanded(grid);
    grid.classList.toggle("grid-expanded", expanded);

    ctl.hidden = count <= 4;
    const toggle = ctl.querySelector(".gs-toggle");
    toggle.textContent = expanded ? "⬆ عرض أقل (سحب أفقي)" : `عرض كل الـ ${money(count)} صنف ⬇`;

    const swipe = ctl.querySelector(".gs-swipe");
    const { max, pos } = sliderMetrics(grid);
    const overflow = !expanded && max > 6 && grid.clientWidth > 0;
    swipe.hidden = !overflow;
    if (!overflow) return;
    const fill = ctl.querySelector(".gs-progress span");
    const widthPct = Math.max(14, (grid.clientWidth / grid.scrollWidth) * 100);
    fill.style.width = `${widthPct}%`;
    fill.style.right = `${(pos / max) * (100 - widthPct)}%`;
    ctl.querySelector(".gs-prev").disabled = pos < 4;
    ctl.querySelector(".gs-next").disabled = pos > max - 4;
  });
  const dealsTrack = document.getElementById("dealsGrid");
  if (dealsTrack && dealsTrack._update) dealsTrack._update();
}

function enhanceGridSliders() {
  document.querySelectorAll("#sections .grid").forEach((grid) => {
    const next = grid.nextElementSibling;
    if (next && next.classList.contains("gs-controls")) return;
    const ctl = document.createElement("div");
    ctl.className = "gs-controls";
    ctl.hidden = true;
    ctl.innerHTML = `
      <div class="gs-swipe">
        <button type="button" class="gs-btn gs-prev" aria-label="السابق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg></button>
        <div class="gs-mid"><span class="gs-hint">اسحب لمزيد من المنتجات</span><div class="gs-progress"><span></span></div></div>
        <button type="button" class="gs-btn gs-next" aria-label="التالي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg></button>
      </div>
      <button type="button" class="gs-toggle"></button>
    `;
    grid.after(ctl);
    ctl.querySelector(".gs-prev").addEventListener("click", () => sliderMove(grid, -1));
    ctl.querySelector(".gs-next").addEventListener("click", () => sliderMove(grid, 1));
    ctl.querySelector(".gs-toggle").addEventListener("click", () => {
      const nowExpanded = !isGridExpanded(grid);
      expandedGrids[gridKey(grid)] = nowExpanded;
      grid.classList.toggle("grid-expanded", nowExpanded);
      if (!nowExpanded) {
        grid.scrollLeft = 0;
        grid.closest(".product-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      updateSliderUIs();
    });
    let raf = 0;
    grid.addEventListener("scroll", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateSliderUIs);
    }, { passive: true });
  });
  requestAnimationFrame(updateSliderUIs);
}
window.addEventListener("resize", () => requestAnimationFrame(updateSliderUIs));

function initDealsSlider() {
  const slider = document.getElementById("dealsSlider");
  const track = document.getElementById("dealsGrid");
  if (!slider || !track) return;
  const prev = slider.querySelector(".ds-prev");
  const next = slider.querySelector(".ds-next");
  const dots = slider.querySelector(".ds-dots");
  const slides = [...track.children];

  dots.innerHTML = slides.map((_, i) => `<button type="button" class="ds-dot" aria-label="العرض ${i + 1}"></button>`).join("");
  dots.hidden = slides.length <= 1;
  dots.querySelectorAll(".ds-dot").forEach((d, i) => {
    d.addEventListener("click", () => slides[i].scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" }));
  });

  track._update = () => {
    const list = [...track.children];
    if (!list.length) return;
    const tr = track.getBoundingClientRect();
    const rtl = isRtl(track);
    const { max, pos } = sliderMetrics(track);
    let best = 0, bestDist = Infinity;
    list.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const dist = rtl ? Math.abs(tr.right - r.right) : Math.abs(r.left - tr.left);
      if (dist < bestDist) { bestDist = dist; best = i; }
      const visible = Math.min(r.right, tr.right) - Math.max(r.left, tr.left);
      c.classList.toggle("in-view", visible >= r.width * 0.6);
    });
    dots.querySelectorAll(".ds-dot").forEach((d, i) => d.classList.toggle("active", i === best));
    const noOverflow = max <= 6;
    prev.hidden = next.hidden = noOverflow;
    prev.disabled = pos < 4;
    next.disabled = pos > max - 4;
  };

  if (!track._init) {
    track._init = true;
    prev.addEventListener("click", () => sliderMove(track, -1));
    next.addEventListener("click", () => sliderMove(track, 1));
    let raf = 0;
    track.addEventListener("scroll", () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => track._update());
    }, { passive: true });
  }
  track.scrollLeft = 0;
  requestAnimationFrame(() => track._update());
}

/* -------------------------------- عروض اليوم ------------------------------- */
// العرض ممكن يكون على منتج موجود في الموقع (وقتها كارت المنتج نفسه في قسمه
// بيتغير: بادچ "عرض" + السعر القديم مشطوب + السعر الجديد + عدّاد)، أو عرض
// مستقل مش موجود في الكتالوج. الاتنين بيظهروا في سلايدر "عروض اليوم" وفيه
// أزرار الطلب المباشر. وأول ما وقت العرض يخلص كل حاجة بترجع لطبيعتها لوحدها.

function dealEndsAtDate(deal) {
  if (deal.endsAt && typeof deal.endsAt.toDate === "function") return deal.endsAt.toDate();
  return new Date(deal.endsAt);
}
function dealEndsMs(deal) { return dealEndsAtDate(deal).getTime(); }
function liveDeals() {
  const now = Date.now();
  return allDeals.filter((d) => d.active !== false && dealEndsMs(d) > now);
}

function findItemForDeal(deal) {
  if (!deal.sourceName) return null;
  const subId = deal.sourceTabId || deal.sourceSectionId;
  for (const section of STORE.sections) {
    const subs = section.tabs ? section.tabs : [section];
    for (const sub of subs) {
      if (sub.id !== subId) continue;
      const item = (sub.items || []).find((i) => i.name === deal.sourceName);
      if (item) return { sub, item };
    }
  }
  return null;
}

// بتربط كل عرض شغال بالصنف بتاعه في الكتالوج، وبترجّع الأصناف اللي حالتها اتغيرت
function applyDealsToCatalog() {
  const map = new Map();
  liveDeals().forEach((deal) => {
    const found = findItemForDeal(deal);
    if (found && !map.has(found.item)) {
      map.set(found.item, { id: deal.id, percent: deal.discountPercent, endsAt: dealEndsMs(deal) });
    }
  });
  const sig = (d) => (d ? `${d.id}|${d.percent}|${d.endsAt}` : "");
  const changed = [];
  STORE.sections.forEach((section) => {
    (section.tabs ? section.tabs : [section]).forEach((sub) => {
      (sub.items || []).forEach((item) => {
        const nextDeal = map.get(item) || null;
        if (sig(item.deal) !== sig(nextDeal)) {
          item.deal = nextDeal;
          changed.push({ sub, item });
        }
      });
    });
  });
  const ends = liveDeals().map(dealEndsMs);
  nextDealExpiry = ends.length ? Math.min(...ends) : 0;
  return changed;
}

function replaceChangedCards(changed) {
  changed.forEach(({ sub, item }) => {
    const old = document.querySelector(`.card[data-search-id="${cssEscape(sub.id + "::" + item.name)}"]`);
    if (old) old.replaceWith(buildCard(sub, item));
  });
  if (changed.length) requestAnimationFrame(updateSliderUIs);
}

function syncDeals() {
  const changed = applyDealsToCatalog();
  replaceChangedCards(changed);
  renderDeals();
  searchIndex = buildSearchIndex();
  ensureDealsTicker();
}

function loadDeals() {
  if (!window.Farahat || !window.Farahat.fetchDeals) { markSettled("deals"); return; }
  window.Farahat.fetchDeals()
    .then((list) => { allDeals = list; syncDeals(); })
    .catch((e) => console.warn("Farahat: تعذّر تحميل عروض اليوم.", e))
    .finally(() => markSettled("deals"));
}

function renderDeals() {
  const track = document.getElementById("dealsGrid");
  const slider = document.getElementById("dealsSlider");
  const empty = document.getElementById("dealsEmpty");
  const countEl = document.getElementById("dealsCount");
  if (!track || !slider || !empty) return;

  const deals = liveDeals();
  track.innerHTML = "";
  if (deals.length === 0) {
    slider.hidden = true;
    empty.hidden = false;
    if (countEl) countEl.textContent = "";
    return;
  }

  deals.forEach((deal) => {
    const found = findItemForDeal(deal);
    let sub, item;
    if (found && found.item.deal && found.item.deal.id === deal.id) {
      sub = found.sub;
      item = found.item;
    } else {
      sub = DEAL_PSEUDO_SECTION;
      item = {
        name: deal.name,
        price: deal.originalPrice,
        img: deal.img,
        deal: { id: deal.id, percent: deal.discountPercent, endsAt: dealEndsMs(deal) },
      };
    }
    const card = buildCard(sub, item, { slide: true });
    card.classList.add("deal-slide");
    track.appendChild(card);
  });

  empty.hidden = true;
  slider.hidden = false;
  if (countEl) countEl.textContent = `${deals.length} ${deals.length === 1 ? "عرض شغال" : "عروض شغالة"}`;
  initDealsSlider();
  tickDeals();
}

function ensureDealsTicker() {
  const need = nextDealExpiry > 0 || Object.values(cart).some((l) => l.dealEndsAt);
  if (need && !dealsTicker) dealsTicker = setInterval(tickDeals, 1000);
  if (!need && dealsTicker) { clearInterval(dealsTicker); dealsTicker = null; }
}

function tickDeals() {
  const now = Date.now();
  const pad = (n) => String(n).padStart(2, "0");
  document.querySelectorAll(".cdt[data-ends]").forEach((el) => {
    el.textContent = formatRemaining(Number(el.dataset.ends) - now);
  });
  document.querySelectorAll(".deal-timer[data-ends]").forEach((el) => {
    const diff = Math.max(0, Number(el.dataset.ends) - now);
    el.querySelector(".dt-h").textContent = pad(Math.floor(diff / 3600000));
    el.querySelector(".dt-m").textContent = pad(Math.floor((diff % 3600000) / 60000));
    el.querySelector(".dt-s").textContent = pad(Math.floor((diff % 60000) / 1000));
  });
  if (nextDealExpiry && now >= nextDealExpiry) syncDeals();
  reconcileCartDeals();
  if (!nextDealExpiry && !Object.values(cart).some((l) => l.dealEndsAt)) ensureDealsTicker();
}

window.addEventListener("farahat-products-ready", (e) => {
  const changed = mergeLiveProducts(e.detail);
  if (!changed) return;
  buildSections();
  searchIndex = buildSearchIndex();
  setupScrollSpy();
  setupScrollReveal();
  setupNavScrollHint();
  rebuildAllCardActions();
  syncDeals();
});

function startFirebaseSync() {
  window.Farahat.fetchProducts()
    .then((products) => window.dispatchEvent(new CustomEvent("farahat-products-ready", { detail: products })))
    .catch((e) => console.warn("Farahat: تعذّر تحميل المنتجات المحدّثة، هيفضل يظهر السعر الأساسي.", e))
    .finally(() => markSettled("products"));
  window.Farahat.incrementVisit();
  loadDeals();
}

if (window.Farahat) {
  startFirebaseSync();
} else {
  window.addEventListener("farahat-firebase-ready", startFirebaseSync);
}
// لو الاتصال بـ Firebase اتأخر أو مااشتغلش، السلة برضو ترجع بأسعار الكتالوج الأساسي
setTimeout(finalizeCartRestore, 8000);



/* ------------------------------ الوضع الداكن / الفاتح ---------------------- */
// الاختيار بيتحفظ في المتصفح، ولو العميل مااختارش حاجة بنتبع إعداد جهازه.

(function setupThemeToggle() {
  const btn = document.getElementById("themeToggleBtn");
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const apply = (mode) => {
    root.setAttribute("data-theme", mode);
    if (meta) meta.setAttribute("content", mode === "dark" ? "#12160e" : "#faf5ea");
  };
  apply(root.getAttribute("data-theme") === "dark" ? "dark" : "light");
  if (btn) {
    btn.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.classList.add("theme-anim");
      apply(next);
      try { localStorage.setItem("farahat_theme", next); } catch (e) { /* تجاهل */ }
      setTimeout(() => root.classList.remove("theme-anim"), 450);
    });
  }
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener && mq.addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem("farahat_theme"); } catch (err) { /* تجاهل */ }
    if (!saved) apply(e.matches ? "dark" : "light");
  });
})();
