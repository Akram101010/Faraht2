/* ==========================================================================
   لوحة تحكم فرحات — admin.js
   -------------------------------------------------------------------------
   الملف ده بيستخدم window.Farahat (من ../firebase-init.js) عشان يسجّل
   دخول، ويجيب/يضيف/يعدّل/يحذف منتجات، ويجيب الطلبات وعداد الزوار.
   بيستخدم كمان window.STORE (من ../data.js) بس مرة واحدة عشان "يعبّي"
   أول نسخة من المنتجات في Firestore (زرار "تعبئة المنتجات الأساسية").
   ========================================================================== */

const F = window.Farahat;

const els = {
  loginScreen: document.getElementById("loginScreen"),
  dashScreen: document.getElementById("dashScreen"),
  loginForm: document.getElementById("loginForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  loginError: document.getElementById("loginError"),
  loginBtn: document.getElementById("loginBtn"),
  logoutBtn: document.getElementById("logoutBtn"),

  dashTabs: document.querySelectorAll(".dash-tab"),
  dashPanels: document.querySelectorAll(".dash-panel"),

  statOrders: document.getElementById("statOrders"),
  statRevenue: document.getElementById("statRevenue"),
  statVisits: document.getElementById("statVisits"),
  statProducts: document.getElementById("statProducts"),
  topProductsList: document.getElementById("topProductsList"),
  recentOrdersList: document.getElementById("recentOrdersList"),

  addProductBtn: document.getElementById("addProductBtn"),
  seedBtn: document.getElementById("seedBtn"),
  productSearch: document.getElementById("productSearch"),
  productsTbody: document.getElementById("productsTbody"),
  productsEmptyHint: document.getElementById("productsEmptyHint"),

  ordersTbody: document.getElementById("ordersTbody"),
  exportOrdersBtn: document.getElementById("exportOrdersBtn"),
  ordersEmptyHint: document.getElementById("ordersEmptyHint"),

  productModalOverlay: document.getElementById("productModalOverlay"),
  productModalTitle: document.getElementById("productModalTitle"),
  productModalClose: document.getElementById("productModalClose"),
  productForm: document.getElementById("productForm"),
  pfName: document.getElementById("pfName"),
  pfSection: document.getElementById("pfSection"),
  pfTabWrap: document.getElementById("pfTabWrap"),
  pfTab: document.getElementById("pfTab"),
  pfPrice: document.getElementById("pfPrice"),
  pfBestseller: document.getElementById("pfBestseller"),
  pfExcludeFromBox: document.getElementById("pfExcludeFromBox"),
  pfImg: document.getElementById("pfImg"),
  pfImgFile: document.getElementById("pfImgFile"),
  pfImgUploadBtn: document.getElementById("pfImgUploadBtn"),
  pfImgUploadStatus: document.getElementById("pfImgUploadStatus"),
  pfCustomBox: document.getElementById("pfCustomBox"),
  pfCustomBoxFields: document.getElementById("pfCustomBoxFields"),
  pfMinWeight: document.getElementById("pfMinWeight"),
  pfMaxWeight: document.getElementById("pfMaxWeight"),
  pfWeightUnitLabel: document.getElementById("pfWeightUnitLabel"),
  pfLinkToTab: document.getElementById("pfLinkToTab"),
  pfNote: document.getElementById("pfNote"),
  productFormError: document.getElementById("productFormError"),
  productDeleteBtn: document.getElementById("productDeleteBtn"),

  orderModalOverlay: document.getElementById("orderModalOverlay"),
  orderModalClose: document.getElementById("orderModalClose"),
  orderModalBody: document.getElementById("orderModalBody"),

  addDealBtn: document.getElementById("addDealBtn"),
  dealsTbody: document.getElementById("dealsTbody"),
  dealsEmptyHint: document.getElementById("dealsEmptyHint"),
  dealModalOverlay: document.getElementById("dealModalOverlay"),
  dealModalTitle: document.getElementById("dealModalTitle"),
  dealModalClose: document.getElementById("dealModalClose"),
  dealForm: document.getElementById("dealForm"),
  dfSourceProduct: document.getElementById("dfSourceProduct"),
  dfName: document.getElementById("dfName"),
  dfImg: document.getElementById("dfImg"),
  dfImgFile: document.getElementById("dfImgFile"),
  dfImgUploadBtn: document.getElementById("dfImgUploadBtn"),
  dfImgUploadStatus: document.getElementById("dfImgUploadStatus"),
  dfOriginalPrice: document.getElementById("dfOriginalPrice"),
  dfDiscountPercent: document.getElementById("dfDiscountPercent"),
  dfComputedPrice: document.getElementById("dfComputedPrice"),
  dfEndsAt: document.getElementById("dfEndsAt"),
  dealFormError: document.getElementById("dealFormError"),
  dealDeleteBtn: document.getElementById("dealDeleteBtn"),

  toast: document.getElementById("dashToast"),
};

let products = [];
let orders = [];
let deals = [];
let editingProductId = null;
let editingDealId = null;
let toastTimer = null;
let booted = false;

/* ------------------------------ أدوات عامة --------------------------------- */

const money = (n) => Number(n || 0).toLocaleString("ar-EG");

// مسارات الصور في القاعدة متخزنة نسبةً لجذر الموقع (زي "images/nuts/x.jpg")
// لأن الموقع الرئيسي هو اللي بيستخدمها، لكن صفحة الداشبورد نفسها جوه
// فولدر admin/ (خطوة أعمق)، فلازم نضيف "../" قبلها عشان الصورة تظهر هنا.
function resolveImgSrc(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("../") || path.startsWith("/") || path.startsWith("data:")) return path;
  return "../" + path;
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove("visible"), 2200);
}

