import { http } from "./api.js";
import { icon } from "./icons.js";
import {
  store,
  initStore,
  money,
  formatDate,
  escapeHtml,
  discountPercent,
  stars,
  STATUS_META,
  addToCart,
  updateQty,
  removeItem,
  clearCart,
  cartCount,
  cartSubtotal,
  shippingFor,
  freeShippingActive,
  toast,
  productCard,
  loadingGrid,
  emptyState,
  copyText,
  whatsappUrl,
  telUrl,
} from "./store.js";

const app = document.getElementById("app");
const overlay = document.getElementById("overlay");
const cartDrawer = document.getElementById("cart-drawer");
const mobileNav = document.getElementById("mobile-nav");
const searchPanel = document.getElementById("search-panel");
const searchInput = document.getElementById("search-input");
const toTop = document.getElementById("to-top");

const productCache = new Map();
const PHONE_RE = /^01[0125][0-9]{8}$/;
const TRACK_STEPS = ["pending", "confirmed", "processing", "shipped", "delivered"];

/* ============================ Boot ============================ */
document.addEventListener("DOMContentLoaded", boot);

async function boot() {
  bindGlobalUI();
  const year = document.getElementById("footer-year");
  if (year) year.textContent = String(new Date().getFullYear());

  await initStore();
  applyBranding();
  renderCart();
  window.addEventListener("hashchange", router);
  router();
}

/* ============================ Router ============================ */
function parseHash() {
  const raw = (window.location.hash || "#/").replace(/^#/, "") || "/";
  const [pathPart, queryPart = ""] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  return { segments, params: new URLSearchParams(queryPart) };
}

function navigate(hash) {
  if (window.location.hash === hash) {
    router();
  } else {
    window.location.hash = hash;
  }
}

function setTitle(title) {
  const name = store.info.name || "أصيل";
  document.title = title
    ? `${title} | ${name}`
    : `${name} | ${store.info.tagline || "قطع مختارة بعناية"}`;
}

function storeName() {
  return store.info.name || "أصيل";
}

function applyBranding() {
  const info = store.info;
  const name = info.name || "أصيل";
  const nameEn = info.name_en || "ASEEL";

  document.querySelectorAll("[data-store-name]").forEach((element) => {
    element.textContent = name;
  });
  document.querySelectorAll("[data-store-name-en]").forEach((element) => {
    element.textContent = nameEn;
  });
  document.querySelectorAll("[data-store-brand-link]").forEach((element) => {
    element.setAttribute("aria-label", `${name} — الصفحة الرئيسية`);
  });

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute(
      "content",
      `${name} — ${info.tagline || "قطع مختارة بعناية"}. ملابس، أحذية، شنط وعطور أصلية مع شحن لكل المحافظات والدفع عند الاستلام.`
    );
  }

  const announce = document.getElementById("announce-shipping");
  if (announce) {
    const threshold = Number(info.free_shipping_threshold) || 0;
    announce.textContent = freeShippingActive()
      ? threshold > 0
        ? `شحن مجاني للطلبات فوق ${money(threshold)}`
        : "شحن مجاني لكل الطلبات"
      : "توصيل لكل المحافظات والدفع عند الاستلام";
  }

  // بيانات التواصل والروابط (تُعدّل من لوحة التحكم)
  const phone = info.contact_phone || "";
  const email = info.contact_email || "";
  document.querySelectorAll("[data-contact-phone]").forEach((element) => {
    element.textContent = phone;
  });
  document.querySelectorAll("[data-contact-phone-link]").forEach((element) => {
    const url = telUrl(phone);
    if (url) element.setAttribute("href", url);
    else element.removeAttribute("href");
  });
  document.querySelectorAll("[data-contact-email]").forEach((element) => {
    element.textContent = email;
  });
  document.querySelectorAll("[data-contact-email-link]").forEach((element) => {
    if (email) element.setAttribute("href", `mailto:${email}`);
    else element.removeAttribute("href");
  });
  document.querySelectorAll("[data-store-address]").forEach((element) => {
    element.textContent = info.store_address || "";
  });
  document.querySelectorAll("[data-working-hours]").forEach((element) => {
    element.textContent = info.working_hours || "";
  });

  const socialLinks = {
    instagram: info.instagram_url || "",
    facebook: info.facebook_url || "",
    whatsapp: whatsappUrl(info.whatsapp_number),
  };
  document.querySelectorAll("[data-social]").forEach((element) => {
    const url = socialLinks[element.dataset.social] || "";
    if (url) {
      element.setAttribute("href", url);
      element.hidden = false;
    } else {
      element.removeAttribute("href");
      element.hidden = true;
    }
  });

  setTitle("");
}

function updateActiveNav(route) {
  document.querySelectorAll("[data-nav]").forEach((link) => link.classList.remove("active"));
  const section = route.segments[0] || "home";
  let key = section;
  if (section === "shop") {
    const category = route.params.get("category");
    key = category === "women" || category === "men" ? category : "shop";
  }
  if (!["home", "shop", "women", "men", "about"].includes(key)) key = "shop";
  const active = document.querySelector(`[data-nav="${key}"]`);
  if (active) active.classList.add("active");
}

async function router() {
  closeDrawers();
  closeSearch();
  const route = parseHash();
  updateActiveNav(route);
  window.scrollTo(0, 0);

  const [section, param] = route.segments;

  try {
    if (!section) {
      await renderHome();
    } else if (section === "shop") {
      await renderShop(route);
    } else if (section === "product" && param) {
      await renderProduct(decodeURIComponent(param));
    } else if (section === "checkout") {
      renderCheckout();
    } else if (section === "success" && param) {
      renderSuccess(decodeURIComponent(param));
    } else if (section === "track") {
      renderTrack();
    } else if (section === "about") {
      renderAbout();
    } else {
      renderNotFound();
    }
  } catch (error) {
    console.error(error);
    renderError(error.message || "تعذر تحميل الصفحة");
  }

  app.focus({ preventScroll: true });
}

/* ============================ Global UI ============================ */
function bindGlobalUI() {
  document.addEventListener("click", handleGlobalClick);
  document.addEventListener("cart:updated", renderCart);

  const searchForm = document.getElementById("search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = searchInput.value.trim();
      closeSearch();
      navigate(`#/shop${query ? `?q=${encodeURIComponent(query)}` : ""}`);
    });
  }

  document.querySelectorAll("[data-search-term]").forEach((button) => {
    button.addEventListener("click", () => {
      const term = button.dataset.searchTerm || "";
      closeSearch();
      navigate(`#/shop?q=${encodeURIComponent(term)}`);
    });
  });

  overlay.addEventListener("click", closeDrawers);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawers();
      closeSearch();
    }
  });

  window.addEventListener("scroll", () => {
    if (!toTop) return;
    toTop.hidden = window.scrollY < 520;
  });

  if (toTop) {
    toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }
}

function handleGlobalClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  switch (action) {
    case "open-cart":
      openCart();
      break;
    case "close-cart":
      closeDrawers();
      break;
    case "toggle-search":
      toggleSearch();
      break;
    case "close-search":
      closeSearch();
      break;
    case "toggle-menu":
      toggleMenu();
      break;
    case "remove-item":
      removeItem(target.dataset.key);
      toast("تم حذف المنتج من السلة");
      break;
    case "inc": {
      const item = store.cart.find((entry) => entry.key === target.dataset.key);
      if (item) updateQty(item.key, item.qty + 1);
      break;
    }
    case "dec": {
      const item = store.cart.find((entry) => entry.key === target.dataset.key);
      if (item) updateQty(item.key, item.qty - 1);
      break;
    }
    case "quick-add":
      quickAdd(target.dataset.slug);
      break;
    case "copy":
      copyText(target.dataset.copy || "", target.dataset.message || "تم النسخ");
      break;
    case "to-top":
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    default:
      break;
  }
}

function showOverlay() {
  overlay.hidden = false;
  document.body.classList.add("no-scroll");
}

