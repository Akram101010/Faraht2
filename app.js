/* ============================== منطق الموقع ============================== */

const cart = {}; // key: "sectionId|itemName" أو "sectionId|itemName|factor" لو الصنف بيتباع بالوزن

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
      sortByPrice(section.items).forEach((item) => grid.appendChild(buildCard(section, item)));
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
}

/* --------------------------- قسم بتبويبات (المزاج) ------------------------- */

function sortByPrice(items) {
  return [...items].sort((a, b) => {
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
      sortByPrice(tab.items).forEach((item) => grid.appendChild(buildCard(tab, item)));
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

function buildCard(section, item) {
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.searchId = `${section.id}::${item.name}`;

  const bestsellerBadge = item.bestseller
    ? `<span class="badge-bestseller"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6L12 2z"/></svg>الأكثر طلبًا</span>`
    : "";
  const media = item.img
    ? `<div class="card-media">${bestsellerBadge}<img src="${item.img}" alt="${item.name}" loading="lazy"></div>`
    : `<div class="card-media placeholder">${bestsellerBadge}${section.icon}</div>`;

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

  if (section.hasWeights) {
    const hasGrind = Array.isArray(section.grindOptions) && section.grindOptions.length > 1 && !item.noGrind;
    card.innerHTML = `
      ${media}
      <div class="card-body">
        <h3>${item.name}</h3>
        <div class="card-price-row">
          <span class="card-price">${money(item.price)} <span style="font-size:.65em;font-weight:700;">ج.م</span></span>
          <span class="card-unit">${section.unit}</span>
        </div>
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
          <span class="card-price">${money(item.price)} <span style="font-size:.65em;font-weight:700;">ج.م</span></span>
          <span class="card-unit">${section.unit}</span>
        </div>
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
  tab.items.filter((wItem) => !wItem.excludeFromBox).forEach((wItem) => {
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
        item.classList.toggle("open");
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
        const priceLabel = item.customBox
          ? `من ${item.minWeight} لـ ${item.maxWeight} ${item.weightUnitLabel || "كيلو"}`
          : `${money(item.price)} ج.م`;
        idx.push({
          name: item.name,
          img: item.img,
          sectionId: sub.id,
          pathLabel: parentTitle ? `${parentTitle} › ${sub.title}` : sub.title,
          priceLabel,
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
        <h4>${entry.name}</h4>
        <div class="sr-path">${entry.pathLabel}</div>
      </div>
      <div class="sr-price">${entry.priceLabel}</div>
    `;
    row.addEventListener("click", () => goToSearchResult(entry));
    els.searchResults.appendChild(row);
  });
}

function goToSearchResult(entry) {
  closeSearch();

  const tabBtn = document.querySelector(`.mood-tab[data-tab="${cssEscape(entry.sectionId)}"]`);
  if (tabBtn) tabBtn.click();

  requestAnimationFrame(() => {
    const card = document.querySelector(`.card[data-search-id="${cssEscape(entry.sectionId + "::" + entry.name)}"]`);
    if (card) {
      card.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        card.classList.add("search-highlight");
        const media = card.querySelector(".card-media");
        let tag = null;
        if (media) {
          tag = document.createElement("span");
          tag.className = "search-found-tag";
          tag.textContent = "🔍 ده اللي دورت عليه";
          media.appendChild(tag);
        }
        setTimeout(() => {
          card.classList.remove("search-highlight");
          if (tag) tag.remove();
        }, 2400);
      }, 380);
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
      priceEl.innerHTML = `${money(effectivePrice(item, currentGrind(section, item)))} <span style="font-size:.65em;font-weight:700;">ج.م</span>`;
    });
  });

  refreshActive();
}

function effectivePrice(item, grind) {
  return item.price + (grind ? grind.priceAdd || 0 : 0);
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
    btn.addEventListener("click", () => changeWeightQty(section, item, w, 1, grind));
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
    ${qty > 0 ? `<span class="wb-badge">${qty}</span>` : ""}
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
    cart[key] = { name, price: unitPrice, weightLabel: label, section: section.title, img: item.img, qty: 0 };
  }
  cart[key].qty += dir;
  if (cart[key].qty <= 0) delete cart[key];

  document.querySelectorAll(`.weight-btn[data-key="${cssEscape(key)}"]`).forEach((btn) => {
    fillWeightBtn(btn, w, section, item, grind);
  });

  refreshCartUI();
  if (dir > 0) showToast(`✓ اتضاف ${name} (${label}) للسلة`);
}