function sectionsMeta() {
  return window.STORE ? window.STORE.sections : [];
}
function sectionTitle(id) {
  const s = sectionsMeta().find((x) => x.id === id);
  return s ? s.title : id || "—";
}
function tabTitle(sectionId, tabId) {
  const s = sectionsMeta().find((x) => x.id === sectionId);
  if (!s || !s.tabs) return "";
  const t = s.tabs.find((x) => x.id === tabId);
  return t ? t.title : tabId;
}
function allTabs() {
  const list = [];
  sectionsMeta().forEach((s) => {
    if (s.tabs) s.tabs.forEach((t) => list.push({ id: t.id, title: `${s.title} › ${t.title}` }));
  });
  return list;
}

/* -------------------------------- تسجيل الدخول ------------------------------ */

els.loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.loginError.textContent = "";
  els.loginBtn.disabled = true;
  els.loginBtn.textContent = "بيدخل...";
  try {
    await F.login(els.loginEmail.value.trim(), els.loginPassword.value);
  } catch (err) {
    els.loginError.textContent = "الإيميل أو كلمة السر غلط، جرب تاني.";
  } finally {
    els.loginBtn.disabled = false;
    els.loginBtn.textContent = "دخول";
  }
});

els.logoutBtn.addEventListener("click", () => F.logout());

F.watchAuth((user) => {
  if (user) {
    els.loginScreen.hidden = true;
    els.dashScreen.hidden = false;
    boot();
  } else {
    els.dashScreen.hidden = true;
    els.loginScreen.hidden = false;
    booted = false;
  }
});

/* ---------------------------------- تبويبات --------------------------------- */

els.dashTabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    els.dashTabs.forEach((b) => b.classList.toggle("active", b === btn));
    els.dashPanels.forEach((p) => p.classList.toggle("active", p.id === `panel-${btn.dataset.panel}`));
  });
});

/* ------------------------------------ بووت ---------------------------------- */

async function boot() {
  if (booted) return;
  booted = true;
  populateSectionSelects();
  await Promise.all([loadProducts(), loadOrders(), loadDeals()]);
  renderOverview();
  renderProductsTable();
  renderOrdersTable();
  renderDealsTable();
}

async function loadProducts() {
  try {
    products = await F.fetchProducts();
  } catch (e) {
    console.error(e);
    products = [];
  }
  els.seedBtn.hidden = products.length > 0;
}

async function loadOrders() {
  try {
    orders = await F.fetchOrders();
  } catch (e) {
    console.error(e);
    orders = [];
  }
}