function hideOverlayIfIdle() {
  const cartOpen = cartDrawer.classList.contains("open");
  const menuOpen = !mobileNav.hidden;
  if (!cartOpen && !menuOpen) {
    overlay.hidden = true;
    document.body.classList.remove("no-scroll");
  }
}

function openCart() {
  closeSearch();
  cartDrawer.classList.add("open");
  cartDrawer.setAttribute("aria-hidden", "false");
  showOverlay();
}

function closeDrawers() {
  cartDrawer.classList.remove("open");
  cartDrawer.setAttribute("aria-hidden", "true");
  mobileNav.hidden = true;
  hideOverlayIfIdle();
}

function toggleMenu() {
  const isHidden = mobileNav.hidden;
  if (isHidden) {
    closeSearch();
    mobileNav.hidden = false;
    showOverlay();
  } else {
    mobileNav.hidden = true;
    hideOverlayIfIdle();
  }
}

function toggleSearch() {
  const isHidden = searchPanel.hidden;
  searchPanel.hidden = !isHidden;
  const toggle = document.querySelector(".search-toggle");
  if (toggle) toggle.setAttribute("aria-expanded", String(isHidden));
  if (isHidden) {
    closeDrawers();
    window.setTimeout(() => searchInput.focus(), 40);
  }
}

function closeSearch() {
  if (!searchPanel || searchPanel.hidden) return;
  searchPanel.hidden = true;
  const toggle = document.querySelector(".search-toggle");
  if (toggle) toggle.setAttribute("aria-expanded", "false");
}

/* ============================ Cart drawer ============================ */
function renderCart() {
  const count = cartCount();
  const badge = document.getElementById("cart-count");
  const subtitle = document.getElementById("cart-subtitle");
  const body = document.getElementById("cart-items");
  const foot = document.getElementById("cart-foot");
  if (!body || !foot) return;

  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
  if (subtitle) subtitle.textContent = `${count} قطعة`;

  if (count === 0) {
    body.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">${icon("bag")}</div>
        <h4>سلتك فاضية</h4>
        <p>ابدأ اختيار القطع اللي تعجبك من المتجر.</p>
        <a href="#/shop" class="btn btn-primary btn-sm" data-action="close-cart">تسوق الآن ${icon("arrowLeft")}</a>
      </div>`;
    foot.innerHTML = "";
    return;
  }

  body.innerHTML = store.cart
    .map((item) => {
      const meta = [item.size ? `مقاس ${item.size}` : "", item.color || ""]
        .filter(Boolean)
        .join(" • ");
      return `
        <div class="cart-item">
          <div class="cart-item-img">
            <a href="#/product/${encodeURIComponent(item.slug)}" data-action="close-cart">
              <img src="${escapeHtml(item.image || "/static/img/placeholder.svg")}" alt="${escapeHtml(
                item.name
              )}" onerror="this.src='/static/img/placeholder.svg'">
            </a>
          </div>
          <div class="cart-item-body">
            <a href="#/product/${encodeURIComponent(item.slug)}" data-action="close-cart">${escapeHtml(
              item.name
            )}</a>
            ${meta ? `<span class="cart-item-meta">${escapeHtml(meta)}</span>` : ""}
            <div class="cart-item-price">${money(item.price * item.qty)}</div>
          </div>
          <div class="cart-item-actions">
            <button type="button" class="cart-remove" data-action="remove-item" data-key="${escapeHtml(
              item.key
            )}" aria-label="حذف ${escapeHtml(item.name)}">${icon("trash")}</button>
            <div class="qty-stepper">
              <button type="button" data-action="inc" data-key="${escapeHtml(
                item.key
              )}" aria-label="زيادة الكمية">${icon("plus")}</button>
              <span>${item.qty}</span>
              <button type="button" data-action="dec" data-key="${escapeHtml(
                item.key
              )}" aria-label="تقليل الكمية">${icon("minus")}</button>
            </div>
          </div>
        </div>`;
    })
    .join("");

  const subtotal = cartSubtotal();
  const freeShip = freeShippingActive();
  const threshold = Number(store.info.free_shipping_threshold) || 0;
  const remaining = Math.max(0, threshold - subtotal);
  const progress = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 0;

  foot.innerHTML = `
    ${
      freeShip
        ? threshold > 0
          ? `<div class="ship-progress">
      <p>${
        remaining > 0
          ? `أضف <strong>${money(remaining)}</strong> للحصول على شحن مجاني`
          : "مبروك! حصلت على <strong>شحن مجاني</strong>"
      }</p>
      <div class="ship-bar"><span style="width:${progress}%"></span></div>
    </div>`
          : `<div class="ship-progress"><p>شحن مجاني لكل الطلبات</p></div>`
        : ""
    }
    <div class="cart-subtotal">
      <span>الإجمالي الفرعي</span>
      <strong>${money(subtotal)}</strong>
    </div>
    <p class="cart-note">الشحن والضرائب تُحسب في صفحة إتمام الطلب.</p>
    <a href="#/checkout" class="btn btn-primary btn-block" data-action="close-cart">
      إتمام الطلب ${icon("arrowLeft")}
    </a>`;
}

/* ============================ Helpers ============================ */
function rememberProducts(items) {
  (items || []).forEach((product) => {
    if (product?.slug) productCache.set(product.slug, product);
  });
}

async function quickAdd(slug) {
  if (!slug) return;
  try {
    let product = productCache.get(slug);
    if (!product) {
      product = await http.get(`/api/products/${encodeURIComponent(slug)}`);
      productCache.set(slug, product);
    }
    addToCart(product, {
      size: product.sizes?.[0] || "",
      color: product.colors?.[0]?.name || "",
      qty: 1,
    });
    toast(`تمت إضافة «${product.name}» إلى السلة`);
  } catch (error) {
    toast(error.message || "تعذر إضافة المنتج", "error");
  }
}

function renderError(message) {
  app.innerHTML = `<div class="container">${emptyState({
    iconName: "alert",
    title: "حدث خطأ",
    text: message,
    action: `<a href="#/" class="btn btn-primary">العودة للرئيسية</a>`,
  })}</div>`;
}

function renderNotFound() {
  setTitle("الصفحة غير موجودة");
  app.innerHTML = `<div class="container" style="padding-block:60px">${emptyState({
    iconName: "search",
    title: "الصفحة غير موجودة",
    text: "الرابط اللي بتدور عليه مش موجود. جرّب ترجع للرئيسية أو تتسوق من المتجر.",
    action: `<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <a href="#/" class="btn btn-primary">الرئيسية</a>
      <a href="#/shop" class="btn btn-outline">المتجر</a>
    </div>`,
  })}</div>`;
}

/* ============================ Home ============================ */
async function renderHome() {
  setTitle("");

  app.innerHTML = `
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy fade-up">
          <span class="eyebrow">مجموعة 2026</span>
          <h1>أناقة تُحكى<br>بـ<em>التفاصيل</em></h1>
          <p>قطع مختارة بعناية من خامات أصلية — ملابس، أحذية، شنط وعطور. كل قطعة اتاختارت عشان تكمّل إطلالتك وتعيش معاك.</p>
          <div class="hero-actions">
            <a href="#/shop" class="btn btn-primary">تسوق المجموعة ${icon("arrowLeft")}</a>
            <a href="#/about" class="btn btn-outline">اكتشف قصتنا</a>
          </div>
          <div class="hero-meta">
            <div><strong>19+</strong><span>قطعة مختارة</span></div>
            <div><strong>4.9/5</strong><span>تقييم العملاء</span></div>
            <div><strong>${(store.info.governorates || []).length || 27}</strong><span>محافظة نشحن لها</span></div>
          </div>
        </div>
        <div class="hero-visual fade-up">
          <div class="hero-image">
            <img src="/static/img/hero-woman.jpg" alt="مجموعة ${escapeHtml(
              store.info.name || "أصيل"
            )} الجديدة" fetchpriority="high">
          </div>
          <div class="hero-float-card" id="hero-float">
            <div class="skeleton" style="width:64px;height:78px;border-radius:10px;flex:none"></div>
            <div class="fc-body" style="flex:1">
              <div class="skeleton" style="height:10px;width:50%"></div>
              <div class="skeleton" style="height:13px;width:85%;margin-top:6px"></div>
              <div class="skeleton" style="height:12px;width:35%;margin-top:8px"></div>
            </div>
          </div>
          ${
            freeShippingActive()
              ? `<div class="hero-badge">
            <strong>شحن مجاني</strong>
            <small>${
              Number(store.info.free_shipping_threshold) > 0
                ? `للطلبات فوق ${money(store.info.free_shipping_threshold)}`
                : "لكل الطلبات"
            }</small>
          </div>`
              : ""
          }
        </div>
      </div>
    </section>

    <div class="trust">
      <div class="container trust-grid">
        <div class="trust-item">
          <span class="trust-icon">${icon("truck")}</span>
          <div><strong>شحن لكل المحافظات</strong><span>توصيل خلال 2–5 أيام عمل</span></div>
        </div>
        <div class="trust-item">
          <span class="trust-icon">${icon("cash")}</span>
          <div><strong>دفع مرن وآمن</strong><span>عند الاستلام أو إنستاباي</span></div>
        </div>
        <div class="trust-item">
          <span class="trust-icon">${icon("refresh")}</span>
          <div><strong>استرجاع خلال 14 يوم</strong><span>بدون أسئلة معقدة</span></div>
        </div>
        <div class="trust-item">
          <span class="trust-icon">${icon("shield")}</span>
          <div><strong>خامات أصلية مضمونة</strong><span>جودة نختارها بنفسنا</span></div>
        </div>
      </div>
    </div>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow">تسوق حسب القسم</span>
            <h2>كل اللي محتاجه في مكان واحد</h2>
            <p>من الأساسيات اليومية لقطع المناسبات — اختار القسم وابدأ.</p>
          </div>
          <a href="#/shop" class="link-arrow">كل المنتجات ${icon("arrowLeft")}</a>
        </div>
        <div class="cat-grid" id="home-categories">
          ${Array.from({ length: 6 })
            .map(() => '<div class="cat-card skeleton" style="border-radius:18px"></div>')
            .join("")}
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow">مختارات ${escapeHtml(storeName())}</span>
            <h2>قطع تستاهل تكون في دولابك</h2>
            <p>أكثر القطع اللي عملاؤنا بيرجعوا ليها.</p>
          </div>
          <a href="#/shop" class="link-arrow">عرض الكل ${icon("arrowLeft")}</a>
        </div>
        <div id="home-featured">${loadingGrid(4)}</div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="editorial">
          <div class="editorial-copy">
            <span class="eyebrow">فلسفة ${escapeHtml(storeName())}</span>
            <h2>خامات تختارها مرة…<br>تعيش معاك سنين</h2>
            <p>مش بنجري ورا الكمية. بنختار كل قطعة بالقطعة، نلمس الخامة، ونتأكد إنها تستاهل تتحط في دولابك. لأن اللي بيعيش معاك هو اللي يستاهل.</p>
            <a href="#/shop?category=men" class="btn btn-gold">اكتشف المجموعة ${icon("arrowLeft")}</a>
          </div>
          <div class="editorial-image">
            <img src="/static/img/hero-store.jpg" alt="داخل متجر ${escapeHtml(
              storeName()
            )}" loading="lazy">
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="section-head">
          <div>
            <span class="eyebrow">وصل حديثًا</span>
            <h2>أحدث الإضافات</h2>
            <p>قطع جديدة نضيفها كل أسبوع.</p>
          </div>
          <a href="#/shop?sort=newest" class="link-arrow">شوف الجديد ${icon("arrowLeft")}</a>
        </div>
        <div id="home-new">${loadingGrid(4)}</div>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="container">
        <div class="quote-block">
          <span class="quote-mark">”</span>
          <blockquote>الأناقة مش كتر القطع… الأناقة إنك تختار القطعة الصح، وتلبسها بثقة.</blockquote>
          <cite>— فلسفة ${escapeHtml(storeName())}</cite>
        </div>
      </div>
    </section>`;

  renderHomeCategories();

  const [featuredResult, newestResult] = await Promise.allSettled([
    http.get("/api/products?featured=true&page_size=8&sort=newest"),
    http.get("/api/products?page_size=4&sort=newest"),
  ]);

  const featured =
    featuredResult.status === "fulfilled" ? featuredResult.value.items || [] : [];
  const newest =
    newestResult.status === "fulfilled" ? newestResult.value.items || [] : [];

  rememberProducts(featured);
  rememberProducts(newest);

  const featuredWrap = document.getElementById("home-featured");
  if (featuredWrap) {
    featuredWrap.innerHTML =
      featured.length > 0
        ? `<div class="product-grid">${featured.map(productCard).join("")}</div>`
        : emptyState({
            title: "لا توجد منتجات مميزة بعد",
            text: "تصفح كل المنتجات للبدء.",
            action: '<a href="#/shop" class="btn btn-primary btn-sm">تصفح المتجر</a>',
          });
  }

  const newestWrap = document.getElementById("home-new");
  if (newestWrap) {
    newestWrap.innerHTML =
      newest.length > 0
        ? `<div class="product-grid">${newest.map(productCard).join("")}</div>`
        : "";
  }

  const floatProduct = featured[0] || newest[0];
  const float = document.getElementById("hero-float");
  if (float && floatProduct) {
    float.innerHTML = `
      <img src="${escapeHtml(floatProduct.image_url || "/static/img/placeholder.svg")}" alt="${escapeHtml(
        floatProduct.name
      )}">
      <div class="fc-body">
        <small>${escapeHtml(floatProduct.category?.name || "مختار بعناية")}</small>
        <strong>${escapeHtml(floatProduct.name)}</strong>
        <span class="fc-price">${money(floatProduct.price)}</span>
      </div>`;
    float.style.cursor = "pointer";
    float.addEventListener("click", () =>
      navigate(`#/product/${encodeURIComponent(floatProduct.slug)}`)
    );
  }
}

