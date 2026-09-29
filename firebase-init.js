/* ==========================================================================
   ربط فرحات بـ Firebase — ملف مشترك بين الموقع الرئيسي ولوحة التحكم
   -------------------------------------------------------------------------
   الموقع الرئيسي (app.js) بيستخدم منه: fetchProducts, fetchDeals, addOrder,
   incrementVisit
   لوحة التحكم (admin/admin.js) بتستخدم كل الدوال، بما فيها عروض اليوم
   ورفع الصور (uploadImage عن طريق Firebase Storage — محتاج خطة Blaze).

   لو حصل أي خطأ في الاتصال بـ Firebase (النت واقع، أو إعدادات غلط)، الموقع
   الرئيسي هيفضل شغال عادي بالأسعار الأساسية المكتوبة في data.js، مش هيتعطل.
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, getDoc, addDoc, doc, setDoc, updateDoc,
  deleteDoc, serverTimestamp, runTransaction, query, orderBy, onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCEjY5In6nVtbZa-QlMfBsrfSDteWplXnk",
  authDomain: "farahat-store.firebaseapp.com",
  projectId: "farahat-store",
  storageBucket: "farahat-store.firebasestorage.app",
  messagingSenderId: "309176673503",
  appId: "1:309176673503:web:b8d3ada31da1ef0635356a",
  measurementId: "G-21EEJ78PFS",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/* --------------------------------- المنتجات -------------------------------- */

async function fetchProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function addProduct(data) {
  return addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
}

async function updateProduct(id, data) {
  return updateDoc(doc(db, "products", id), data);
}

async function deleteProduct(id) {
  return deleteDoc(doc(db, "products", id));
}

// بتضيف كذا صنف مرة واحدة (مستخدمة في "تعبئة المنتجات الأولى" في لوحة التحكم بس)
async function seedProducts(list) {
  for (const p of list) {
    await addDoc(collection(db, "products"), { ...p, createdAt: serverTimestamp() });
  }
}

/* --------------------------------- الطلبات --------------------------------- */

async function addOrder(order) {
  return addDoc(collection(db, "orders"), { ...order, createdAt: serverTimestamp() });
}

async function updateOrder(id, data) {
  return updateDoc(doc(db, "orders", id), data);
}

async function fetchOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// بث حي للطلبات: بيبعت أحدث قايمة كل مرة تتغيّر فيها القاعدة، وكمان قايمة
// الطلبات "الجديدة" بس (اللي اتضافت في نفس اللحظة دي)، عشان الداشبورد يقدر
// ينبّه عليها (صوت/توست) من غير ما يحتاج المستخدم يعمل ريفريش.
function listenOrders(onChange) {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const added = snap.docChanges()
      .filter((c) => c.type === "added")
      .map((c) => ({ id: c.doc.id, ...c.doc.data() }));
    onChange(list, added);
  });
}

/* -------------------------------- عداد الزوار ------------------------------ */

async function incrementVisit() {
  try {
    const ref = doc(db, "stats", "visits");
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists() ? snap.data().count || 0 : 0;
      tx.set(ref, { count: current + 1 }, { merge: true });
    });
  } catch (e) {
    // تجاهل بهدوء — عداد الزوار مش حاجة حرجة توقف الموقع بسببها
    console.warn("Farahat: تعذّر تحديث عداد الزوار.", e);
  }
}

async function fetchVisitCount() {
  const snap = await getDoc(doc(db, "stats", "visits"));
  return snap.exists() ? snap.data().count || 0 : 0;
}

/* --------------------------------- عروض اليوم ------------------------------- */

async function fetchDeals() {
  const snap = await getDocs(collection(db, "deals"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function addDeal(data) {
  return addDoc(collection(db, "deals"), { ...data, createdAt: serverTimestamp() });
}

async function updateDeal(id, data) {
  return updateDoc(doc(db, "deals", id), data);
}

async function deleteDeal(id) {
  return deleteDoc(doc(db, "deals", id));
}

/* ------------------------------- رفع صورة (Storage) ------------------------- */
// محتاج خطة Blaze (pay-as-you-go) مفعّلة على مشروع Firebase عشان الرفع يشتغل.
// لو مش مفعّلة، الدالة هترمي خطأ واضح ولوحة التحكم هتوريه للمستخدم.

async function uploadImage(file, folder = "uploads") {
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${folder}/${Date.now()}_${cleanName}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, file);
  return getDownloadURL(ref);
}

/* -------------------------------- تسجيل الدخول ------------------------------ */

function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}
function logout() {
  return signOut(auth);
}
function watchAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

window.Farahat = {
  db,
  auth,
  fetchProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  seedProducts,
  addOrder,
  updateOrder,
  fetchOrders,
  listenOrders,
  incrementVisit,
  fetchVisitCount,
  fetchDeals,
  addDeal,
  updateDeal,
  deleteDeal,
  uploadImage,
  login,
  logout,
  watchAuth,
};

window.dispatchEvent(new Event("farahat-firebase-ready"));