async function loadDeals() {
  try {
    deals = await F.fetchDeals();
  } catch (e) {
    console.error(e);
    deals = [];
  }
}

/* -------------------------------- نظرة عامة --------------------------------- */

function renderOverview() {
  els.statOrders.textContent = money(orders.length);
  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  els.statRevenue.textContent = money(revenue);
  els.statProducts.textContent = money(products.length);

  els.statVisits.textContent = "…";
  F.fetchVisitCount()
    .then((v) => { els.statVisits.textContent = money(v); })
    .catch(() => { els.statVisits.textContent = "—"; });

  const counts = {};
  orders.forEach((o) => {
    (o.items || []).forEach((it) => {
      counts[it.name] = (counts[it.name] || 0) + (it.qty || 1);
    });
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  els.topProductsList.innerHTML = top.length
    ? top.map(([name, qty]) => `<div class="row"><span class="name">${name}</span><span class="qty">${money(qty)} قطعة</span></div>`).join("")
    : `<p class="empty-hint">لسه مفيش بيانات كفاية — هتظهر هنا أول ما توصل طلبات.</p>`;

  const recent = orders.slice(0, 5);
  els.recentOrdersList.innerHTML = recent.length
    ? recent.map((o) => `<div class="row"><span class="name">${o.customerName || "بدون اسم"}</span><span class="meta">${money(o.total)} ج.م</span></div>`).join("")
    : `<p class="empty-hint">لسه مفيش طلبات مسجّلة.</p>`;
}

/* ---------------------------------- المنتجات -------------------------------- */

function populateSectionSelects() {
  const meta = sectionsMeta();
  els.pfSection.innerHTML = meta.map((s) => `<option value="${s.id}">${s.title}</option>`).join("");
  els.pfSection.addEventListener("change", updateTabSelectForSection);
  updateTabSelectForSection();

  els.pfLinkToTab.innerHTML = allTabs().map((t) => `<option value="${t.id}">${t.title}</option>`).join("");
}

function updateTabSelectForSection() {
  const meta = sectionsMeta().find((s) => s.id === els.pfSection.value);
  if (meta && meta.tabs) {
    els.pfTabWrap.hidden = false;
    els.pfTab.innerHTML = meta.tabs.map((t) => `<option value="${t.id}">${t.title}</option>`).join("");
  } else {
    els.pfTabWrap.hidden = true;
    els.pfTab.innerHTML = "";
  }
}

function renderProductsTable(filter = "") {
  const q = filter.trim().toLowerCase();
  const list = products.filter((p) => !q || (p.name || "").toLowerCase().includes(q));
  els.productsEmptyHint.hidden = products.length > 0;

  els.productsTbody.innerHTML = list.map((p) => {
    const thumb = p.img ? `<img class="row-thumb" src="${resolveImgSrc(p.img)}" alt="">` : `<div class="row-thumb"></div>`;
    const sectionLabel = p.tabId ? `${sectionTitle(p.sectionId)} › ${tabTitle(p.sectionId, p.tabId)}` : sectionTitle(p.sectionId);
    const priceLabel = typeof p.price === "number" ? `${money(p.price)} ج.م` : "—";
    const isActive = p.active !== false;
    return `
      <tr data-id="${p.id}" class="${isActive ? "" : "row-inactive"}">
        <td>${thumb}</td>
        <td>${p.name || "—"}</td>
        <td>${sectionLabel}</td>
        <td class="price-cell">${priceLabel}</td>
        <td>${p.bestseller ? `<span class="bs-yes">✓</span>` : `<span class="bs-no">—</span>`}</td>
        <td>
          <button type="button" class="visibility-btn ${isActive ? "is-visible" : "is-hidden"}" title="${isActive ? "دوس عشان تخفيه من الموقع" : "دوس عشان تظهره تاني في الموقع"}">
            ${isActive ? "👁️ ظاهر" : "🚫 مخفي"}
          </button>
        </td>
        <td class="row-actions"><button type="button" class="edit-btn">تعديل</button></td>
      </tr>
    `;
  }).join("");

  els.productsTbody.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest("tr").dataset.id;
      openProductModal(products.find((p) => p.id === id));
    });
  });

  els.productsTbody.querySelectorAll(".visibility-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.closest("tr").dataset.id;
      const p = products.find((x) => x.id === id);
      if (!p) return;
      const newActive = p.active === false; // كان مخفي، هيظهر — أو العكس
      btn.disabled = true;
      try {
        await F.updateProduct(id, { active: newActive });
        p.active = newActive;
        renderProductsTable(els.productSearch.value);
      } catch (e) {
        alert("تعذّر تحديث حالة الصنف، جرب تاني.");
        btn.disabled = false;
      }
    });
  });
}