function renderHomeCategories() {
  const wrap = document.getElementById("home-categories");
  if (!wrap) return;
  if (!store.categories.length) {
    wrap.innerHTML = "";
    return;
  }
  wrap.innerHTML = store.categories
    .map(
      (category) => `
      <a href="#/shop?category=${encodeURIComponent(category.slug)}" class="cat-card">
        <img src="${escapeHtml(category.image_url || "/static/img/placeholder.svg")}" alt="${escapeHtml(
          category.name
        )}" loading="lazy" onerror="this.src='/static/img/placeholder.svg'">
        <div class="cat-body">
          <strong>${escapeHtml(category.name)}</strong>
          <span>تسوق القسم</span>
          <span class="cat-arrow">${icon("arrowLeft")}</span>
        </div>
      </a>`
    )
    .join("");
}

/* ============================ Shop ============================ */
async function renderShop(route) {
  let category = route.params.get("category") || "";
  let query = route.params.get("q") || "";
  let sort = route.params.get("sort") || "newest";
  let page = 1;
  let pages = 1;
  let loading = false;

  const categoryObject = store.categories.find((item) => item.slug === category);
  const title = categoryObject?.name || (query ? `نتائج البحث` : "كل المنتجات");
  setTitle(categoryObject?.name || "المتجر");

  const sortOptions = [
    ["newest", "الأحدث"],
    ["price_asc", "السعر: من الأقل"],
    ["price_desc", "السعر: من الأعلى"],
    ["rating", "الأعلى تقييمًا"],
    ["name", "أبجديًا"],
  ];

  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">الرئيسية</a> ${icon("chevronLeft")}
          <span>${escapeHtml(title)}</span>
        </div>
        <h1 id="shop-title">${escapeHtml(title)}</h1>
        <p id="shop-subtitle">${
          categoryObject?.description
            ? escapeHtml(categoryObject.description)
            : "قطع مختارة بعناية، بأسعار واضحة وجودة مضمونة."
        }</p>
      </div>
    </section>

    <div class="container">
      <div class="shop-toolbar">
        <div class="filter-chips" id="shop-chips">
          <button type="button" class="chip ${!category ? "active" : ""}" data-category="">الكل</button>
          ${store.categories
            .map(
              (item) =>
                `<button type="button" class="chip ${
                  item.slug === category ? "active" : ""
                }" data-category="${escapeHtml(item.slug)}">${escapeHtml(item.name)}</button>`
            )
            .join("")}
        </div>
        <div class="shop-controls">
          <label class="shop-search">
            ${icon("search")}
            <input type="search" id="shop-search" placeholder="ابحث في المتجر…" value="${escapeHtml(
              query
            )}" aria-label="بحث في المتجر">
          </label>
          <select class="shop-sort" id="shop-sort" aria-label="ترتيب المنتجات">
            ${sortOptions
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${value === sort ? "selected" : ""}>${label}</option>`
              )
              .join("")}
          </select>
        </div>
      </div>

      <div class="shop-results">
        <div class="results-line">
          <span id="shop-count">جارٍ التحميل…</span>
          <span>${icon("truck")} شحن لكل المحافظات</span>
        </div>
        <div id="shop-grid">${loadingGrid(8)}</div>
        <div class="load-more-wrap" id="load-more-wrap" hidden>
          <button type="button" class="btn btn-outline" id="load-more">تحميل المزيد</button>
        </div>
      </div>
    </div>`;

  const grid = document.getElementById("shop-grid");
  const countLabel = document.getElementById("shop-count");
  const loadWrap = document.getElementById("load-more-wrap");
  const loadButton = document.getElementById("load-more");
  const searchField = document.getElementById("shop-search");
  const sortField = document.getElementById("shop-sort");
  const chips = document.getElementById("shop-chips");

  // إظهار القسم النشط داخل شريط الفلاتر على الشاشات الصغيرة
  const activeChip = chips?.querySelector(".chip.active");
  if (activeChip) {
    setTimeout(() => {
      if (chips.scrollWidth > chips.clientWidth) {
        activeChip.scrollIntoView({ inline: "center", block: "nearest" });
      }
    }, 0);
  }

  function syncUrl() {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query) params.set("q", query);
    if (sort && sort !== "newest") params.set("sort", sort);
    const suffix = params.toString();
    window.history.replaceState(null, "", `#/shop${suffix ? `?${suffix}` : ""}`);
  }

  async function load(reset = false) {
    if (loading) return;
    loading = true;
    if (reset) {
      page = 1;
      grid.innerHTML = loadingGrid(8);
      loadWrap.hidden = true;
    }
    loadButton.disabled = true;
    loadButton.textContent = "جارٍ التحميل…";

    const params = new URLSearchParams({
      page: String(page),
      page_size: "12",
      sort,
    });
    if (category) params.set("category", category);
    if (query) params.set("q", query);

    try {
      const data = await http.get(`/api/products?${params.toString()}`);
      pages = data.pages || 1;
      const items = data.items || [];
      rememberProducts(items);

      if (reset) {
        grid.innerHTML =
          items.length > 0
            ? `<div class="product-grid">${items.map(productCard).join("")}</div>`
            : emptyState({
                iconName: "search",
                title: "مفيش نتائج مطابقة",
                text: "جرّب كلمة بحث تانية أو اختار قسم مختلف.",
                action: `<button type="button" class="btn btn-outline btn-sm" id="clear-filters">مسح الفلاتر</button>`,
              });
        const clear = document.getElementById("clear-filters");
        if (clear) {
          clear.addEventListener("click", () => {
            category = "";
            query = "";
            sort = "newest";
            if (searchField) searchField.value = "";
            if (sortField) sortField.value = "newest";
            document
              .querySelectorAll("#shop-chips .chip")
              .forEach((chip) => chip.classList.toggle("active", !chip.dataset.category));
            syncUrl();
            load(true);
          });
        }
      } else if (items.length > 0) {
        const productGrid = grid.querySelector(".product-grid");
        if (productGrid) productGrid.insertAdjacentHTML("beforeend", items.map(productCard).join(""));
      }

      countLabel.textContent = `${data.total} منتج`;
      loadWrap.hidden = page >= pages;
      loadButton.disabled = false;
      loadButton.textContent = "تحميل المزيد";
    } catch (error) {
      grid.innerHTML = `<div class="error-banner">${icon("alert")} ${escapeHtml(
        error.message || "تعذر تحميل المنتجات"
      )}</div>`;
      countLabel.textContent = "تعذر التحميل";
      loadWrap.hidden = true;
    } finally {
      loading = false;
    }
  }

  chips.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-category]");
    if (!chip) return;
    category = chip.dataset.category || "";
    chips.querySelectorAll(".chip").forEach((item) => item.classList.toggle("active", item === chip));
    const selected = store.categories.find((item) => item.slug === category);
    const heading = document.getElementById("shop-title");
    const subtitle = document.getElementById("shop-subtitle");
    if (heading) heading.textContent = selected?.name || "كل المنتجات";
    if (subtitle) {
      subtitle.textContent =
        selected?.description || "قطع مختارة بعناية، بأسعار واضحة وجودة مضمونة.";
    }
    setTitle(selected?.name || "المتجر");
    syncUrl();
    load(true);
  });

  let searchTimer = null;
  searchField.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      query = searchField.value.trim();
      syncUrl();
      load(true);
    }, 420);
  });

  sortField.addEventListener("change", () => {
    sort = sortField.value;
    syncUrl();
    load(true);
  });

  loadButton.addEventListener("click", () => {
    page += 1;
    load(false);
  });

  await load(true);
}

