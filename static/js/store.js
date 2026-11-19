import { http } from "./api.js";
import { icon } from "./icons.js";

const CART_KEY = "aseel_cart_v1";

const DEFAULT_INFO = {
  name: "EMO STORE",
  name_en: "EMO STORE",
  tagline: "قطع مختارة بعناية",
  currency: "ج.م",
  timezone: "Africa/Cairo",
  free_shipping_enabled: true,
  free_shipping_threshold: 1500,
  default_shipping_fee: 60,
  governorates: [],
  payment_methods: [],
  instapay_handle: "aseel.store@instapay",
  wallet_number: "0100 000 0000",
  contact_phone: "+20 100 000 0000",
  contact_email: "hello@aseel.store",
  store_address: "القاهرة، مصر",
  working_hours: "السبت – الخميس: 10 ص – 8 م",
  instagram_url: "https://instagram.com/aseel.store",
  facebook_url: "https://facebook.com/aseel.store",
  whatsapp_number: "+20 100 000 0000",
  order_status_labels: {
    pending: "قيد المراجعة",
    confirmed: "تم التأكيد",
    processing: "قيد التجهيز",
    shipped: "تم الشحن",
    delivered: "تم التسليم",
    cancelled: "ملغي",
  },
};

export const store = {
  info: { ...DEFAULT_INFO },
  categories: [],
  cart: [],
};

export async function initStore() {
  const [infoResult, categoriesResult] = await Promise.allSettled([
    http.get("/api/store-info"),
    http.get("/api/categories"),
  ]);

  if (infoResult.status === "fulfilled" && infoResult.value) {
    store.info = { ...DEFAULT_INFO, ...infoResult.value };
  }
  if (categoriesResult.status === "fulfilled" && Array.isArray(categoriesResult.value)) {
    store.categories = categoriesResult.value;
  }
}

/** تحديث بيانات المتجر فقط (بعد تعديل الإعدادات من لوحة التحكم). */
export async function refreshStoreInfo() {
  try {
    const info = await http.get("/api/store-info");
    if (info) store.info = { ...DEFAULT_INFO, ...info };
  } catch {
    /* الإبقاء على البيانات الحالية */
  }
  return store.info;
}

/* ---------- Formatting ---------- */
const numberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

export function money(value) {
  const amount = Number(value) || 0;
  return `${numberFormat.format(amount)} ${store.info.currency || "ج.م"}`;
}

/** رقم مصري -> رابط واتساب صالح، أو "" لو الرقم فاضي. */
export function whatsappUrl(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  const normalized = digits.startsWith("20")
    ? digits
    : `20${digits.replace(/^0/, "")}`;
  return `https://wa.me/${normalized}`;
}

/** رقم هاتف -> رابط tel: صالح، أو "" لو الرقم فاضي. */
export function telUrl(value) {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
}

export function formatDate(value, withTime = true) {
  if (!value) return "—";
  const date = new Date(value.endsWith?.("Z") ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(date);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function discountPercent(product) {
  const compare = Number(product.compare_at_price) || 0;
  const price = Number(product.price) || 0;
  if (compare > price && price > 0) {
    return Math.round((1 - price / compare) * 100);
  }
  return 0;
}

export function stars(rating = 5, count = null) {
  const value = Number(rating) || 0;
  const rounded = Math.round(value);
  let markup = '<span class="stars" aria-hidden="true">';
  for (let index = 1; index <= 5; index += 1) {
    markup += `<svg viewBox="0 0 24 24" style="opacity:${index <= rounded ? 1 : 0.2}"><path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.3 9.4l6.1-.8L12 3Z" fill="currentColor"/></svg>`;
  }
  markup += `<span class="count">${value.toFixed(1)}${
    count !== null ? ` (${count})` : ""
  }</span></span>`;
  return markup;
}

export function statusLabel(status) {
  return store.info.order_status_labels?.[status] || status || "—";
}

export const STATUS_META = {
  pending: { label: "قيد المراجعة", color: "#a98634", bg: "#f6ecd5" },
  confirmed: { label: "تم التأكيد", color: "#2e5a4a", bg: "#e4ece7" },
  processing: { label: "قيد التجهيز", color: "#2a5a7a", bg: "#e2edf5" },
  shipped: { label: "تم الشحن", color: "#5b4a8a", bg: "#ece8f6" },
  delivered: { label: "تم التسليم", color: "#2f6b4f", bg: "#e3efe8" },
  cancelled: { label: "ملغي", color: "#a5342c", bg: "#f7e6e3" },
};

export const PAYMENT_LABELS = {
  cod: "الدفع عند الاستلام",
  instapay: "إنستاباي",
  wallet: "محفظة إلكترونية",
};

/* ---------- Cart ---------- */
function loadCart() {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((item) => item && item.id && item.qty > 0)
      .map((item) => ({
        ...item,
        qty: Math.max(1, Math.min(Number(item.qty) || 1, Number(item.stock) || 99)),
      }));
  } catch {
    return [];
  }
}

store.cart = loadCart();

function persistCart() {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(store.cart));
  } catch {
    /* التخزين غير متاح */
  }
  document.dispatchEvent(new CustomEvent("cart:updated"));
}