els.productSearch.addEventListener("input", () => renderProductsTable(els.productSearch.value));
els.addProductBtn.addEventListener("click", () => openProductModal(null));

function openProductModal(product) {
  editingProductId = product ? product.id : null;
  els.productModalTitle.textContent = product ? "تعديل منتج" : "إضافة منتج";
  els.productFormError.textContent = "";
  els.productForm.reset();
  updateTabSelectForSection();

  if (product) {
    els.pfName.value = product.name || "";
    if (product.sectionId) els.pfSection.value = product.sectionId;
    updateTabSelectForSection();
    if (product.tabId) els.pfTab.value = product.tabId;
    els.pfPrice.value = typeof product.price === "number" ? product.price : "";
    els.pfBestseller.checked = !!product.bestseller;
    els.pfExcludeFromBox.checked = !!product.excludeFromBox;
    els.pfImg.value = product.img || "";
    els.pfCustomBox.checked = !!product.customBox;
    els.pfMinWeight.value = product.minWeight ?? "";
    els.pfMaxWeight.value = product.maxWeight ?? "";
    els.pfWeightUnitLabel.value = product.weightUnitLabel || "";
    if (product.linkToTab) els.pfLinkToTab.value = product.linkToTab;
    els.pfNote.value = product.note || "";
    els.productDeleteBtn.hidden = false;
  } else {
    els.productDeleteBtn.hidden = true;
  }
  toggleCustomBoxFields();
  els.productModalOverlay.classList.add("open");
}

function closeProductModal() {
  els.productModalOverlay.classList.remove("open");
  editingProductId = null;
}
els.productModalClose.addEventListener("click", closeProductModal);
els.productModalOverlay.addEventListener("click", (e) => { if (e.target === els.productModalOverlay) closeProductModal(); });

els.pfCustomBox.addEventListener("change", toggleCustomBoxFields);
function toggleCustomBoxFields() {
  els.pfCustomBoxFields.hidden = !els.pfCustomBox.checked;
}

els.productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.productFormError.textContent = "";

  const name = els.pfName.value.trim();
  if (!name) { els.productFormError.textContent = "اكتب اسم المنتج."; return; }

  const data = {
    name,
    sectionId: els.pfSection.value,
    tabId: els.pfTabWrap.hidden ? null : (els.pfTab.value || null),
    img: els.pfImg.value.trim() || null,
    bestseller: els.pfBestseller.checked,
    excludeFromBox: els.pfExcludeFromBox.checked,
    customBox: els.pfCustomBox.checked,
  };

  if (els.pfCustomBox.checked) {
    data.price = null;
    data.minWeight = Number(els.pfMinWeight.value) || 0;
    data.maxWeight = Number(els.pfMaxWeight.value) || 0;
    data.weightUnitLabel = els.pfWeightUnitLabel.value.trim() || "كيلو";
    data.linkToTab = els.pfLinkToTab.value || null;
    data.note = els.pfNote.value.trim();
  } else {
    const priceVal = els.pfPrice.value.trim();
    data.price = priceVal === "" ? null : Number(priceVal);
  }

  const submitBtn = els.productForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (editingProductId) {
      await F.updateProduct(editingProductId, data);
      showToast("✓ اتحدّث المنتج");
    } else {
      await F.addProduct(data);
      showToast("✓ اتضاف المنتج");
    }
    closeProductModal();
    await loadProducts();
    renderProductsTable(els.productSearch.value);
    renderOverview();
  } catch (err) {
    console.error(err);
    els.productFormError.textContent = "حصل خطأ، جرب تاني.";
  } finally {
    submitBtn.disabled = false;
  }
});