/* ============================ Product ============================ */
async function renderProduct(slug) {
  setTitle("المنتج");

  app.innerHTML = `
    <div class="container" style="padding-block:40px">
      <div class="skeleton" style="height:16px;width:220px;margin-bottom:26px"></div>
      <div class="product-detail">
        <div class="skeleton" style="aspect-ratio:4/4.9;border-radius:22px"></div>
        <div>
          <div class="skeleton" style="height:14px;width:30%"></div>
          <div class="skeleton" style="height:38px;width:80%;margin-top:14px"></div>
          <div class="skeleton" style="height:14px;width:50%;margin-top:14px"></div>
          <div class="skeleton" style="height:28px;width:35%;margin-top:24px"></div>
          <div class="skeleton" style="height:80px;width:100%;margin-top:24px"></div>
          <div class="skeleton" style="height:50px;width:100%;margin-top:24px"></div>
        </div>
      </div>
    </div>`;

  let product;
  try {
    product = await http.get(`/api/products/${encodeURIComponent(slug)}`);
  } catch (error) {
    setTitle("المنتج غير موجود");
    app.innerHTML = `<div class="container" style="padding-block:50px">${emptyState({
      iconName: "bag",
      title: "المنتج غير متوفر",
      text: error.message || "المنتج اللي بتدور عليه مش موجود أو اتشال من المتجر.",
      action: '<a href="#/shop" class="btn btn-primary">تصفح المتجر</a>',
    })}</div>`;
    return;
  }

  rememberProducts([product]);
  setTitle(product.name);

  let related = [];
  try {
    related = await http.get(`/api/products/${encodeURIComponent(slug)}/related`);
    rememberProducts(related);
  } catch {
    related = [];
  }

  const images = [product.image_url, ...(product.gallery || [])].filter(Boolean);
  const discount = discountPercent(product);
  const inStock = Number(product.stock) > 0;
  const sizes = product.sizes || [];
  const colors = product.colors || [];

  let selectedSize = sizes[0] || "";
  let selectedColor = colors[0]?.name || "";
  let quantity = 1;

  const oldPrice =
    discount > 0
      ? `<span class="price-old">${money(product.compare_at_price)}</span>
         <span class="save">وفّر ${money(product.compare_at_price - product.price)}</span>`
      : "";

  app.innerHTML = `
    <section class="product-page">
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">الرئيسية</a> ${icon("chevronLeft")}
          <a href="#/shop">المتجر</a> ${icon("chevronLeft")}
          ${
            product.category
              ? `<a href="#/shop?category=${encodeURIComponent(
                  product.category.slug
                )}">${escapeHtml(product.category.name)}</a> ${icon("chevronLeft")}`
              : ""
          }
          <span>${escapeHtml(product.name)}</span>
        </div>

        <div class="product-detail">
          <div class="gallery">
            <div class="gallery-main">
              <img id="gallery-main-img" src="${escapeHtml(images[0] || "/static/img/placeholder.svg")}"
                   alt="${escapeHtml(product.name)}" onerror="this.src='/static/img/placeholder.svg'">
              <div class="product-badges">
                ${discount > 0 ? `<span class="badge badge-sale">خصم ${discount}%</span>` : ""}
                ${product.is_featured ? `<span class="badge badge-new">مختار بعناية</span>` : ""}
              </div>
            </div>
            ${
              images.length > 1
                ? `<div class="gallery-thumbs">
                    ${images
                      .map(
                        (image, index) =>
                          `<button type="button" class="gallery-thumb ${
                            index === 0 ? "active" : ""
                          }" data-image="${escapeHtml(image)}">
                            <img src="${escapeHtml(image)}" alt="صورة ${index + 1} للمنتج">
                          </button>`
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>

          <div class="product-info-panel">
            <span class="eyebrow">${escapeHtml(product.category?.name || storeName())}</span>
            <h1>${escapeHtml(product.name)}</h1>
            <div class="rating-line">
              ${stars(product.rating, product.reviews_count)}
              <span class="in-stock ${inStock ? "" : "out-stock"}">${
                inStock ? `متوفر — ${product.stock} قطعة` : "غير متوفر حاليًا"
              }</span>
            </div>

            <div class="detail-price">
              <span class="price">${money(product.price)}</span>
              ${oldPrice}
            </div>

            <p class="detail-desc">${escapeHtml(product.description || "")}</p>

            ${
              sizes.length
                ? `<div class="variant-group">
                    <div class="variant-head">
                      <span>المقاس</span>
                      <span class="selected-value" id="selected-size">${escapeHtml(selectedSize)}</span>
                    </div>
                    <div class="variant-options" id="size-options">
                      ${sizes
                        .map(
                          (size, index) =>
                            `<button type="button" class="size-option ${
                              index === 0 ? "active" : ""
                            }" data-size="${escapeHtml(size)}">${escapeHtml(size)}</button>`
                        )
                        .join("")}
                    </div>
                  </div>`
                : ""
            }

            ${
              colors.length
                ? `<div class="variant-group">
                    <div class="variant-head">
                      <span>اللون</span>
                      <span class="selected-value" id="selected-color">${escapeHtml(
                        selectedColor
                      )}</span>
                    </div>
                    <div class="variant-options" id="color-options">
                      ${colors
                        .map(
                          (color, index) =>
                            `<button type="button" class="color-option ${
                              index === 0 ? "active" : ""
                            }" data-color="${escapeHtml(color.name)}" data-hex="${escapeHtml(
                              color.hex || "#1f3d33"
                            )}" title="${escapeHtml(color.name)}" aria-label="${escapeHtml(
                              color.name
                            )}" style="background:${escapeHtml(color.hex || "#1f3d33")}"></button>`
                        )
                        .join("")}
                    </div>
                  </div>`
                : ""
            }

            <div class="buy-row">
              <div class="qty-stepper" id="detail-qty">
                <button type="button" data-step="1" aria-label="زيادة الكمية">${icon("plus")}</button>
                <span id="qty-value">1</span>
                <button type="button" data-step="-1" aria-label="تقليل الكمية">${icon("minus")}</button>
              </div>
              <button type="button" class="btn btn-primary" id="add-to-cart" ${
                inStock ? "" : "disabled"
              }>${icon("bag")} ${inStock ? "أضف للسلة" : "غير متوفر"}</button>
              <button type="button" class="btn btn-outline" id="buy-now" ${
                inStock ? "" : "disabled"
              }>اشترِ الآن</button>
            </div>

            <div class="detail-trust">
              <div>${icon("truck")} شحن سريع 2–5 أيام</div>
              <div>${icon("refresh")} استرجاع خلال 14 يوم</div>
              <div>${icon("shield")} دفع آمن عند الاستلام</div>
            </div>

            <div class="accordion">
              <details open>
                <summary>الوصف والمواصفات ${icon("chevronDown")}</summary>
                <div class="acc-body">${escapeHtml(product.details || product.description || "")}</div>
              </details>
              <details>
                <summary>الشحن والتوصيل ${icon("chevronDown")}</summary>
                <div class="acc-body">نشحن لمحافظات مصر المتاحة خلال 2–5 أيام عمل.${
                  freeShippingActive()
                    ? Number(store.info.free_shipping_threshold) > 0
                      ? ` الشحن مجاني للطلبات فوق ${money(
                          store.info.free_shipping_threshold
                        )}.`
                      : " الشحن مجاني لكل الطلبات."
                    : ""
                } هيتم التواصل معاك لتأكيد الطلب قبل الشحن.</div>
              </details>
              <details>
                <summary>الاسترجاع والاستبدال ${icon("chevronDown")}</summary>
                <div class="acc-body">تقدر ترجع أو تستبدل المنتج خلال 14 يوم من الاستلام بشرط إنه يكون بحالته الأصلية. تواصل معانا على واتساب وهنرتب كل حاجة.</div>
              </details>
            </div>
          </div>
        </div>

        ${
          related.length
            ? `<section class="related-section">
                <div class="section-head">
                  <div>
                    <span class="eyebrow">ممكن يعجبك كمان</span>
                    <h2>قطع من نفس القسم</h2>
                  </div>
                  <a href="#/shop?category=${encodeURIComponent(
                    product.category?.slug || ""
                  )}" class="link-arrow">شوف الكل ${icon("arrowLeft")}</a>
                </div>
                <div class="product-grid">${related.map(productCard).join("")}</div>
              </section>`
            : ""
        }
      </div>
    </section>`;

  const galleryMain = document.getElementById("gallery-main-img");
  document.querySelectorAll(".gallery-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => {
      if (galleryMain) galleryMain.src = thumb.dataset.image;
      document
        .querySelectorAll(".gallery-thumb")
        .forEach((item) => item.classList.toggle("active", item === thumb));
    });
  });

  const sizeOptions = document.getElementById("size-options");
  if (sizeOptions) {
    sizeOptions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-size]");
      if (!button) return;
      selectedSize = button.dataset.size;
      sizeOptions
        .querySelectorAll(".size-option")
        .forEach((item) => item.classList.toggle("active", item === button));
      const label = document.getElementById("selected-size");
      if (label) label.textContent = selectedSize;
    });
  }

  const colorOptions = document.getElementById("color-options");
  if (colorOptions) {
    colorOptions.addEventListener("click", (event) => {
      const button = event.target.closest("[data-color]");
      if (!button) return;
      selectedColor = button.dataset.color;
      colorOptions
        .querySelectorAll(".color-option")
        .forEach((item) => item.classList.toggle("active", item === button));
      const label = document.getElementById("selected-color");
      if (label) label.textContent = selectedColor;
    });
  }

  const qtyWrap = document.getElementById("detail-qty");
  const qtyValue = document.getElementById("qty-value");
  if (qtyWrap) {
    qtyWrap.addEventListener("click", (event) => {
      const button = event.target.closest("[data-step]");
      if (!button) return;
      quantity = Math.max(
        1,
        Math.min(Number(product.stock) || 99, quantity + Number(button.dataset.step))
      );
      qtyValue.textContent = String(quantity);
    });
  }

  function addCurrent() {
    addToCart(product, { size: selectedSize, color: selectedColor, qty: quantity });
    toast(`تمت إضافة «${product.name}» إلى السلة`);
    openCart();
  }

  const addButton = document.getElementById("add-to-cart");
  if (addButton) addButton.addEventListener("click", addCurrent);

  const buyButton = document.getElementById("buy-now");
  if (buyButton) {
    buyButton.addEventListener("click", () => {
      addToCart(product, { size: selectedSize, color: selectedColor, qty: quantity });
      navigate("#/checkout");
    });
  }
}