export function cartItemKey(id, size = "", color = "") {
  return `${id}::${size || ""}::${color || ""}`;
}

export function addToCart(product, { size = "", color = "", qty = 1 } = {}) {
  const quantity = Math.max(1, Number(qty) || 1);
  const stock = Number(product.stock) || 99;
  const key = cartItemKey(product.id, size, color);
  const existing = store.cart.find((item) => item.key === key);

  if (existing) {
    existing.qty = Math.min(stock, existing.qty + quantity);
  } else {
    store.cart.push({
      key,
      id: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image_url,
      price: Number(product.price) || 0,
      size,
      color,
      qty: Math.min(quantity, stock),
      stock,
      categoryName: product.category?.name || "",
    });
  }

  persistCart();
  return key;
}

export function updateQty(key, quantity) {
  const item = store.cart.find((entry) => entry.key === key);
  if (!item) return;
  const next = Math.min(Number(item.stock) || 99, Math.max(0, Number(quantity) || 0));
  if (next <= 0) {
    store.cart = store.cart.filter((entry) => entry.key !== key);
  } else {
    item.qty = next;
  }
  persistCart();
}

export function removeItem(key) {
  store.cart = store.cart.filter((item) => item.key !== key);
  persistCart();
}

export function clearCart() {
  store.cart = [];
  persistCart();
}

export function cartCount() {
  return store.cart.reduce((total, item) => total + item.qty, 0);
}

export function cartSubtotal() {
  return store.cart.reduce((total, item) => total + item.price * item.qty, 0);
}

export function freeShippingActive() {
  return store.info.free_shipping_enabled !== false;
}

export function shippingFor(subtotal, governorateName) {
  const threshold = Number(store.info.free_shipping_threshold) || 0;
  if (freeShippingActive() && subtotal >= threshold) return 0;
  const governorate = (store.info.governorates || []).find(
    (item) => item.name === governorateName
  );
  return Number(governorate?.fee ?? store.info.default_shipping_fee ?? 60);
}

/* ---------- UI helpers ---------- */
export function toast(message, type = "success") {
  const wrap = document.getElementById("toast-wrap");
  if (!wrap) return;
  const element = document.createElement("div");
  element.className = `toast ${type}`;
  element.innerHTML = `${icon(type === "error" ? "alert" : "checkCircle")}<span>${escapeHtml(
    message
  )}</span>`;
  wrap.appendChild(element);
  window.setTimeout(() => {
    element.classList.add("out");
    window.setTimeout(() => element.remove(), 320);
  }, 3400);
}

export function productCard(product) {
  const discount = discountPercent(product);
  const inStock = Number(product.stock) > 0;
  const badge =
    discount > 0
      ? `<span class="badge badge-sale">خصم ${discount}%</span>`
      : product.is_featured
        ? `<span class="badge badge-new">مختار بعناية</span>`
        : "";
  const url = `#/product/${encodeURIComponent(product.slug)}`;
  const oldPrice =
    discount > 0 ? `<span class="price-old">${money(product.compare_at_price)}</span>` : "";

  return `
    <article class="product-card">
      <div class="product-media">
        <a href="${url}" aria-label="${escapeHtml(product.name)}">
          <img src="${escapeHtml(product.image_url || "/static/img/placeholder.svg")}"
               alt="${escapeHtml(product.name)}" loading="lazy"
               onerror="this.src='/static/img/placeholder.svg'">
        </a>
        <div class="product-badges">${badge}</div>
        ${
          inStock
            ? `<button type="button" class="quick-add" data-action="quick-add" data-slug="${escapeHtml(
                product.slug
              )}">${icon("plus")} إضافة سريعة</button>`
            : `<button type="button" class="quick-add" disabled>غير متوفر حاليًا</button>`
        }
      </div>
      <div class="product-info">
        <span class="product-cat">${escapeHtml(product.category?.name || "")}</span>
        <h3 class="product-name"><a href="${url}">${escapeHtml(product.name)}</a></h3>
        <div class="product-rating">${stars(product.rating, product.reviews_count)}</div>
        <div class="price-row">
          <span class="price">${money(product.price)}</span>
          ${oldPrice}
        </div>
      </div>
    </article>`;
}

export function loadingGrid(count = 8) {
  return `<div class="loading-grid">${Array.from({ length: count })
    .map(
      () => `
      <div class="loading-card">
        <div class="skeleton img"></div>
        <div class="skeleton line"></div>
        <div class="skeleton line short"></div>
      </div>`
    )
    .join("")}</div>`;
}

export function emptyState({ iconName = "bag", title, text, action }) {
  return `
    <div class="empty-state">
      <div class="cart-empty-icon">${icon(iconName)}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(text)}</p>
      ${action || ""}
    </div>`;
}

export async function copyText(text, message = "تم النسخ") {
  try {
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    toast(message);
  }
}