els.productDeleteBtn.addEventListener("click", async () => {
  if (!editingProductId) return;
  if (!confirm("متأكد إنك عايز تحذف المنتج ده؟")) return;
  try {
    await F.deleteProduct(editingProductId);
    showToast("🗑️ اتحذف المنتج");
    closeProductModal();
    await loadProducts();
    renderProductsTable(els.productSearch.value);
    renderOverview();
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في الحذف");
  }
});

/* ------------------------------- تعبئة أولى --------------------------------- */

els.seedBtn.addEventListener("click", async () => {
  if (!window.STORE) { showToast("data.js مش متحمّل"); return; }
  if (!confirm("هيتضاف كل المنتجات الأساسية من data.js لقاعدة البيانات، تحب تكمل؟")) return;

  els.seedBtn.disabled = true;
  els.seedBtn.textContent = "بيتعبّى...";
  try {
    const list = flattenStoreToProducts(window.STORE);
    await F.seedProducts(list);
    showToast(`✓ اتضاف ${list.length} صنف`);
    await loadProducts();
    renderProductsTable();
    renderOverview();
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في التعبئة");
  } finally {
    els.seedBtn.disabled = false;
    els.seedBtn.textContent = "⬇️ تعبئة المنتجات الأساسية أول مرة";
  }
});

function flattenStoreToProducts(store) {
  const list = [];
  store.sections.forEach((section) => {
    if (section.tabs) {
      section.tabs.forEach((tab) => {
        (tab.items || []).forEach((item) => list.push(toProductDoc(item, section.id, tab.id)));
      });
    } else {
      (section.items || []).forEach((item) => list.push(toProductDoc(item, section.id, null)));
    }
  });
  return list;
}

function toProductDoc(item, sectionId, tabId) {
  const out = {
    name: item.name,
    sectionId,
    tabId: tabId || null,
    img: item.img || null,
    bestseller: !!item.bestseller,
    excludeFromBox: !!item.excludeFromBox,
    customBox: !!item.customBox,
    price: typeof item.price === "number" ? item.price : null,
  };
  if (item.customBox) {
    out.minWeight = item.minWeight;
    out.maxWeight = item.maxWeight;
    out.weightUnitLabel = item.weightUnitLabel || "كيلو";
    out.linkToTab = item.linkToTab || "choc-weight";
    out.note = item.note || "";
  }
  return out;
}

/* ------------------------------- رفع صورة من الجهاز ------------------------- */

function wireImageUpload(fileInput, uploadBtn, statusEl, urlInput) {
  uploadBtn.addEventListener("click", async () => {
    const file = fileInput.files[0];
    if (!file) {
      statusEl.textContent = "اختار صورة الأول";
      statusEl.className = "upload-status err";
      return;
    }
    statusEl.textContent = "⏳ بيترفع...";
    statusEl.className = "upload-status";
    uploadBtn.disabled = true;
    try {
      const url = await F.uploadImage(file, "products");
      urlInput.value = url;
      statusEl.textContent = "✓ اترفعت";
      statusEl.className = "upload-status ok";
    } catch (err) {
      console.error(err);
      const isBlazeIssue = /billing|blaze|storage\/unauthorized|403/i.test(err?.message || err?.code || "");
      statusEl.textContent = isBlazeIssue
        ? "محتاج تفعّل خطة Blaze في Firebase الأول (مجانية برضو لحد استخدام معيّن)"
        : "حصل خطأ في الرفع، جرب تاني";
      statusEl.className = "upload-status err";
    } finally {
      uploadBtn.disabled = false;
    }
  });
}

wireImageUpload(els.pfImgFile, els.pfImgUploadBtn, els.pfImgUploadStatus, els.pfImg);
wireImageUpload(els.dfImgFile, els.dfImgUploadBtn, els.dfImgUploadStatus, els.dfImg);

/* -------------------------------- عروض اليوم -------------------------------- */

function allProductsFlat() {
  return products.filter((p) => !p.customBox && typeof p.price === "number");
}