/* ============================ Checkout ============================ */
function renderCheckout() {
  setTitle("إتمام الطلب");

  if (!store.cart.length) {
    app.innerHTML = `<div class="container" style="padding-block:60px">${emptyState({
      iconName: "bag",
      title: "سلتك فاضية",
      text: "ضيف قطعة أو أكثر للسلة الأول، وبعدين كمّل الطلب.",
      action: '<a href="#/shop" class="btn btn-primary">ابدأ التسوق</a>',
    })}</div>`;
    return;
  }

  const governorates = store.info.governorates || [];
  const methods = store.info.payment_methods || [];
  const methodIcons = { cod: "cash", instapay: "creditCard", wallet: "wallet" };

  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">الرئيسية</a> ${icon("chevronLeft")}
          <a href="#/shop">المتجر</a> ${icon("chevronLeft")}
          <span>إتمام الطلب</span>
        </div>
        <h1>إتمام الطلب</h1>
        <p>خطوة واحدة وطلبك يوصلك. بياناتك محفوظة وآمنة.</p>
      </div>
    </section>

    <div class="container checkout-page">
      <div class="checkout-grid">
        <form id="checkout-form" novalidate>
          <div class="checkout-card">
            <h3><span class="step-num">1</span> بيانات التوصيل</h3>
            <div class="form-grid">
              <div class="field">
                <label for="customer-name">الاسم بالكامل <span>*</span></label>
                <input class="input" id="customer-name" name="customer_name" autocomplete="name" placeholder="مثال: أحمد محمد">
                <span class="field-error" id="customer-name-error"></span>
              </div>
              <div class="field">
                <label for="customer-phone">رقم الهاتف <span>*</span></label>
                <input class="input" id="customer-phone" name="customer_phone" inputmode="tel" autocomplete="tel"
                       placeholder="01XXXXXXXXX" style="direction:ltr;text-align:right">
                <span class="field-error" id="customer-phone-error"></span>
              </div>
              <div class="field">
                <label for="customer-governorate">المحافظة <span>*</span></label>
                <select class="select" id="customer-governorate" name="governorate">
                  <option value="">اختر المحافظة</option>
                  ${governorates
                    .map(
                      (item) =>
                        `<option value="${escapeHtml(item.name)}">${escapeHtml(
                          item.name
                        )} — شحن ${money(item.fee)}</option>`
                    )
                    .join("")}
                </select>
                <span class="field-error" id="customer-governorate-error"></span>
                ${
                  governorates.length === 0
                    ? `<span class="field-hint" style="color:var(--danger)">الشحن غير متاح حاليًا لكل المحافظات، تواصل معنا للاستفسار.</span>`
                    : ""
                }
              </div>
              <div class="field">
                <label for="customer-city">المدينة / المنطقة <span>*</span></label>
                <input class="input" id="customer-city" name="city" autocomplete="address-level2" placeholder="مثال: مدينة نصر">
                <span class="field-error" id="customer-city-error"></span>
              </div>
              <div class="field full">
                <label for="customer-address">العنوان بالتفصيل <span>*</span></label>
                <textarea class="textarea" id="customer-address" name="address" autocomplete="street-address"
                          placeholder="اسم الشارع، رقم العمارة، الدور، أي علامة مميزة"></textarea>
                <span class="field-error" id="customer-address-error"></span>
              </div>
              <div class="field full">
                <label for="customer-notes">ملاحظات للمندوب (اختياري)</label>
                <textarea class="textarea" id="customer-notes" name="notes" style="min-height:70px"
                          placeholder="مثال: الاتصال قبل الوصول"></textarea>
              </div>
            </div>
          </div>

          <div class="checkout-card">
            <h3><span class="step-num">2</span> طريقة الدفع</h3>
            <div class="payment-options" id="payment-options">
              ${
                methods.length
                  ? methods
                      .map(
                        (method, index) => `
                  <label class="payment-option ${index === 0 ? "selected" : ""}" data-payment="${escapeHtml(
                    method.id
                  )}">
                    <input type="radio" name="payment_method" value="${escapeHtml(
                      method.id
                    )}" ${index === 0 ? "checked" : ""}>
                    <span class="pay-radio"></span>
                    <span class="pay-body">
                      <strong>${escapeHtml(method.name)}</strong>
                      <span>${escapeHtml(method.description || "")}</span>
                    </span>
                    <span style="margin-inline-start:auto;color:var(--muted)">${icon(
                      method.icon || methodIcons[method.id] || "creditCard"
                    )}</span>
                  </label>`
                      )
                      .join("")
                  : `<p class="checkout-note" style="color:var(--danger);margin:0">
                      لا توجد طرق دفع متاحة حاليًا، تواصل معنا لإتمام طلبك.
                    </p>`
              }
            </div>
            <p class="checkout-note" id="payment-note">
              هيتم التواصل معاك على رقم الهاتف لتأكيد الطلب قبل الشحن.
            </p>
          </div>

          <div class="checkout-card" style="margin-bottom:0">
            <h3><span class="step-num">3</span> تأكيد الطلب</h3>
            <p class="checkout-note" style="margin:0 0 16px">
              بالضغط على «تأكيد الطلب» أنت موافق على سياسة الشحن والاسترجاع الخاصة بالمتجر.
            </p>
            <button type="submit" class="btn btn-primary btn-block" id="place-order"
                    ${methods.length ? "" : "disabled"}>
              تأكيد الطلب ${icon("arrowLeft")}
            </button>
          </div>
        </form>

        <aside class="checkout-summary">
          <div class="summary-head">
            <h3>ملخص الطلب</h3>
            <span>${cartCount()} قطعة</span>
          </div>
          <div class="summary-items">
            ${store.cart
              .map(
                (item) => `
                <div class="summary-item">
                  <img src="${escapeHtml(item.image || "/static/img/placeholder.svg")}" alt="${escapeHtml(
                    item.name
                  )}" onerror="this.src='/static/img/placeholder.svg'">
                  <div>
                    <div class="si-name">${escapeHtml(item.name)}</div>
                    <div class="si-meta">${[
                      item.size ? `مقاس ${item.size}` : "",
                      item.color || "",
                      `الكمية: ${item.qty}`,
                    ]
                      .filter(Boolean)
                      .join(" • ")}</div>
                  </div>
                  <div class="si-price">${money(item.price * item.qty)}</div>
                </div>`
              )
              .join("")}
          </div>
          <div class="summary-totals" id="summary-totals"></div>
        </aside>
      </div>
    </div>`;

  const form = document.getElementById("checkout-form");
  const governorateField = document.getElementById("customer-governorate");
  const paymentWrap = document.getElementById("payment-options");
  const paymentNote = document.getElementById("payment-note");
  const submitButton = document.getElementById("place-order");

  let paymentMethod = methods[0]?.id || "";

  function updateTotals() {
    const subtotal = cartSubtotal();
    const shipping = governorateField.value
      ? shippingFor(subtotal, governorateField.value)
      : shippingFor(subtotal, "");
    const total = subtotal + shipping;
    const freeShip = freeShippingActive();
    const threshold = Number(store.info.free_shipping_threshold) || 0;
    const remaining = Math.max(0, threshold - subtotal);
    const progress = threshold > 0 ? Math.min(100, (subtotal / threshold) * 100) : 0;

    document.getElementById("summary-totals").innerHTML = `
      ${
        freeShip
          ? threshold > 0
            ? `<div class="ship-progress">
        <p>${
          remaining > 0
            ? `أضف <strong>${money(remaining)}</strong> للحصول على شحن مجاني`
            : "مبروك! حصلت على <strong>شحن مجاني</strong>"
        }</p>
        <div class="ship-bar"><span style="width:${progress}%"></span></div>
      </div>`
            : `<div class="ship-progress"><p>شحن مجاني لكل الطلبات</p></div>`
          : ""
      }
      <div class="summary-row"><span>الإجمالي الفرعي</span><span>${money(subtotal)}</span></div>
      <div class="summary-row"><span>الشحن</span><span>${
        governorateField.value
          ? shipping === 0
            ? '<span class="free">مجاني</span>'
            : money(shipping)
          : "يُحسب حسب المحافظة"
      }</span></div>
      <div class="summary-row total"><span>الإجمالي</span><strong>${money(
        governorateField.value ? total : subtotal
      )}</strong></div>
      <button type="submit" form="checkout-form" class="btn btn-primary btn-block" id="summary-submit">
        تأكيد الطلب ${icon("arrowLeft")}
      </button>
      <div class="summary-secure">${icon("lock")} بياناتك محمية ومشفرة</div>`;
  }

  updateTotals();

  governorateField.addEventListener("change", updateTotals);

  paymentWrap.addEventListener("click", (event) => {
    const option = event.target.closest("[data-payment]");
    if (!option) return;
    paymentMethod = option.dataset.payment;
    paymentWrap
      .querySelectorAll(".payment-option")
      .forEach((item) => item.classList.toggle("selected", item === option));
    const radio = option.querySelector("input[type=radio]");
    if (radio) radio.checked = true;

    if (paymentMethod === "instapay") {
      paymentNote.textContent = `هيتوفر لك رقم حساب إنستاباي (${store.info.instapay_handle}) بعد تأكيد الطلب، مع تعليمات التحويل.`;
    } else if (paymentMethod === "wallet") {
      paymentNote.textContent = `هيتوفر لك رقم المحفظة (${store.info.wallet_number}) بعد تأكيد الطلب، مع تعليمات التحويل.`;
    } else {
      paymentNote.textContent = "هيتم التواصل معاك على رقم الهاتف لتأكيد الطلب قبل الشحن.";
    }
  });

  function setFieldError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const error = document.getElementById(`${fieldId}-error`);
    if (input) input.classList.toggle("invalid", Boolean(message));
    if (error) error.textContent = message || "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    const governorate = governorateField.value;
    const city = document.getElementById("customer-city").value.trim();
    const address = document.getElementById("customer-address").value.trim();
    const notes = document.getElementById("customer-notes").value.trim();

    let valid = true;
    setFieldError("customer-name", "");
    setFieldError("customer-phone", "");
    setFieldError("customer-governorate", "");
    setFieldError("customer-city", "");
    setFieldError("customer-address", "");

    if (name.length < 3) {
      setFieldError("customer-name", "اكتب الاسم بالكامل (3 أحرف على الأقل)");
      valid = false;
    }
    if (!PHONE_RE.test(phone)) {
      setFieldError("customer-phone", "رقم الهاتف غير صحيح، مثال: 01012345678");
      valid = false;
    }
    if (!governorate) {
      setFieldError("customer-governorate", "اختر المحافظة");
      valid = false;
    }
    if (city.length < 2) {
      setFieldError("customer-city", "اكتب المدينة أو المنطقة");
      valid = false;
    }
    if (address.length < 8) {
      setFieldError("customer-address", "اكتب العنوان بالتفصيل (8 أحرف على الأقل)");
      valid = false;
    }
    if (!paymentMethod) {
      toast("اختر طريقة الدفع أولًا", "error");
      valid = false;
    }

    if (!valid) {
      const firstInvalid = form.querySelector(".invalid");
      if (firstInvalid) firstInvalid.focus();
      toast("راجع البيانات المطلوبة أولًا", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = `${icon("spinner", 'class="spin"')} جارٍ تأكيد الطلب…`;
    const summarySubmit = document.getElementById("summary-submit");
    if (summarySubmit) summarySubmit.disabled = true;

    try {
      const order = await http.post("/api/orders", {
        customer_name: name,
        customer_phone: phone,
        governorate,
        city,
        address,
        notes: notes || null,
        payment_method: paymentMethod,
        items: store.cart.map((item) => ({
          product_id: item.id,
          quantity: item.qty,
          size: item.size || null,
          color: item.color || null,
        })),
      });

      sessionStorage.setItem("aseel_last_order", JSON.stringify(order));
      clearCart();
      navigate(`#/success/${encodeURIComponent(order.order_number)}`);
    } catch (error) {
      toast(error.message || "تعذر إتمام الطلب، حاول مرة أخرى", "error");
      submitButton.disabled = false;
      submitButton.innerHTML = `تأكيد الطلب ${icon("arrowLeft")}`;
      if (summarySubmit) summarySubmit.disabled = false;
    }
  });
}