function renderCardAction(slot, section, item, key) {
  const inCart = cart[key];
  if (!inCart) {
    slot.innerHTML = `<button class="card-add" type="button">${addIcon()} أضف للسلة</button>`;
    slot.querySelector("button").addEventListener("click", () => {
      changeQty(section, item, key, 1);
    });
  } else {
    slot.innerHTML = `
      <div class="qty-row">
        <button type="button" data-dir="-1" aria-label="تقليل">−</button>
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
    cart[key] = { name: item.name, price: item.price, unit: section.unit, section: section.title, img: item.img, qty: 0 };
  }
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
    else btn.insertAdjacentHTML("afterbegin", `<span class="wb-badge">${qty}</span>`);
  } else if (existingBadge) {
    existingBadge.remove();
  }
}

function rebuildAllCardActions() {
  // كروت الوزن (بما فيها أنواع القهوة سادة/محوج) بترجع حالتها من data-key
  // بتاعها مباشرة، فمش محتاجين نعيد حساب الاسم الفعلي (مع/من غير التحويج) هنا
  document.querySelectorAll(".weight-btn").forEach(refreshWeightBadge);

  STORE.sections.forEach((section) => {
    const targets = section.tabs ? section.tabs : [section];
    targets.forEach((sub) => {
      if (sub.hasWeights) return;
      sub.items.forEach((item) => {
        const key = cartKey(sub.id, item.name);
        document.querySelectorAll(`.card-action[data-key="${cssEscape(key)}"]`).forEach((slot) => {
          renderCardAction(slot, sub, item, key);
        });
      });
    });
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
      msg += `• ${l.name}${weightPart} × ${l.qty} — ${money(l.price * l.qty)} ج.م\n`;
      if (l.composition) msg += `   🍫 ${l.composition}\n`;
    });
    msg += `\n`;
  });

  msg += `*الإجمالي: ${money(cartTotalValue())} ج.م*\n`;

  const name = els.custName.value.trim();
  const phone = els.custPhone.value.trim();
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
  if (!validateCustomerFields()) return;
  const text = encodeURIComponent(buildOrderMessage());
  const url = `https://wa.me/${STORE.whatsapp}?text=${text}`;
  window.open(url, "_blank");
  logOrderToFirestore(); // من غير ما ننتظرها، عشان متأخرش فتح واتساب
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
  }));
  window.Farahat
    .addOrder({
      items,
      total: cartTotalValue(),
      customerName: els.custName.value.trim(),
      customerPhone: els.custPhone.value.trim(),
      address: els.custAddress.value.trim(),
      note: els.custNote.value.trim(),
      region: els.custRegion.value,
      status: "pending",
    })
    .catch((e) => console.warn("Farahat: تعذّر تسجيل الطلب في لوحة التحكم.", e));
}

function validateCustomerFields() {
  let ok = true;
  const nameEl = els.custName;
  const phoneEl = els.custPhone;
  const addrEl = els.custAddress;
  const nameErr = document.getElementById("nameError");
  const phoneErr = document.getElementById("phoneError");
  const addrErr = document.getElementById("addressError");

  if (!nameEl.value.trim()) {
    nameEl.classList.add("invalid");
    nameErr.classList.add("visible");
    ok = false;
  } else {
    nameEl.classList.remove("invalid");
    nameErr.classList.remove("visible");
  }

  // رقم موبايل مصري: يبدأ بـ 01 وطوله 11 رقم (أرقام بس، تسمح بمسافات/شرط بينهم)
  const phoneDigits = phoneEl.value.replace(/[^0-9]/g, "");
  if (!/^01[0-9]{9}$/.test(phoneDigits)) {
    phoneEl.classList.add("invalid");
    phoneErr.classList.add("visible");
    ok = false;
  } else {
    phoneEl.classList.remove("invalid");
    phoneErr.classList.remove("visible");
  }

  if (!addrEl.value.trim()) {
    addrEl.classList.add("invalid");
    addrErr.classList.add("visible");
    ok = false;
  } else {
    addrEl.classList.remove("invalid");
    addrErr.classList.remove("visible");
  }

  if (!ok) {
    const firstInvalid = document.querySelector(".cart-form .invalid");
    if (firstInvalid) firstInvalid.focus();
    showToast("من فضلك اكتب اسمك ورقم موبايلك وعنوانك قبل تأكيد الطلب");
  }
  return ok;
}