function populateDealSourceSelect() {
  const opts = allProductsFlat().map((p) => {
    const label = p.tabId ? `${sectionTitle(p.sectionId)} › ${tabTitle(p.sectionId, p.tabId)} — ${p.name}` : `${sectionTitle(p.sectionId)} — ${p.name}`;
    return `<option value="${p.id}">${label}</option>`;
  }).join("");
  els.dfSourceProduct.innerHTML = `<option value="">— اكتب بيانات العرض يدويًا —</option>${opts}`;
}

els.dfSourceProduct.addEventListener("change", () => {
  const p = products.find((x) => x.id === els.dfSourceProduct.value);
  if (!p) return;
  els.dfName.value = p.name || "";
  els.dfImg.value = p.img || "";
  els.dfOriginalPrice.value = typeof p.price === "number" ? p.price : "";
  updateComputedPrice();
});

function updateComputedPrice() {
  const price = Number(els.dfOriginalPrice.value) || 0;
  const pct = Number(els.dfDiscountPercent.value) || 0;
  if (price > 0 && pct > 0) {
    const final = Math.round(price * (1 - pct / 100));
    els.dfComputedPrice.textContent = `${money(final)} ج.م (بدل ${money(price)} ج.م)`;
  } else {
    els.dfComputedPrice.textContent = "—";
  }
}
els.dfOriginalPrice.addEventListener("input", updateComputedPrice);
els.dfDiscountPercent.addEventListener("input", updateComputedPrice);