/* ============================ Success ============================ */
function renderSuccess(orderNumber) {
  setTitle("تم تأكيد الطلب");

  let order = null;
  try {
    const stored = JSON.parse(sessionStorage.getItem("aseel_last_order") || "null");
    if (stored && stored.order_number === orderNumber) order = stored;
  } catch {
    order = null;
  }

  const deliveryDate = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.now() + 4 * 86400000));

  const paymentInstructions =
    order && order.payment_method === "instapay"
      ? `<div class="payment-instructions">
          <h4>${icon("creditCard")} تعليمات الدفع عبر إنستاباي</h4>
          <p>حوّل مبلغ <strong>${money(order.total)}</strong> على الحساب التالي، ثم ابعت صورة التحويل على واتساب مع رقم الطلب.</p>
          <div class="copy-row">
            <strong>${escapeHtml(store.info.instapay_handle)}</strong>
            <button type="button" class="copy-btn" data-action="copy" data-copy="${escapeHtml(
              store.info.instapay_handle
            )}">نسخ</button>
          </div>
        </div>`
      : order && order.payment_method === "wallet"
        ? `<div class="payment-instructions">
            <h4>${icon("wallet")} تعليمات الدفع عبر المحفظة</h4>
            <p>حوّل مبلغ <strong>${money(order.total)}</strong> على رقم المحفظة التالي، ثم ابعت صورة التحويل على واتساب مع رقم الطلب.</p>
            <div class="copy-row">
              <strong>${escapeHtml(store.info.wallet_number)}</strong>
              <button type="button" class="copy-btn" data-action="copy" data-copy="${escapeHtml(
                store.info.wallet_number
              )}">نسخ</button>
            </div>
          </div>`
        : "";

  app.innerHTML = `
    <section class="success-page">
      <div class="container">
        <div class="success-card fade-up">
          <div class="success-check">${icon("checkCircle")}</div>
          <h1>تم استلام طلبك بنجاح</h1>
          <p>شكرًا لثقتك في ${escapeHtml(
            storeName()
          )}. هنراجع الطلب ونتواصل معاك على الهاتف لتأكيده قبل الشحن.</p>

          <div class="order-number-box">
            <span>رقم الطلب</span>
            <strong>${escapeHtml(orderNumber)}</strong>
          </div>

          ${paymentInstructions}

          ${
            order
              ? `<div class="success-items">
                  ${(order.items || [])
                    .map(
                      (item) => `
                      <div class="success-item">
                        <img src="${escapeHtml(item.image_url || "/static/img/placeholder.svg")}" alt="${escapeHtml(
                          item.product_name
                        )}" onerror="this.src='/static/img/placeholder.svg'">
                        <div class="grow">
                          <div class="name">${escapeHtml(item.product_name)}</div>
                          <div class="meta">${[
                            item.size ? `مقاس ${item.size}` : "",
                            item.color || "",
                            `الكمية: ${item.quantity}`,
                          ]
                            .filter(Boolean)
                            .join(" • ")}</div>
                        </div>
                        <strong>${money(item.line_total)}</strong>
                      </div>`
                    )
                    .join("")}
                </div>
                <div class="summary-row total" style="border:none;padding-top:0">
                  <span>الإجمالي (شامل الشحن)</span><strong>${money(order.total)}</strong>
                </div>`
              : ""
          }

          <div class="success-actions" style="margin-top:26px">
            <a href="#/track" class="btn btn-primary">تتبع الطلب ${icon("arrowLeft")}</a>
            <a href="#/shop" class="btn btn-outline">متابعة التسوق</a>
          </div>

          <p class="success-help">التوصيل المتوقع: <strong>${deliveryDate}</strong> — هيتم تأكيد الموعد معاك هاتفيًا.<br>
          لأي استفسار تواصل معانا على واتساب واذكر رقم الطلب.</p>
        </div>
      </div>
    </section>`;
}