[els.custName, els.custPhone, els.custAddress].forEach((input) => {
  input.addEventListener("input", () => {
    if (input.value.trim()) {
      input.classList.remove("invalid");
      const errId = input === els.custName ? "nameError" : input === els.custPhone ? "phoneError" : "addressError";
      document.getElementById(errId).classList.remove("visible");
    }
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

/* -------------------------------- عروض اليوم ------------------------------- */

let activeDeals = [];
let dealsCountdownTimer = null;

function computeDealFinalPrice(deal) {
  return Math.round((deal.originalPrice || 0) * (1 - (deal.discountPercent || 0) / 100));
}

function dealEndsAtDate(deal) {
  if (deal.endsAt && typeof deal.endsAt.toDate === "function") return deal.endsAt.toDate();
  return new Date(deal.endsAt);
}

function loadDeals() {
  if (!window.Farahat || !window.Farahat.fetchDeals) return;
  window.Farahat.fetchDeals()
    .then((list) => {
      const now = Date.now();
      activeDeals = list.filter((d) => d.active !== false && dealEndsAtDate(d).getTime() > now);
      renderDeals();
      if (activeDeals.length > 0) startDealsCountdownLoop();
    })
    .catch((e) => console.warn("Farahat: تعذّر تحميل عروض اليوم.", e));
}

function renderDeals() {
  const grid = document.getElementById("dealsGrid");
  const empty = document.getElementById("dealsEmpty");
  const countEl = document.getElementById("dealsCount");
  if (!grid || !empty) return;

  if (activeDeals.length === 0) {
    grid.hidden = true;
    grid.innerHTML = "";
    empty.hidden = false;
    if (countEl) countEl.textContent = "";
    return;
  }

  empty.hidden = true;
  grid.hidden = false;
  if (countEl) countEl.textContent = `${activeDeals.length} عرض`;

  grid.innerHTML = activeDeals.map((deal, i) => {
    const finalPrice = computeDealFinalPrice(deal);
    return `
      <div class="deal-card">
        <div class="deal-media">
          ${deal.img ? `<img src="${deal.img}" alt="${deal.name}">` : ""}
          <span class="deal-discount-badge">خصم ${money(deal.discountPercent)}%</span>
        </div>
        <div class="deal-body">
          <h3>${deal.name}</h3>
          <div class="deal-price-row">
            <span class="deal-original">${money(deal.originalPrice)} ج.م</span>
            <span class="deal-now">${money(finalPrice)} ج.م</span>
          </div>
          <div class="deal-timer" data-ends="${dealEndsAtDate(deal).getTime()}" data-index="${i}">
            <div class="dt-seg"><b class="dt-h">00</b><span>ساعة</span></div>
            <div class="dt-seg"><b class="dt-m">00</b><span>دقيقة</span></div>
            <div class="dt-seg"><b class="dt-s">00</b><span>ثانية</span></div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function startDealsCountdownLoop() {
  clearInterval(dealsCountdownTimer);
  dealsCountdownTimer = setInterval(() => {
    const grid = document.getElementById("dealsGrid");
    if (!grid) { clearInterval(dealsCountdownTimer); return; }
    let anyExpired = false;
    grid.querySelectorAll(".deal-timer").forEach((timerEl) => {
      const endsAt = Number(timerEl.dataset.ends);
      const diff = endsAt - Date.now();
      if (diff <= 0) { anyExpired = true; return; }
      const pad = (n) => String(n).padStart(2, "0");
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      timerEl.querySelector(".dt-h").textContent = pad(h);
      timerEl.querySelector(".dt-m").textContent = pad(m);
      timerEl.querySelector(".dt-s").textContent = pad(s);
    });
    if (anyExpired) {
      const now = Date.now();
      activeDeals = activeDeals.filter((d) => dealEndsAtDate(d).getTime() > now);
      renderDeals();
      if (activeDeals.length === 0) clearInterval(dealsCountdownTimer);
    }
  }, 1000);
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
});

if (window.Farahat) {
  window.Farahat.fetchProducts()
    .then((products) => window.dispatchEvent(new CustomEvent("farahat-products-ready", { detail: products })))
    .catch((e) => console.warn("Farahat: تعذّر تحميل المنتجات المحدّثة، هيفضل يظهر السعر الأساسي.", e));
  window.Farahat.incrementVisit();
  loadDeals();
} else {
  window.addEventListener("farahat-firebase-ready", () => {
    window.Farahat.fetchProducts()
      .then((products) => window.dispatchEvent(new CustomEvent("farahat-products-ready", { detail: products })))
      .catch((e) => console.warn("Farahat: تعذّر تحميل المنتجات المحدّثة، هيفضل يظهر السعر الأساسي.", e));
    window.Farahat.incrementVisit();
    loadDeals();
  });
}