function timeLeftLabel(endsAtDate) {
  const diffMs = endsAtDate.getTime() - Date.now();
  if (diffMs <= 0) return "خلص";
  const h = Math.floor(diffMs / 3600000);
  const m = Math.floor((diffMs % 3600000) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)} يوم`;
  return `${h} س ${m} د`;
}

function dealEndsAtDate(deal) {
  if (deal.endsAt && typeof deal.endsAt.toDate === "function") return deal.endsAt.toDate();
  return new Date(deal.endsAt);
}

function renderDealsTable() {
  els.dealsEmptyHint.hidden = deals.length > 0;
  els.dealsTbody.innerHTML = deals.map((d) => {
    const thumb = d.img ? `<img class="row-thumb" src="${resolveImgSrc(d.img)}" alt="">` : `<div class="row-thumb"></div>`;
    const endsAtDate = dealEndsAtDate(d);
    const expired = endsAtDate.getTime() <= Date.now();
    const finalPrice = Math.round((d.originalPrice || 0) * (1 - (d.discountPercent || 0) / 100));
    return `
      <tr data-id="${d.id}" class="${expired ? "row-inactive" : ""}">
        <td>${thumb}</td>
        <td>${d.name || "—"}</td>
        <td class="price-cell">${money(d.originalPrice)} ج.م</td>
        <td>${money(d.discountPercent)}%</td>
        <td class="price-cell">${money(finalPrice)} ج.م</td>
        <td>${expired ? "⏳ خلص" : timeLeftLabel(endsAtDate)}</td>
        <td class="row-actions"><button type="button" class="edit-deal-btn edit-btn">تعديل</button></td>
      </tr>
    `;
  }).join("");

  els.dealsTbody.querySelectorAll(".edit-deal-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest("tr").dataset.id;
      openDealModal(deals.find((d) => d.id === id));
    });
  });
}

els.addDealBtn.addEventListener("click", () => openDealModal(null));

function toDatetimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function openDealModal(deal) {
  editingDealId = deal ? deal.id : null;
  els.dealModalTitle.textContent = deal ? "تعديل عرض" : "إضافة عرض";
  els.dealFormError.textContent = "";
  els.dealForm.reset();
  els.dfImgUploadStatus.textContent = "";
  populateDealSourceSelect();

  if (deal) {
    els.dfName.value = deal.name || "";
    els.dfImg.value = deal.img || "";
    els.dfOriginalPrice.value = deal.originalPrice ?? "";
    els.dfDiscountPercent.value = deal.discountPercent ?? "";
    els.dfEndsAt.value = toDatetimeLocalValue(dealEndsAtDate(deal));
    els.dealDeleteBtn.hidden = false;
  } else {
    const inTwoHours = new Date(Date.now() + 2 * 3600000);
    els.dfEndsAt.value = toDatetimeLocalValue(inTwoHours);
    els.dealDeleteBtn.hidden = true;
  }
  updateComputedPrice();
  els.dealModalOverlay.classList.add("open");
}

function closeDealModal() {
  els.dealModalOverlay.classList.remove("open");
  editingDealId = null;
}
els.dealModalClose.addEventListener("click", closeDealModal);
els.dealModalOverlay.addEventListener("click", (e) => { if (e.target === els.dealModalOverlay) closeDealModal(); });

els.dealForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  els.dealFormError.textContent = "";

  const name = els.dfName.value.trim();
  const originalPrice = Number(els.dfOriginalPrice.value);
  const discountPercent = Number(els.dfDiscountPercent.value);
  const endsAtVal = els.dfEndsAt.value;

  if (!name) { els.dealFormError.textContent = "اكتب اسم العرض."; return; }
  if (!originalPrice || originalPrice <= 0) { els.dealFormError.textContent = "اكتب السعر الأصلي."; return; }
  if (!discountPercent || discountPercent <= 0 || discountPercent >= 100) { els.dealFormError.textContent = "نسبة الخصم لازم تكون بين 1 و99."; return; }
  if (!endsAtVal) { els.dealFormError.textContent = "حدد وقت انتهاء العرض."; return; }

  const data = {
    name,
    img: els.dfImg.value.trim() || null,
    originalPrice,
    discountPercent,
    endsAt: new Date(endsAtVal),
    active: true,
  };

  const submitBtn = els.dealForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    if (editingDealId) {
      await F.updateDeal(editingDealId, data);
      showToast("✓ اتحدّث العرض");
    } else {
      await F.addDeal(data);
      showToast("✓ اتضاف العرض");
    }
    closeDealModal();
    await loadDeals();
    renderDealsTable();
  } catch (err) {
    console.error(err);
    els.dealFormError.textContent = "حصل خطأ، جرب تاني.";
  } finally {
    submitBtn.disabled = false;
  }
});

els.dealDeleteBtn.addEventListener("click", async () => {
  if (!editingDealId) return;
  if (!confirm("متأكد إنك عايز تحذف العرض ده؟")) return;
  try {
    await F.deleteDeal(editingDealId);
    showToast("🗑️ اتحذف العرض");
    closeDealModal();
    await loadDeals();
    renderDealsTable();
  } catch (err) {
    console.error(err);
    showToast("حصل خطأ في الحذف");
  }
});

/* ---------------------------------- الطلبات --------------------------------- */

function normalizePhone(phone) {
  let p = (phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = p.slice(1);
  if (!p.startsWith("20")) p = "20" + p;
  return p;
}

function renderOrdersTable() {
  els.ordersEmptyHint.hidden = orders.length > 0;
  els.ordersTbody.innerHTML = orders.map((o) => {
    const date = o.createdAt && typeof o.createdAt.toDate === "function"
      ? o.createdAt.toDate().toLocaleString("ar-EG")
      : "—";
    const regionLabel = o.region === "local" ? "داخل المنزلة" : (o.region || "—");
    const status = o.status || "pending";
    const waBtn = o.customerPhone
      ? `<a class="wa-btn" href="https://wa.me/${normalizePhone(o.customerPhone)}" target="_blank" rel="noopener" title="راسله على واتساب">💬</a>`
      : "";
    return `
      <tr data-id="${o.id}">
        <td class="date-cell">${date}</td>
        <td>${o.customerName || "—"}</td>
        <td>${regionLabel}</td>
        <td class="price-cell">${money(o.total)} ج.م</td>
        <td>
          <select class="status-select status-${status}" data-id="${o.id}">
            <option value="pending" ${status === "pending" ? "selected" : ""}>قيد التنفيذ</option>
            <option value="done" ${status === "done" ? "selected" : ""}>تم التنفيذ</option>
          </select>
        </td>
        <td class="row-actions">${waBtn}<button type="button" class="view-order-btn view-btn">التفاصيل</button></td>
      </tr>
    `;
  }).join("");

  els.ordersTbody.querySelectorAll(".view-order-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.closest("tr").dataset.id;
      openOrderModal(orders.find((o) => o.id === id));
    });
  });

  els.ordersTbody.querySelectorAll(".status-select").forEach((sel) => {
    sel.addEventListener("change", async () => {
      const id = sel.dataset.id;
      const newStatus = sel.value;
      sel.disabled = true;
      try {
        await F.updateOrder(id, { status: newStatus });
        const o = orders.find((x) => x.id === id);
        if (o) o.status = newStatus;
        sel.className = `status-select status-${newStatus}`;
      } catch (e) {
        alert("تعذّر تحديث حالة الطلب، جرب تاني.");
      } finally {
        sel.disabled = false;
      }
    });
  });
}

function exportOrdersToCsv() {
  if (orders.length === 0) {
    alert("مفيش طلبات لسه عشان تتصدّر.");
    return;
  }
  const headers = ["التاريخ", "الاسم", "الموبايل", "العنوان", "المنطقة", "المنتجات", "الإجمالي", "الحالة"];
  const rows = orders.map((o) => {
    const date = o.createdAt && typeof o.createdAt.toDate === "function"
      ? o.createdAt.toDate().toLocaleString("ar-EG")
      : "";
    const itemsStr = (o.items || [])
      .map((it) => `${it.name}${it.weightLabel ? ` (${it.weightLabel})` : ""} ×${it.qty}`)
      .join(" | ");
    const regionLabel = o.region === "local" ? "داخل المنزلة" : (o.region || "");
    const statusLabel = o.status === "done" ? "تم التنفيذ" : "قيد التنفيذ";
    return [date, o.customerName || "", o.customerPhone || "", o.address || "", regionLabel, itemsStr, o.total || 0, statusLabel];
  });

  const csvLines = [headers, ...rows].map((r) =>
    r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  );
  // \uFEFF (BOM) عشان إكسيل يعرض العربي صح من غير ما يتحرّف
  const csvContent = "\uFEFF" + csvLines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `طلبات-فرحات-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