/* ============================ Track ============================ */
function renderTrack() {
  setTitle("تتبع طلبك");

  let lastOrder = null;
  try {
    lastOrder = JSON.parse(sessionStorage.getItem("aseel_last_order") || "null");
  } catch {
    lastOrder = null;
  }

  app.innerHTML = `
    <section class="page-head">
      <div class="container">
        <div class="breadcrumb">
          <a href="#/">الرئيسية</a> ${icon("chevronLeft")}
          <span>تتبع الطلب</span>
        </div>
        <h1>تتبع طلبك</h1>
        <p>ادخل رقم الطلب ورقم الهاتف اللي استخدمتهم وقت الشراء.</p>
      </div>
    </section>

    <div class="container track-page">
      <div class="track-card">
        <form class="track-form" id="track-form">
          <div class="field">
            <label for="track-number">رقم الطلب</label>
            <input class="input" id="track-number" placeholder="ASL-260101-1234" style="direction:ltr;text-align:right"
                   value="${lastOrder ? escapeHtml(lastOrder.order_number) : ""}">
          </div>
          <div class="field">
            <label for="track-phone">رقم الهاتف</label>
            <input class="input" id="track-phone" inputmode="tel" placeholder="01XXXXXXXXX" style="direction:ltr;text-align:right"
                   value="${lastOrder ? escapeHtml(lastOrder.customer_phone) : ""}">
          </div>
          <button type="submit" class="btn btn-primary" id="track-submit">تتبع ${icon("search")}</button>
        </form>
        <div id="track-result"></div>
      </div>
    </div>`;

  const form = document.getElementById("track-form");
  const result = document.getElementById("track-result");
  const submit = document.getElementById("track-submit");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const number = document.getElementById("track-number").value.trim();
    const phone = document.getElementById("track-phone").value.trim();

    if (!number || !phone) {
      toast("ادخل رقم الطلب ورقم الهاتف", "error");
      return;
    }

    submit.disabled = true;
    submit.innerHTML = `${icon("spinner", 'class="spin"')} جارٍ البحث…`;

    try {
      const order = await http.get(
        `/api/orders/track/${encodeURIComponent(number.toUpperCase())}?phone=${encodeURIComponent(phone)}`
      );
      result.innerHTML = trackResultHtml(order);
    } catch (error) {
      result.innerHTML = `<div class="error-banner">${icon("alert")} ${escapeHtml(
        error.message || "لم نعثر على الطلب"
      )}</div>`;
    } finally {
      submit.disabled = false;
      submit.innerHTML = `تتبع ${icon("search")}`;
    }
  });

  if (lastOrder) {
    // تعبئة تلقائية فقط، بدون بحث تلقائي
  }
}

function trackResultHtml(order) {
  const currentIndex = TRACK_STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  const steps = TRACK_STEPS.map((step, index) => {
    const meta = STATUS_META[step];
    const done = !isCancelled && index <= currentIndex;
    const current = !isCancelled && index === currentIndex;
    const descriptions = {
      pending: "استلمنا طلبك وهو قيد المراجعة.",
      confirmed: "تم تأكيد الطلب وهنبدأ التجهيز.",
      processing: "بنحضّر طلبك بعناية للتسليم.",
      shipped: "طلبك مع مندوب الشحن وفي الطريق إليك.",
      delivered: "تم تسليم الطلب. نتمنى تكون مبسوط بيه!",
    };
    return `
      <div class="timeline-step ${done ? "done" : ""} ${current ? "current" : ""}">
        <span class="timeline-dot">${done ? icon("check") : icon("clock")}</span>
        <div class="timeline-body">
          <strong>${meta?.label || step}</strong>
          <span>${descriptions[step] || ""}</span>
        </div>
      </div>`;
  }).join("");

  return `
    <div class="track-result">
      <div class="track-summary">
        <div>
          <span>رقم الطلب</span>
          <strong style="direction:ltr;display:block">${escapeHtml(order.order_number)}</strong>
        </div>
        <div>
          <span>تاريخ الطلب</span>
          <strong>${formatDate(order.created_at, false)}</strong>
        </div>
        <div>
          <span>حالة الطلب</span>
          <strong>${STATUS_META[order.status]?.label || order.status}</strong>
        </div>
        <div class="track-total">${money(order.total)}</div>
      </div>

      ${
        isCancelled
          ? `<div class="error-banner">${icon("xCircle")} تم إلغاء هذا الطلب. لو محتاج مساعدة تواصل معانا على واتساب.</div>`
          : `<div class="timeline">${steps}</div>`
      }

      <div class="track-items">
        <h4>منتجات الطلب</h4>
        ${(order.items || [])
          .map(
            (item) => `
            <div class="success-item">
              <img src="${escapeHtml(item.image_url || "/static/img/placeholder.svg")}" alt="${escapeHtml(
                item.product_name
              )}" onerror="this.src='/static/img/placeholder.svg'">
              <div class="grow">
                <div class="name">${escapeHtml(item.product_name)}</div>
                <div class="meta">${[
                  item.size ? `مقاس ${item.size}` : "",
                  item.color || "",
                  `الكمية: ${item.quantity}`,
                ]
                  .filter(Boolean)
                  .join(" • ")}</div>
              </div>
              <strong>${money(item.line_total)}</strong>
            </div>`
          )
          .join("")}
      </div>
    </div>`;
}

/* ============================ About ============================ */
function renderAbout() {
  setTitle("قصتنا");

  app.innerHTML = `
    <section class="about-page">
      <div class="container">
        <div class="about-hero">
          <div class="fade-up">
            <span class="eyebrow">قصتنا</span>
            <h1>بنختار القليل…<br>عشان يبقى <em style="font-style:normal;color:var(--brand)">${escapeHtml(
              storeName()
            )}</em></h1>
            <p>${escapeHtml(
              storeName()
            )} بدأ من فكرة بسيطة: إن الشراء أونلاين مش لازم يبقى مغامرة. كل قطعة بنعرضها بنكون شفناها ولمسناها واتأكدنا من خامتها وتفاصيلها.</p>
            <p>بنشتغل مع موردين بنثق فيهم، وبنختار قطع بتعيش معاك أكتر من موسم. عشان كده تشكيلتنا مش كبيرة — لكن كل حاجة فيها تستاهل.</p>
            <div class="hero-actions">
              <a href="#/shop" class="btn btn-primary">تسوق المجموعة ${icon("arrowLeft")}</a>
              <a href="${whatsappUrl(store.info.whatsapp_number) || "#/about"}" class="btn btn-outline">تواصل معنا</a>
            </div>
          </div>
          <div class="about-hero-image fade-up">
            <img src="/static/img/hero-rack.jpg" alt="تشكيلة ${escapeHtml(
              storeName()
            )}" loading="lazy">
          </div>
        </div>

        <div class="values-grid">
          <div class="value-card">
            <span class="trust-icon">${icon("sparkles")}</span>
            <h3>اختيار بعناية</h3>
            <p>بنرشّح كل قطعة يدويًا. لو مش مقتنعين بيها، مش هتلاقيها في المتجر.</p>
          </div>
          <div class="value-card">
            <span class="trust-icon">${icon("truck")}</span>
            <h3>شحن لكل مصر</h3>
            <p>بنوصل لكل المحافظات خلال 2–5 أيام عمل، مع متابعة لحظية لحالة الطلب.</p>
          </div>
          <div class="value-card">
            <span class="trust-icon">${icon("heart")}</span>
            <h3>خدمة بتحسها</h3>
            <p>فريقنا معاك قبل وبعد الشراء. استرجاع خلال 14 يوم وبدون تعقيد.</p>
          </div>
        </div>

        <div class="about-stats">
          <div><strong>19+</strong><span>قطعة مختارة</span></div>
          <div><strong>27</strong><span>محافظة نشحن لها</span></div>
          <div><strong>14</strong><span>يوم استرجاع</span></div>
          <div><strong>4.9</strong><span>تقييم العملاء</span></div>
        </div>
      </div>
    </section>`;
}