els.exportOrdersBtn.addEventListener("click", exportOrdersToCsv);

function openOrderModal(order) {
  if (!order) return;
  const itemsHtml = (order.items || []).map((it) => `
    <div class="od-line">
      <span>${it.name}${it.weightLabel ? ` (${it.weightLabel})` : ""} × ${it.qty}${it.composition ? `<br><small>🍫 ${it.composition}</small>` : ""}</span>
      <span>${money((it.price || 0) * (it.qty || 1))} ج.م</span>
    </div>
  `).join("");
  const status = order.status || "pending";
  els.orderModalBody.innerHTML = `
    <p><strong>الاسم:</strong> ${order.customerName || "—"}</p>
    <p><strong>الموبايل:</strong> ${order.customerPhone ? `<a href="https://wa.me/${normalizePhone(order.customerPhone)}" target="_blank" rel="noopener">${order.customerPhone} 💬</a>` : "—"}</p>
    <p><strong>العنوان:</strong> ${order.address || "—"}</p>
    ${order.note ? `<p><strong>ملاحظات:</strong> ${order.note}</p>` : ""}
    <p><strong>المنطقة:</strong> ${order.region === "local" ? "داخل المنزلة" : (order.region || "—")}</p>
    <p><strong>الحالة:</strong> <span class="status-pill status-${status}">${status === "done" ? "تم التنفيذ" : "قيد التنفيذ"}</span></p>
    <hr>
    ${itemsHtml}
    <div class="od-line od-total"><span>الإجمالي</span><span>${money(order.total)} ج.م</span></div>
  `;
  els.orderModalOverlay.classList.add("open");
}
els.orderModalClose.addEventListener("click", () => els.orderModalOverlay.classList.remove("open"));
els.orderModalOverlay.addEventListener("click", (e) => { if (e.target === els.orderModalOverlay) els.orderModalOverlay.classList.remove("open"); });

// تحديث دوري لعمود "باقي على الانتهاء" في جدول العروض (كل دقيقة كفاية هنا)
setInterval(() => { if (deals.length > 0) renderDealsTable(); }, 60000);
