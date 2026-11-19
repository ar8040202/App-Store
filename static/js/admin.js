import { http } from "./api.js";
import { icon } from "./icons.js";
import {
  store,
  initStore,
  refreshStoreInfo,
  money,
  formatDate,
  escapeHtml,
  statusLabel,
  STATUS_META,
  PAYMENT_LABELS,
  toast,
} from "./store.js";

/* ============================ State ============================ */
const TOKEN_KEY = "aseel_admin_token";
const PAGE_SIZE = 20;
const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const PAYMENT_STATUS_LABELS = {
  pending: "غير مدفوع",
  paid: "مدفوع",
  refunded: "مسترجع",
};

const VIEW_META = {
  dashboard: { title: "نظرة عامة", subtitle: "ملخص أداء المتجر" },
  orders: { title: "الطلبات", subtitle: "تابع الطلبات وحدّث حالتها" },
  products: { title: "المنتجات", subtitle: "إدارة الكتالوج والمخزون" },
  categories: { title: "الأقسام", subtitle: "تنظيم أقسام المتجر" },
  settings: { title: "الإعدادات", subtitle: "بيانات المتجر والشحن والأمان" },
};

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  admin: null,
  view: "dashboard",
  adminCategories: null,
  governorates: new Map(),
  paymentMethods: new Map(),
  paymentMethodsLoaded: false,
  orders: new Map(),
  products: new Map(),
  categories: new Map(),
  filters: {
    orders: { q: "", status: "", page: 1 },
    products: { q: "", category: "", active: "", page: 1 },
  },
};

/* ============================ Elements ============================ */
let loginScreen;
let loginForm;
let loginError;
let loginSubmit;
let appEl;
let viewEl;
let pageTitle;
let pageSubtitle;
let modal;
let modalTitle;
let modalBody;
let modalFoot;
let confirmResolve = null;
let searchTimer = null;

/* ============================ Boot ============================ */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

async function boot() {
  cacheElements();
  bindGlobalUI();

  await initStore().catch(() => {});
  applyStoreBranding();
  setTopbarDate();

  if (state.token) {
    try {
      state.admin = await http.get("/api/admin/me", { token: state.token });
      await loadAdminPayments(true).catch(() => {});
      showApp();
      return;
    } catch {
      clearToken();
    }
  }

  showLogin();
}

function cacheElements() {
  loginScreen = document.getElementById("login-screen");
  loginForm = document.getElementById("login-form");
  loginError = document.getElementById("login-error");
  loginSubmit = document.getElementById("login-submit");
  appEl = document.getElementById("admin-app");
  viewEl = document.getElementById("admin-view");
  pageTitle = document.getElementById("page-title");
  pageSubtitle = document.getElementById("page-subtitle");
  modal = document.getElementById("modal");
  modalTitle = document.getElementById("modal-title");
  modalBody = document.getElementById("modal-body");
  modalFoot = document.getElementById("modal-foot");
}

function bindGlobalUI() {
  loginForm?.addEventListener("submit", handleLogin);

  document.getElementById("password-toggle")?.addEventListener("click", () => {
    const input = document.getElementById("login-password");
    if (!input) return;
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    const button = document.getElementById("password-toggle");
    button?.setAttribute(
      "aria-label",
      reveal ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
    );
  });

  document.querySelectorAll(".side-link").forEach((link) => {
    link.addEventListener("click", () => {
      go(link.dataset.view || "dashboard");
      closeSidebar();
    });
  });

  document.getElementById("logout-btn")?.addEventListener("click", () => logout());

  document.getElementById("refresh-btn")?.addEventListener("click", () => {
    renderView();
    toast("تم تحديث البيانات");
  });

  document.getElementById("sidebar-toggle")?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  document.getElementById("sidebar-scrim")?.addEventListener("click", closeSidebar);

  document.getElementById("modal-close")?.addEventListener("click", closeModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (!modal?.hidden) closeModal();
      closeSidebar();
    }
  });

  window.addEventListener("hashchange", () => {
    if (state.token) renderView();
  });

  viewEl?.addEventListener("click", handleViewClick);
  viewEl?.addEventListener("change", handleViewChange);
}

/* ============================ API helpers ============================ */
async function apiGet(path) {
  return guard(() => http.get(path, { token: state.token }));
}

async function apiPost(path, body) {
  return guard(() => http.post(path, body, { token: state.token }));
}

async function apiPut(path, body) {
  return guard(() => http.put(path, body, { token: state.token }));
}

async function apiPatch(path, body) {
  return guard(() => http.patch(path, body, { token: state.token }));
}

async function apiDelete(path) {
  return guard(() => http.del(path, { token: state.token }));
}

async function apiUpload(path, formData) {
  return guard(() => http.upload(path, formData, { token: state.token }));
}

async function guard(call) {
  try {
    return await call();
  } catch (error) {
    if (error?.status === 401) expireSession();
    throw error;
  }
}

function clearToken() {
  state.token = "";
  localStorage.removeItem(TOKEN_KEY);
}

function expireSession() {
  if (!state.token) return;
  clearToken();
  state.admin = null;
  showLogin("انتهت صلاحية الجلسة، سجّل الدخول من جديد");
  toast("انتهت الجلسة، سجّل الدخول مرة أخرى", "error");
}

/* ============================ Auth ============================ */
async function handleLogin(event) {
  event.preventDefault();
  hideLoginError();

  const username = document.getElementById("login-username")?.value.trim() || "";
  const password = document.getElementById("login-password")?.value || "";

  if (!username || !password) {
    showLoginError("اكتب اسم المستخدم وكلمة المرور");
    return;
  }

  setBusy(loginSubmit, true, "جارٍ الدخول...");

  try {
    const data = await http.post("/api/admin/login", { username, password });
    state.token = data.access_token;
    state.admin = {
      username: data.username,
      display_name: data.display_name || data.username,
    };
    localStorage.setItem(TOKEN_KEY, state.token);
    loginForm.reset();
    await loadAdminPayments(true).catch(() => {});
    showApp();
    toast(`أهلًا بيك، ${state.admin.display_name}`);
  } catch (error) {
    showLoginError(error.message || "تعذر تسجيل الدخول");
    setBusy(loginSubmit, false);
  }
}

function applyStoreBranding() {
  const name = store.info.name || "أصيل";
  const nameEn = store.info.name_en || "ASEEL";

  document.querySelectorAll("[data-store-name]").forEach((element) => {
    element.textContent = name;
  });
  document.querySelectorAll("[data-store-name-en]").forEach((element) => {
    element.textContent = nameEn;
  });
  document.querySelectorAll("[data-store-alt]").forEach((element) => {
    element.setAttribute("alt", `متجر ${name}`);
  });

  if (appEl && !appEl.hidden) {
    const meta = VIEW_META[currentView()] || VIEW_META.dashboard;
    document.title = `${meta.title} | لوحة ${name}`;
  }
}

function showLogin(message = "") {
  closeModal();
  if (loginScreen) loginScreen.hidden = false;
  if (appEl) appEl.hidden = true;
  document.body.classList.remove("no-scroll", "sidebar-open");
  document.title = `تسجيل الدخول | لوحة ${store.info.name || "أصيل"}`;
  if (message) showLoginError(message);
  else hideLoginError();
  const password = document.getElementById("login-password");
  if (password) password.value = "";
  setBusy(loginSubmit, false);
}

function showApp() {
  if (loginScreen) loginScreen.hidden = true;
  if (appEl) appEl.hidden = false;
  applyStoreBranding();

  const name = state.admin?.display_name || state.admin?.username || "مدير المتجر";
  const userName = document.getElementById("side-user-name");
  const avatar = document.getElementById("side-avatar");
  if (userName) userName.textContent = name;
  if (avatar) avatar.textContent = name.trim().charAt(0) || "م";

  const validViews = Object.keys(VIEW_META);
  const hashView = (window.location.hash || "").replace(/^#\/?/, "").split("?")[0];
  if (!validViews.includes(hashView)) {
    history.replaceState(null, "", "#/dashboard");
  }
  renderView();

  apiGet("/api/admin/stats")
    .then((stats) => updatePendingCount(stats.orders_pending))
    .catch(() => {});
}

function logout(quiet = false) {
  closeModal();
  clearToken();
  state.admin = null;
  showLogin();
  if (!quiet) toast("تم تسجيل الخروج");
}

function showLoginError(message) {
  if (!loginError) return;
  loginError.textContent = message;
  loginError.hidden = false;
}

function hideLoginError() {
  if (!loginError) return;
  loginError.hidden = true;
  loginError.textContent = "";
}

/* ============================ Routing ============================ */
function go(view) {
  if (!VIEW_META[view]) view = "dashboard";
  const target = `#/${view}`;
  if (window.location.hash === target) renderView();
  else window.location.hash = target;
}

function currentView() {
  const raw = (window.location.hash || "").replace(/^#\/?/, "").split("?")[0];
  return VIEW_META[raw] ? raw : "dashboard";
}

async function renderView() {
  if (!state.token) return;

  const view = currentView();
  state.view = view;
  updateNav(view);
  closeSidebar();

  const meta = VIEW_META[view];
  if (pageTitle) pageTitle.textContent = meta.title;
  if (pageSubtitle) pageSubtitle.textContent = meta.subtitle;
  document.title = `${meta.title} | لوحة ${store.info.name || "أصيل"}`;

  viewEl.innerHTML = loadingBlock();
  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    await VIEWS[view]();
  } catch (error) {
    if (error?.status === 401) return;
    viewEl.innerHTML = errorBlock(error.message || "تعذر تحميل البيانات");
  }
}

function updateNav(view) {
  document.querySelectorAll(".side-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.view === view);
  });
}

function closeSidebar() {
  document.body.classList.remove("sidebar-open");
}

/* ============================ Dashboard ============================ */
async function dashboardView() {
  const stats = await apiGet("/api/admin/stats");
  updatePendingCount(stats.orders_pending);
  state.orders = new Map(stats.recent_orders.map((order) => [order.id, order]));

  const chartMax = Math.max(
    ...stats.sales_last_7_days.map((point) => Number(point.revenue) || 0),
    1
  );
  const weekRevenue = stats.sales_last_7_days.reduce(
    (total, point) => total + (Number(point.revenue) || 0),
    0
  );

  const chart = stats.sales_last_7_days
    .map((point) => {
      const height = Math.max(
        3,
        Math.round(((Number(point.revenue) || 0) / chartMax) * 100)
      );
      const day = new Intl.DateTimeFormat("ar-EG", { weekday: "short" }).format(
        new Date(`${point.date}T00:00:00`)
      );
      return `
        <div class="bar-col" title="${escapeHtml(point.date)} — ${money(point.revenue)}">
          <strong>${point.orders}</strong>
          <div class="bar-track"><div class="bar-fill" style="height:${height}%"></div></div>
          <span>${escapeHtml(day)}</span>
        </div>`;
    })
    .join("");

  const recentOrders = stats.recent_orders.length
    ? `<div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>الطلب</th>
              <th>العميل</th>
              <th>الإجمالي</th>
              <th>طريقة الدفع</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${stats.recent_orders.map(orderRow).join("")}
          </tbody>
        </table>
      </div>`
    : `<div class="table-empty">لا توجد طلبات بعد</div>`;

  const topProducts = stats.top_products.length
    ? `<div class="top-list">
        ${stats.top_products
          .map(
            (product) => `
          <div class="top-item">
            <img src="${escapeHtml(product.image_url || "/static/img/placeholder.svg")}"
                 alt="" loading="lazy" onerror="this.src='/static/img/placeholder.svg'">
            <div class="grow">
              <div class="name">${escapeHtml(product.name)}</div>
              <div class="meta">${product.quantity} قطعة مباعة</div>
            </div>
            <span class="revenue">${money(product.revenue)}</span>
          </div>`
          )
          .join("")}
      </div>`
    : `<div class="table-empty">لا توجد مبيعات كافية بعد</div>`;

  const lowStock = stats.low_stock_products.length
    ? stats.low_stock_products
        .map(
          (product) => `
        <div class="low-item">
          <img src="${escapeHtml(product.image_url || "/static/img/placeholder.svg")}"
               alt="" loading="lazy" onerror="this.src='/static/img/placeholder.svg'">
          <span class="grow">${escapeHtml(product.name)}</span>
          <span class="low-qty">${product.stock} متبقي</span>
        </div>`
        )
        .join("")
    : `<div class="table-empty">كل المنتجات بمخزون جيد</div>`;

  viewEl.innerHTML = `
    <div class="stat-grid">
      ${statCard({
        label: "إجمالي المبيعات",
        value: money(stats.revenue),
        sub: `من ${stats.orders_total} طلب`,
        iconName: "chart",
        gold: true,
      })}
      ${statCard({
        label: "طلبات اليوم",
        value: String(stats.orders_today),
        sub: `${stats.orders_pending} طلب قيد المراجعة`,
        iconName: "package",
      })}
      ${statCard({
        label: "متوسط قيمة الطلب",
        value: money(stats.avg_order_value),
        sub: `${stats.customers_total} عميل مختلف`,
        iconName: "users",
      })}
      ${statCard({
        label: "المنتجات المتاحة",
        value: String(stats.products_total),
        sub: stats.products_low_stock
          ? `${stats.products_low_stock} منتج مخزونه منخفض`
          : "المخزون في وضع جيد",
        iconName: "box",
      })}
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-head">
          <div>
            <h3>المبيعات آخر 7 أيام</h3>
            <p>إجمالي ${money(weekRevenue)} خلال الأسبوع</p>
          </div>
          <button type="button" data-action="go-orders">عرض الطلبات ${icon("arrowLeft")}</button>
        </div>
        <div class="card-body"><div class="bars">${chart}</div></div>
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <h3>الأكثر مبيعًا</h3>
            <p>أفضل 5 منتجات</p>
          </div>
        </div>
        <div class="card-body">${topProducts}</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="card-head">
          <div>
            <h3>أحدث الطلبات</h3>
            <p>آخر 6 طلبات واردة</p>
          </div>
          <button type="button" data-action="go-orders">كل الطلبات ${icon("arrowLeft")}</button>
        </div>
        ${recentOrders}
      </div>

      <div class="card">
        <div class="card-head">
          <div>
            <h3>مخزون منخفض</h3>
            <p>منتجات تحتاج إعادة تعبئة</p>
          </div>
          <button type="button" data-action="go-products">المنتجات ${icon("arrowLeft")}</button>
        </div>
        <div class="card-body">${lowStock}</div>
      </div>
    </div>`;
}

function statCard({ label, value, sub, iconName, gold = false }) {
  return `
    <div class="stat-card">
      <div class="stat-top">
        <span class="stat-label">${escapeHtml(label)}</span>
        <span class="stat-icon${gold ? " gold" : ""}">${icon(iconName)}</span>
      </div>
      <div class="stat-value">${value}</div>
      <div class="stat-sub">${escapeHtml(sub)}</div>
    </div>`;
}

function updatePendingCount(count) {
  const element = document.getElementById("pending-count");
  if (!element) return;
  const value = Math.max(0, Number(count) || 0);
  element.textContent = String(value);
  element.hidden = value === 0;
}

function adjustPendingCount(delta) {
  const element = document.getElementById("pending-count");
  if (!element) return;
  const current = Number(element.textContent) || 0;
  updatePendingCount(current + delta);
}

/* ============================ Orders ============================ */
async function ordersView() {
  const filters = state.filters.orders;

  viewEl.innerHTML = `
    <div class="table-card">
      <div class="table-toolbar">
        <div class="toolbar-title">كل الطلبات <span id="orders-count"></span></div>
        <div class="toolbar-actions">
          <div class="admin-search">
            ${icon("search")}
            <input id="orders-search" type="search" placeholder="ابحث برقم الطلب أو الاسم أو الهاتف"
                   value="${escapeHtml(filters.q)}" autocomplete="off">
          </div>
          <button type="button" class="btn btn-outline btn-sm" data-action="refresh-orders">
            ${icon("refresh")} تحديث
          </button>
        </div>
      </div>
      <div class="admin-tabs" id="order-tabs">
        <button type="button" class="admin-tab${filters.status ? "" : " active"}" data-status="">
          الكل
        </button>
        ${ORDER_STATUSES.map(
          (status) => `
          <button type="button" class="admin-tab${filters.status === status ? " active" : ""}"
                  data-status="${status}">${escapeHtml(statusLabel(status))}</button>`
        ).join("")}
      </div>
      <div id="orders-body">${loadingBlock()}</div>
    </div>`;

  const search = document.getElementById("orders-search");
  search?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.filters.orders.q = search.value.trim();
      state.filters.orders.page = 1;
      loadOrders();
    }, 350);
  });

  document.getElementById("order-tabs")?.addEventListener("click", (event) => {
    const tab = event.target.closest("[data-status]");
    if (!tab) return;
    state.filters.orders.status = tab.dataset.status || "";
    state.filters.orders.page = 1;
    document.querySelectorAll("#order-tabs .admin-tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
    });
    loadOrders();
  });

  await loadOrders();
}

async function loadOrders() {
  const body = document.getElementById("orders-body");
  if (!body) return;

  const filters = state.filters.orders;
  const params = new URLSearchParams({
    page: String(filters.page),
    page_size: String(PAGE_SIZE),
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);

  body.innerHTML = loadingBlock("جارٍ تحميل الطلبات...");

  try {
    const data = await apiGet(`/api/admin/orders?${params.toString()}`);
    state.orders = new Map(data.items.map((order) => [order.id, order]));

    const count = document.getElementById("orders-count");
    if (count) count.textContent = `${data.total} طلب`;

    if (!data.items.length) {
      body.innerHTML = `<div class="table-empty">لا توجد طلبات مطابقة للبحث</div>`;
      return;
    }

    body.innerHTML = `
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>العميل</th>
              <th>الإجمالي</th>
              <th>طريقة الدفع</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${data.items.map(orderRow).join("")}</tbody>
        </table>
      </div>
      ${paginationMarkup(data, "orders")}`;
  } catch (error) {
    if (error?.status === 401) return;
    body.innerHTML = errorBlock(error.message || "تعذر تحميل الطلبات");
  }
}

function orderRow(order) {
  const itemsCount = order.items?.length || 0;
  return `
    <tr>
      <td>
        <span class="cell-strong">${escapeHtml(order.order_number)}</span>
        <div class="cell-muted">${itemsCount} منتج</div>
      </td>
      <td>
        <div class="cell-strong">${escapeHtml(order.customer_name)}</div>
        <div class="cell-phone">${escapeHtml(order.customer_phone)}</div>
      </td>
      <td><span class="cell-strong">${money(order.total)}</span></td>
      <td><span class="cell-muted">${escapeHtml(
        paymentLabel(order.payment_method)
      )}</span></td>
      <td>${statusSelect(order)}</td>
      <td><span class="cell-muted">${formatDate(order.created_at)}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" class="row-action" data-action="view-order"
                  data-id="${order.id}" title="تفاصيل الطلب" aria-label="تفاصيل الطلب">
            ${icon("eye")}
          </button>
        </div>
      </td>
    </tr>`;
}

function statusSelect(order) {
  const meta = STATUS_META[order.status] || {
    color: "#7b7468",
    bg: "#f1ece3",
  };
  return `
    <select class="status-select" data-order-status="${order.id}"
            style="background-color:${meta.bg};color:${meta.color}"
            aria-label="حالة الطلب ${escapeHtml(order.order_number)}">
      ${ORDER_STATUSES.map(
        (status) =>
          `<option value="${status}"${order.status === status ? " selected" : ""}>${escapeHtml(
            statusLabel(status)
          )}</option>`
      ).join("")}
    </select>`;
}

async function changeOrderStatus(select) {
  const id = Number(select.dataset.orderStatus);
  const next = select.value;
  const order = state.orders.get(id);
  const previous = order?.status || "pending";

  if (next === previous) return;

  if (next === "cancelled") {
    const confirmed = await confirmAction({
      title: "إلغاء الطلب",
      message: `هل أنت متأكد من إلغاء الطلب <b>${escapeHtml(
        order?.order_number || `#${id}`
      )}</b>؟ لا يمكن التراجع عن هذه الخطوة.`,
      confirmLabel: "نعم، إلغاء الطلب",
    });
    if (!confirmed) {
      select.value = previous;
      return;
    }
  }

  select.disabled = true;
  try {
    const updated = await apiPatch(`/api/admin/orders/${id}/status`, {
      status: next,
    });
    if (order) Object.assign(order, updated);
    else state.orders.set(id, updated);

    const meta = STATUS_META[updated.status] || { color: "#7b7468", bg: "#f1ece3" };
    select.style.backgroundColor = meta.bg;
    select.style.color = meta.color;

    if (previous === "pending" && updated.status !== "pending") {
      adjustPendingCount(-1);
    } else if (previous !== "pending" && updated.status === "pending") {
      adjustPendingCount(1);
    }

    toast(`تم تحديث حالة الطلب إلى «${statusLabel(updated.status)}»`);
  } catch (error) {
    select.value = previous;
    toast(error.message || "تعذر تحديث حالة الطلب", "error");
  } finally {
    select.disabled = false;
  }
}

async function openOrderModal(id) {
  openModal({
    title: "تفاصيل الطلب",
    body: loadingBlock("جارٍ تحميل تفاصيل الطلب..."),
    footer: "",
    wide: true,
  });

  let order;
  try {
    order = await apiGet(`/api/admin/orders/${id}`);
  } catch (error) {
    modalBody.innerHTML = `
      <div class="table-empty">
        <p style="color:var(--danger)">${escapeHtml(
          error.message || "تعذر تحميل الطلب"
        )}</p>
      </div>`;
    modalFoot.innerHTML = `<button type="button" class="btn btn-outline btn-sm" data-modal-close>إغلاق</button>`;
    modalFoot.querySelector("[data-modal-close]")?.addEventListener("click", closeModal);
    return;
  }

  if (!order) return;

  modalTitle.textContent = `تفاصيل الطلب ${order.order_number}`;
  modalBody.innerHTML = orderDetailMarkup(order);
  modalFoot.innerHTML = `
    <div class="modal-foot-filters">
      <select class="select" id="modal-order-status" aria-label="حالة الطلب">
        ${ORDER_STATUSES.map(
          (status) =>
            `<option value="${status}"${order.status === status ? " selected" : ""}>${escapeHtml(
              statusLabel(status)
            )}</option>`
        ).join("")}
      </select>
      <select class="select" id="modal-payment-status" aria-label="حالة الدفع">
        ${Object.entries(PAYMENT_STATUS_LABELS)
          .map(
            ([value, label]) =>
              `<option value="${value}"${
                order.payment_status === value ? " selected" : ""
              }>${escapeHtml(label)}</option>`
          )
          .join("")}
      </select>
    </div>
    <button type="button" class="btn btn-outline btn-sm" data-modal-close>إغلاق</button>
    <button type="button" class="btn btn-primary btn-sm" id="save-order">
      ${icon("check")} حفظ التغييرات
    </button>`;

  modalFoot.querySelector("[data-modal-close]")?.addEventListener("click", closeModal);

  const saveButton = document.getElementById("save-order");
  saveButton?.addEventListener("click", async () => {
    const nextStatus = document.getElementById("modal-order-status")?.value;
    const nextPayment = document.getElementById("modal-payment-status")?.value;
    const payload = {};
    if (nextStatus && nextStatus !== order.status) payload.status = nextStatus;
    if (nextPayment && nextPayment !== order.payment_status) {
      payload.payment_status = nextPayment;
    }

    if (!Object.keys(payload).length) {
      closeModal();
      return;
    }

    setBusy(saveButton, true, "جارٍ الحفظ...");
    try {
      const updated = await apiPatch(`/api/admin/orders/${order.id}/status`, payload);

      const pendingDelta =
        order.status === "pending" && updated.status !== "pending"
          ? -1
          : order.status !== "pending" && updated.status === "pending"
            ? 1
            : 0;
      if (pendingDelta) adjustPendingCount(pendingDelta);

      closeModal();
      toast("تم تحديث الطلب بنجاح");
      if (state.view === "orders") loadOrders();
      else renderView();
    } catch (error) {
      toast(error.message || "تعذر تحديث الطلب", "error");
      setBusy(saveButton, false);
    }
  });
}

function orderDetailMarkup(order) {
  const items = (order.items || [])
    .map(
      (item) => `
      <div class="detail-item">
        <img src="${escapeHtml(item.image_url || "/static/img/placeholder.svg")}"
             alt="" loading="lazy" onerror="this.src='/static/img/placeholder.svg'">
        <div class="grow">
          <div class="cell-strong">${escapeHtml(item.product_name)}</div>
          <div class="meta">
            ${[item.size, item.color].filter(Boolean).map(escapeHtml).join(" • ") || "—"}
            &nbsp;×&nbsp; ${item.quantity}
          </div>
        </div>
        <strong>${money(item.line_total)}</strong>
      </div>`
    )
    .join("");

  return `
    <div class="order-detail-grid">
      <div class="detail-box">
        <span>العميل</span>
        <strong>${escapeHtml(order.customer_name)}</strong>
      </div>
      <div class="detail-box">
        <span>الهاتف</span>
        <strong class="ltr">${escapeHtml(order.customer_phone)}</strong>
      </div>
      <div class="detail-box">
        <span>المحافظة / المدينة</span>
        <strong>${escapeHtml(order.governorate)} — ${escapeHtml(order.city)}</strong>
      </div>
      <div class="detail-box">
        <span>طريقة الدفع</span>
        <strong>${escapeHtml(paymentLabel(order.payment_method))}</strong>
      </div>
      <div class="detail-box full">
        <span>العنوان</span>
        <strong>${escapeHtml(order.address)}</strong>
      </div>
      ${
        order.notes
          ? `<div class="detail-box full"><span>ملاحظات العميل</span><strong>${escapeHtml(
              order.notes
            )}</strong></div>`
          : ""
      }
      <div class="detail-box">
        <span>حالة الدفع</span>
        <strong>${escapeHtml(PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status)}</strong>
      </div>
      <div class="detail-box">
        <span>تاريخ الطلب</span>
        <strong>${formatDate(order.created_at)}</strong>
      </div>
    </div>

    <div class="detail-items">${items || `<div class="table-empty">لا توجد منتجات</div>`}</div>

    <div class="detail-totals">
      <div class="detail-total-row"><span>المجموع الفرعي</span><span>${money(
        order.subtotal
      )}</span></div>
      <div class="detail-total-row"><span>الشحن</span><span>${
        Number(order.shipping_fee) === 0 ? "مجاني" : money(order.shipping_fee)
      }</span></div>
      <div class="detail-total-row total"><span>الإجمالي</span><span>${money(
        order.total
      )}</span></div>
    </div>`;
}

/* ============================ Products ============================ */
async function productsView() {
  const categories = await loadAdminCategories();
  const filters = state.filters.products;

  const categoryOptions = categories
    .map(
      (category) =>
        `<option value="${category.id}"${
          String(filters.category) === String(category.id) ? " selected" : ""
        }>${escapeHtml(category.name)}</option>`
    )
    .join("");

  viewEl.innerHTML = `
    <div class="table-card">
      <div class="table-toolbar">
        <div class="toolbar-title">المنتجات <span id="products-count"></span></div>
        <div class="toolbar-actions">
          <div class="admin-search">
            ${icon("search")}
            <input id="products-search" type="search" placeholder="ابحث باسم المنتج"
                   value="${escapeHtml(filters.q)}" autocomplete="off">
          </div>
          <select class="select admin-filter" id="products-category" aria-label="القسم">
            <option value="">كل الأقسام</option>
            ${categoryOptions}
          </select>
          <select class="select admin-filter" id="products-active" aria-label="حالة المنتج">
            <option value=""${filters.active === "" ? " selected" : ""}>كل الحالات</option>
            <option value="true"${filters.active === "true" ? " selected" : ""}>متاح في المتجر</option>
            <option value="false"${filters.active === "false" ? " selected" : ""}>مخفي</option>
          </select>
          <button type="button" class="btn btn-primary btn-sm" data-action="add-product">
            ${icon("plus")} منتج جديد
          </button>
        </div>
      </div>
      <div id="products-body">${loadingBlock()}</div>
    </div>`;

  const search = document.getElementById("products-search");
  search?.addEventListener("input", () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      state.filters.products.q = search.value.trim();
      state.filters.products.page = 1;
      loadProducts();
    }, 350);
  });

  document.getElementById("products-category")?.addEventListener("change", (event) => {
    state.filters.products.category = event.target.value;
    state.filters.products.page = 1;
    loadProducts();
  });

  document.getElementById("products-active")?.addEventListener("change", (event) => {
    state.filters.products.active = event.target.value;
    state.filters.products.page = 1;
    loadProducts();
  });

  await loadProducts();
}

async function loadProducts() {
  const body = document.getElementById("products-body");
  if (!body) return;

  const filters = state.filters.products;
  const params = new URLSearchParams({
    page: String(filters.page),
    page_size: String(PAGE_SIZE),
  });
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category_id", filters.category);
  if (filters.active !== "") params.set("active", filters.active);

  body.innerHTML = loadingBlock("جارٍ تحميل المنتجات...");

  try {
    const data = await apiGet(`/api/admin/products?${params.toString()}`);
    state.products = new Map(data.items.map((product) => [product.id, product]));

    const count = document.getElementById("products-count");
    if (count) count.textContent = `${data.total} منتج`;

    if (!data.items.length) {
      body.innerHTML = `<div class="table-empty">لا توجد منتجات مطابقة</div>`;
      return;
    }

    body.innerHTML = `
      <div class="table-scroll">
        <table class="admin-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>القسم</th>
              <th>السعر</th>
              <th>المخزون</th>
              <th>الحالة</th>
              <th>مميز</th>
              <th></th>
            </tr>
          </thead>
          <tbody>${data.items.map(productRow).join("")}</tbody>
        </table>
      </div>
      ${paginationMarkup(data, "products")}`;
  } catch (error) {
    if (error?.status === 401) return;
    body.innerHTML = errorBlock(error.message || "تعذر تحميل المنتجات");
  }
}

function productRow(product) {
  const stock = Number(product.stock) || 0;
  const stockMarkup =
    stock <= 0
      ? `<span class="mini-badge off">نفد المخزون</span>`
      : stock <= 5
        ? `<span class="mini-badge off">${stock} فقط</span>`
        : `<span class="cell-strong">${stock}</span>`;

  const compare = Number(product.compare_at_price) || 0;
  const compareMarkup =
    compare > Number(product.price)
      ? `<div class="cell-muted price-old">${money(compare)}</div>`
      : "";

  return `
    <tr>
      <td>
        <div class="cell-product">
          <img src="${escapeHtml(product.image_url || "/static/img/placeholder.svg")}"
               alt="" loading="lazy" onerror="this.src='/static/img/placeholder.svg'">
          <div>
            <div class="name">${escapeHtml(product.name)}</div>
            <div class="sub">${escapeHtml(product.slug)}</div>
          </div>
        </div>
      </td>
      <td><span class="cell-muted">${escapeHtml(product.category?.name || "بدون قسم")}</span></td>
      <td>
        <span class="cell-strong">${money(product.price)}</span>
        ${compareMarkup}
      </td>
      <td>${stockMarkup}</td>
      <td>
        <button type="button" class="switch${product.is_active ? " on" : ""}"
                data-action="toggle-product" data-id="${product.id}"
                title="${product.is_active ? "إخفاء من المتجر" : "إظهار في المتجر"}"
                aria-label="تبديل حالة المنتج"></button>
      </td>
      <td>
        ${
          product.is_featured
            ? `<span class="mini-badge on">مميز</span>`
            : `<span class="cell-muted">—</span>`
        }
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="row-action" data-action="edit-product"
                  data-id="${product.id}" title="تعديل" aria-label="تعديل المنتج">
            ${icon("edit")}
          </button>
          <button type="button" class="row-action danger" data-action="delete-product"
                  data-id="${product.id}" title="حذف" aria-label="حذف المنتج">
            ${icon("trash")}
          </button>
        </div>
      </td>
    </tr>`;
}

async function openProductModal(product = null) {
  const categories = await loadAdminCategories();
  const value = product || {
    name: "",
    description: "",
    details: "",
    price: "",
    compare_at_price: "",
    stock: 0,
    image_url: "",
    sizes: [],
    colors: [],
    category_id: "",
    is_active: true,
    is_featured: false,
    rating: 4.8,
    reviews_count: 0,
  };

  const categoryOptions = categories
    .map(
      (category) =>
        `<option value="${category.id}"${
          String(value.category_id) === String(category.id) ? " selected" : ""
        }>${escapeHtml(category.name)}</option>`
    )
    .join("");

  const colorsValue = (value.colors || [])
    .map((color) => `${color.name}:${color.hex}`)
    .join(", ");

  openModal({
    title: product ? "تعديل المنتج" : "منتج جديد",
    body: `
      <form id="product-form" class="admin-form-grid" novalidate>
        <div class="field full">
          <label for="p-name">اسم المنتج <span>*</span></label>
          <input class="input" id="p-name" name="name" required maxlength="180"
                 value="${escapeHtml(value.name)}" placeholder="مثال: قميص كتان بقصة مريحة">
        </div>

        <div class="field">
          <label for="p-category">القسم</label>
          <select class="select" id="p-category" name="category_id">
            <option value="">بدون قسم</option>
            ${categoryOptions}
          </select>
        </div>

        <div class="field">
          <label for="p-stock">المخزون</label>
          <input class="input" id="p-stock" name="stock" type="number" min="0" step="1"
                 value="${escapeHtml(value.stock)}">
        </div>

        <div class="field">
          <label for="p-price">السعر (${escapeHtml(store.info.currency || "ج.م")}) <span>*</span></label>
          <input class="input" id="p-price" name="price" type="number" min="0.01" step="0.01"
                 required value="${escapeHtml(value.price)}">
        </div>

        <div class="field">
          <label for="p-compare">السعر قبل الخصم</label>
          <input class="input" id="p-compare" name="compare_at_price" type="number"
                 min="0.01" step="0.01" value="${escapeHtml(value.compare_at_price ?? "")}"
                 placeholder="اتركه فارغًا لو لا يوجد خصم">
        </div>

        <div class="field">
          <label for="p-rating">التقييم (0 - 5)</label>
          <input class="input" id="p-rating" name="rating" type="number"
                 min="0" max="5" step="0.1" value="${escapeHtml(value.rating ?? 4.8)}">
        </div>

        <div class="field">
          <label for="p-reviews">عدد التقييمات</label>
          <input class="input" id="p-reviews" name="reviews_count" type="number"
                 min="0" step="1" value="${escapeHtml(value.reviews_count ?? 0)}">
        </div>

        <div class="field full">
          <label>صورة المنتج</label>
          <div class="image-field">
            <div class="image-preview" id="p-preview">
              ${
                value.image_url
                  ? `<img src="${escapeHtml(value.image_url)}" alt=""
                          onerror="this.parentElement.innerHTML='<span>لا توجد صورة</span>'">`
                  : `<span>لا توجد صورة</span>`
              }
            </div>
            <div>
              <input class="input" id="p-image" name="image_url"
                     value="${escapeHtml(value.image_url || "")}"
                     placeholder="/static/img/product.jpg">
              <div class="upload-row">
                <label class="file-btn" for="p-file">
                  ${icon("upload")} رفع صورة
                </label>
                <input type="file" id="p-file" accept="image/jpeg,image/png,image/webp">
                <button type="button" class="file-btn" id="p-clear-image">
                  ${icon("close")} إزالة
                </button>
              </div>
              <p class="field-hint">JPG أو PNG أو WEBP، بحد أقصى 8 ميجابايت.</p>
            </div>
          </div>
        </div>

        <div class="field full">
          <label for="p-description">الوصف</label>
          <textarea class="textarea" id="p-description" name="description" rows="3"
                    placeholder="وصف قصير يظهر في صفحة المنتج">${escapeHtml(
                      value.description || ""
                    )}</textarea>
        </div>

        <div class="field full">
          <label for="p-details">التفاصيل</label>
          <textarea class="textarea" id="p-details" name="details" rows="4"
                    placeholder="الخامة، القصة، العناية...">${escapeHtml(
                      value.details || ""
                    )}</textarea>
        </div>

        <div class="field">
          <label for="p-sizes">المقاسات</label>
          <input class="input" id="p-sizes" name="sizes"
                 value="${escapeHtml((value.sizes || []).join(", "))}" placeholder="S, M, L, XL">
          <p class="field-hint">افصل بين المقاسات بفاصلة.</p>
        </div>

        <div class="field">
          <label for="p-colors">الألوان</label>
          <input class="input" id="p-colors" name="colors"
                 value="${escapeHtml(colorsValue)}" placeholder="أسود:#1B1B1B, بيج:#D9C7B2">
          <p class="field-hint">الصيغة: الاسم:كود اللون.</p>
        </div>

        <div class="field full">
          <div class="check-row">
            <label class="check-item">
              <input type="checkbox" name="is_active"${value.is_active ? " checked" : ""}>
              متاح في المتجر
            </label>
            <label class="check-item">
              <input type="checkbox" name="is_featured"${value.is_featured ? " checked" : ""}>
              منتج مميز
            </label>
          </div>
        </div>
      </form>`,
    footer: `
      <button type="button" class="btn btn-outline btn-sm" data-modal-close>إلغاء</button>
      <button type="submit" form="product-form" class="btn btn-primary btn-sm" id="product-save">
        ${icon("check")} حفظ المنتج
      </button>`,
    wide: true,
  });

  bindImageUpload({
    inputId: "p-image",
    fileId: "p-file",
    previewId: "p-preview",
    clearId: "p-clear-image",
  });

  document
    .getElementById("product-form")
    ?.addEventListener("submit", (event) => saveProduct(event, product));
}

async function saveProduct(event, product) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);

  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price"));
  const compare = Number(formData.get("compare_at_price"));
  const stock = Number(formData.get("stock"));
  const rating = Number(formData.get("rating"));
  const reviews = Number(formData.get("reviews_count"));
  const categoryId = formData.get("category_id");

  if (name.length < 2) {
    toast("اسم المنتج قصير جدًا", "error");
    return;
  }
  if (!Number.isFinite(price) || price <= 0) {
    toast("اكتب سعرًا صحيحًا للمنتج", "error");
    return;
  }

  const payload = {
    name,
    description: String(formData.get("description") || "").trim() || null,
    details: String(formData.get("details") || "").trim() || null,
    price,
    compare_at_price:
      Number.isFinite(compare) && compare > 0 ? compare : null,
    stock: Number.isFinite(stock) && stock >= 0 ? stock : 0,
    image_url: String(formData.get("image_url") || "").trim() || null,
    sizes: parseList(formData.get("sizes")),
    colors: parseColors(formData.get("colors")),
    category_id: categoryId ? Number(categoryId) : null,
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
    rating: Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : 4.8,
    reviews_count: Number.isFinite(reviews) && reviews >= 0 ? reviews : 0,
  };

  if (!product) payload.gallery = [];

  const saveButton = document.getElementById("product-save");
  setBusy(saveButton, true, "جارٍ الحفظ...");

  try {
    if (product) await apiPut(`/api/admin/products/${product.id}`, payload);
    else await apiPost("/api/admin/products", payload);

    closeModal();
    toast(product ? "تم تحديث المنتج بنجاح" : "تمت إضافة المنتج بنجاح");
    loadProducts();
  } catch (error) {
    toast(error.message || "تعذر حفظ المنتج", "error");
    setBusy(saveButton, false);
  }
}

async function toggleProduct(id) {
  try {
    const result = await apiPatch(`/api/admin/products/${id}/toggle`);
    toast(result.message || "تم تحديث حالة المنتج");
    loadProducts();
  } catch (error) {
    toast(error.message || "تعذر تحديث حالة المنتج", "error");
  }
}

async function deleteProduct(product) {
  const confirmed = await confirmAction({
    title: "حذف المنتج",
    message: `هل تريد حذف <b>${escapeHtml(
      product.name
    )}</b>؟ لو كان مرتبطًا بطلبات سابقة سيتم أرشفته بدلًا من حذفه.`,
    confirmLabel: "نعم، احذف المنتج",
  });
  if (!confirmed) return;

  try {
    const result = await apiDelete(`/api/admin/products/${product.id}`);
    toast(result.message || "تم حذف المنتج");
    loadProducts();
  } catch (error) {
    toast(error.message || "تعذر حذف المنتج", "error");
  }
}

/* ============================ Categories ============================ */
async function categoriesView() {
  const categories = await loadAdminCategories(true);
  state.categories = new Map(categories.map((category) => [category.id, category]));

  viewEl.innerHTML = `
    <div class="table-toolbar admin-toolbar-card">
      <div class="toolbar-title">أقسام المتجر <span>${categories.length} قسم</span></div>
      <button type="button" class="btn btn-primary btn-sm" data-action="add-category">
        ${icon("plus")} قسم جديد
      </button>
    </div>

    ${
      categories.length
        ? `<div class="cat-admin-grid">${categories.map(categoryCard).join("")}</div>`
        : `<div class="table-card"><div class="table-empty">لا توجد أقسام بعد، ابدأ بإضافة قسم جديد</div></div>`
    }`;
}

function categoryCard(category) {
  return `
    <div class="cat-admin-card">
      <div class="cat-admin-media">
        <img src="${escapeHtml(category.image_url || "/static/img/placeholder.svg")}"
             alt="" loading="lazy" onerror="this.src='/static/img/placeholder.svg'">
        <span class="cat-order">ترتيب ${category.sort_order}</span>
      </div>
      <div class="cat-admin-body">
        <h3>
          ${escapeHtml(category.name)}
          <span class="mini-badge ${category.is_active ? "on" : "off"}">${
            category.is_active ? "ظاهر" : "مخفي"
          }</span>
        </h3>
        <div class="slug">${escapeHtml(category.slug)}</div>
        <p>${escapeHtml(category.description || "بدون وصف")}</p>
        <div class="cat-admin-foot">
          <span class="cell-muted">${category.id} #</span>
          <div class="row-actions">
            <button type="button" class="row-action" data-action="edit-category"
                    data-id="${category.id}" title="تعديل" aria-label="تعديل القسم">
              ${icon("edit")}
            </button>
            <button type="button" class="row-action danger" data-action="delete-category"
                    data-id="${category.id}" title="حذف" aria-label="حذف القسم">
              ${icon("trash")}
            </button>
          </div>
        </div>
      </div>
    </div>`;
}

async function openCategoryModal(category = null) {
  const value = category || {
    name: "",
    description: "",
    image_url: "",
    sort_order: 0,
    is_active: true,
  };

  openModal({
    title: category ? "تعديل القسم" : "قسم جديد",
    body: `
      <form id="category-form" class="admin-form-grid" novalidate>
        <div class="field full">
          <label for="c-name">اسم القسم <span>*</span></label>
          <input class="input" id="c-name" name="name" required maxlength="100"
                 value="${escapeHtml(value.name)}" placeholder="مثال: عطور">
        </div>

        <div class="field">
          <label for="c-sort">ترتيب الظهور</label>
          <input class="input" id="c-sort" name="sort_order" type="number" step="1"
                 value="${escapeHtml(value.sort_order ?? 0)}">
        </div>

        <div class="field">
          <label>حالة القسم</label>
          <label class="check-item" style="height:44px">
            <input type="checkbox" name="is_active"${value.is_active ? " checked" : ""}>
            ظاهر في المتجر
          </label>
        </div>

        <div class="field full">
          <label for="c-description">وصف القسم</label>
          <textarea class="textarea" id="c-description" name="description" rows="3"
                    placeholder="وصف مختصر يظهر في صفحة القسم">${escapeHtml(
                      value.description || ""
                    )}</textarea>
        </div>

        <div class="field full">
          <label>صورة القسم</label>
          <div class="image-field">
            <div class="image-preview" id="c-preview">
              ${
                value.image_url
                  ? `<img src="${escapeHtml(value.image_url)}" alt=""
                          onerror="this.parentElement.innerHTML='<span>لا توجد صورة</span>'">`
                  : `<span>لا توجد صورة</span>`
              }
            </div>
            <div>
              <input class="input" id="c-image" name="image_url"
                     value="${escapeHtml(value.image_url || "")}" placeholder="/static/img/category.jpg">
              <div class="upload-row">
                <label class="file-btn" for="c-file">${icon("upload")} رفع صورة</label>
                <input type="file" id="c-file" accept="image/jpeg,image/png,image/webp">
                <button type="button" class="file-btn" id="c-clear-image">
                  ${icon("close")} إزالة
                </button>
              </div>
              <p class="field-hint">يُفضّل صورة أفقية بنسبة 16:8.</p>
            </div>
          </div>
        </div>
      </form>`,
    footer: `
      <button type="button" class="btn btn-outline btn-sm" data-modal-close>إلغاء</button>
      <button type="submit" form="category-form" class="btn btn-primary btn-sm" id="category-save">
        ${icon("check")} حفظ القسم
      </button>`,
    wide: true,
  });

  bindImageUpload({
    inputId: "c-image",
    fileId: "c-file",
    previewId: "c-preview",
    clearId: "c-clear-image",
  });

  document
    .getElementById("category-form")
    ?.addEventListener("submit", (event) => saveCategory(event, category));
}

async function saveCategory(event, category) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();

  if (name.length < 2) {
    toast("اسم القسم قصير جدًا", "error");
    return;
  }

  const payload = {
    name,
    description: String(formData.get("description") || "").trim() || null,
    image_url: String(formData.get("image_url") || "").trim() || null,
    sort_order: Number(formData.get("sort_order")) || 0,
    is_active: formData.get("is_active") === "on",
  };

  const saveButton = document.getElementById("category-save");
  setBusy(saveButton, true, "جارٍ الحفظ...");

  try {
    if (category) await apiPut(`/api/admin/categories/${category.id}`, payload);
    else await apiPost("/api/admin/categories", payload);

    closeModal();
    toast(category ? "تم تحديث القسم بنجاح" : "تمت إضافة القسم بنجاح");
    state.adminCategories = null;
    await initStore().catch(() => {});
    categoriesView();
  } catch (error) {
    toast(error.message || "تعذر حفظ القسم", "error");
    setBusy(saveButton, false);
  }
}

async function deleteCategory(category) {
  const confirmed = await confirmAction({
    title: "حذف القسم",
    message: `هل تريد حذف قسم <b>${escapeHtml(
      category.name
    )}</b>؟ لا يمكن حذف قسم يحتوي على منتجات.`,
    confirmLabel: "نعم، احذف القسم",
  });
  if (!confirmed) return;

  try {
    const result = await apiDelete(`/api/admin/categories/${category.id}`);
    toast(result.message || "تم حذف القسم");
    state.adminCategories = null;
    await initStore().catch(() => {});
    categoriesView();
  } catch (error) {
    toast(error.message || "تعذر حذف القسم", "error");
  }
}

async function loadAdminCategories(force = false) {
  if (state.adminCategories && !force) return state.adminCategories;
  state.adminCategories = await apiGet("/api/admin/categories");
  return state.adminCategories;
}

async function loadAdminPayments(force = false) {
  if (state.paymentMethodsLoaded && !force) return state.paymentMethods;
  const methods = await apiGet("/api/admin/payments");
  state.paymentMethods = new Map((methods || []).map((method) => [method.code, method]));
  state.paymentMethodsLoaded = true;
  return state.paymentMethods;
}

function paymentMethodById(id) {
  return [...state.paymentMethods.values()].find((method) => method.id === id) || null;
}

function paymentLabel(code) {
  return state.paymentMethods.get(code)?.name || PAYMENT_LABELS[code] || code || "—";
}

/* ============================ Settings ============================ */
const PAYMENT_ICON_OPTIONS = [
  { value: "cash", label: "نقدي / عند الاستلام" },
  { value: "creditCard", label: "بطاقة أو تحويل" },
  { value: "wallet", label: "محفظة إلكترونية" },
  { value: "credit", label: "بطاقة بنكية" },
  { value: "phone", label: "محفظة موبايل" },
  { value: "shield", label: "دفع آمن" },
  { value: "truck", label: "الدفع عند التوصيل" },
];

function paymentMethodRow(method) {
  const active = Boolean(method.is_active);
  return `
    <tr class="${active ? "" : "is-off"}">
      <td>
        <div class="pay-name">
          <span class="pay-icon">${icon(method.icon || "creditCard")}</span>
          <span>${escapeHtml(method.name)}</span>
        </div>
      </td>
      <td><span class="cell-muted">${escapeHtml(method.description || "—")}</span></td>
      <td>
        <div class="gov-state">
          <button type="button" class="switch${active ? " on" : ""}"
                  data-action="toggle-payment" data-id="${method.id}"
                  role="switch" aria-checked="${active}"
                  title="${active ? "إيقاف طريقة الدفع" : "تفعيل طريقة الدفع"}"
                  aria-label="تبديل حالة طريقة الدفع"></button>
          <span class="mini-badge ${active ? "on" : "off"}">${active ? "متاحة" : "موقوفة"}</span>
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="row-action" data-action="edit-payment"
                  data-id="${method.id}" title="تعديل" aria-label="تعديل طريقة الدفع">
            ${icon("edit")}
          </button>
          <button type="button" class="row-action danger" data-action="delete-payment"
                  data-id="${method.id}" title="حذف" aria-label="حذف طريقة الدفع">
            ${icon("trash")}
          </button>
        </div>
      </td>
    </tr>`;
}

function governorateRow(governorate) {
  const active = Boolean(governorate.is_active);
  return `
    <tr class="${active ? "" : "is-off"}">
      <td><span class="gov-name">${escapeHtml(governorate.name)}</span></td>
      <td>
        <div class="fee-cell">
          <input class="input input-sm" type="number" min="0" step="5"
                 value="${Number(governorate.fee) || 0}"
                 data-gov-fee="${governorate.id}"
                 aria-label="رسوم شحن ${escapeHtml(governorate.name)}">
          <span class="fee-unit">${escapeHtml(store.info.currency || "ج.م")}</span>
          <button type="button" class="btn btn-outline btn-xs"
                  data-action="save-governorate-fee" data-id="${governorate.id}">
            حفظ
          </button>
        </div>
      </td>
      <td>
        <div class="gov-state">
          <button type="button" class="switch${active ? " on" : ""}"
                  data-action="toggle-governorate" data-id="${governorate.id}"
                  role="switch" aria-checked="${active}"
                  title="${active ? "إيقاف الشحن لهذه المحافظة" : "تفعيل الشحن لهذه المحافظة"}"
                  aria-label="تبديل حالة الشحن"></button>
          <span class="mini-badge ${active ? "on" : "off"}">${active ? "متاح" : "موقوف"}</span>
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="row-action" data-action="edit-governorate"
                  data-id="${governorate.id}" title="تعديل" aria-label="تعديل المحافظة">
            ${icon("edit")}
          </button>
          <button type="button" class="row-action danger" data-action="delete-governorate"
                  data-id="${governorate.id}" title="حذف" aria-label="حذف المحافظة">
            ${icon("trash")}
          </button>
        </div>
      </td>
    </tr>`;
}

async function settingsView() {
  const [settings, shipping, payments] = await Promise.all([
    apiGet("/api/admin/settings"),
    apiGet("/api/admin/shipping"),
    apiGet("/api/admin/payments"),
  ]);

  state.governorates = new Map(
    (shipping.governorates || []).map((governorate) => [governorate.id, governorate])
  );

  const methodList = payments || [];
  state.paymentMethods = new Map(methodList.map((method) => [method.code, method]));
  state.paymentMethodsLoaded = true;

  const rows = (shipping.governorates || []).map(governorateRow).join("");
  const paymentRows = methodList.map(paymentMethodRow).join("");
  const activePayments = methodList.filter((method) => method.is_active).length;
  const freeShipping = Boolean(settings.free_shipping_enabled);
  const currency = escapeHtml(settings.currency || store.info.currency || "ج.م");
  const paymentHint = !methodList.length
    ? "أضف طريقة دفع واحدة على الأقل ليتمكن العميل من إتمام الطلب."
    : activePayments
      ? "الطرق الموقوفة لا تظهر للعميل، ولازم تفضل طريقة واحدة متاحة على الأقل."
      : "كل الطرق موقوفة حاليًا — فعّل طريقة واحدة على الأقل ليتمكن العميل من إتمام الطلب.";

  viewEl.innerHTML = `
    <div class="settings-grid">
      <div class="settings-card settings-card-wide">
        <div class="settings-card-head">
          <div>
            <h3>بيانات المتجر</h3>
            <p>اسم المتجر والعملة والشعار تظهر مباشرة في واجهة المتجر.</p>
          </div>
          <span class="mini-badge on">${icon("settings")} الهوية</span>
        </div>
        <form id="store-settings-form" class="admin-form-grid" novalidate>
          <div class="field">
            <label for="store-name">اسم المتجر <span>*</span></label>
            <input class="input" id="store-name" name="name" maxlength="80"
                   value="${escapeHtml(settings.name)}">
          </div>
          <div class="field">
            <label for="store-name-en">الاسم بالإنجليزية</label>
            <input class="input ltr" id="store-name-en" name="name_en" maxlength="80"
                   value="${escapeHtml(settings.name_en)}">
          </div>
          <div class="field full">
            <label for="store-tagline">الشعار / الوصف القصير</label>
            <input class="input" id="store-tagline" name="tagline" maxlength="200"
                   value="${escapeHtml(settings.tagline)}">
          </div>
          <div class="field">
            <label for="store-currency">العملة <span>*</span></label>
            <input class="input" id="store-currency" name="currency" maxlength="20"
                   placeholder="ج.م" value="${currency}">
            <span class="field-hint">تظهر بجانب كل الأسعار في المتجر.</span>
          </div>
          <div class="field">
            <label for="store-instapay">حساب إنستاباي</label>
            <input class="input ltr" id="store-instapay" name="instapay_handle"
                   maxlength="120" value="${escapeHtml(settings.instapay_handle)}">
          </div>
          <div class="field">
            <label for="store-wallet">رقم المحفظة الإلكترونية</label>
            <input class="input ltr" id="store-wallet" name="wallet_number"
                   maxlength="60" value="${escapeHtml(settings.wallet_number)}">
          </div>
          <div class="field full">
            <button type="submit" class="btn btn-primary" id="store-settings-save">
              ${icon("check")} حفظ بيانات المتجر
            </button>
          </div>
        </form>
      </div>

      <div class="settings-card settings-card-wide">
        <div class="settings-card-head">
          <div>
            <h3>بيانات التواصل والروابط</h3>
            <p>تظهر في فوتر المتجر وصفحاته. سيب أي حقل فاضي عشان اللينك يختفي.</p>
          </div>
          <span class="mini-badge on">${icon("phone")} تواصل</span>
        </div>
        <form id="contact-settings-form" class="admin-form-grid" novalidate>
          <div class="field">
            <label for="contact-phone">رقم الهاتف</label>
            <input class="input ltr" id="contact-phone" name="contact_phone"
                   maxlength="60" value="${escapeHtml(settings.contact_phone)}">
          </div>
          <div class="field">
            <label for="contact-email">البريد الإلكتروني</label>
            <input class="input ltr" type="email" id="contact-email" name="contact_email"
                   maxlength="160" value="${escapeHtml(settings.contact_email)}">
          </div>
          <div class="field">
            <label for="contact-whatsapp">رقم واتساب</label>
            <input class="input ltr" id="contact-whatsapp" name="whatsapp_number"
                   maxlength="60" value="${escapeHtml(settings.whatsapp_number)}">
            <span class="field-hint">يُستخدم في زر «تواصل معنا» ولينك واتساب في الفوتر.</span>
          </div>
          <div class="field">
            <label for="contact-address">العنوان</label>
            <input class="input" id="contact-address" name="store_address"
                   maxlength="200" value="${escapeHtml(settings.store_address)}">
          </div>
          <div class="field full">
            <label for="contact-hours">ساعات العمل</label>
            <input class="input" id="contact-hours" name="working_hours"
                   maxlength="200" value="${escapeHtml(settings.working_hours)}">
          </div>
          <div class="field">
            <label for="contact-instagram">رابط إنستجرام</label>
            <input class="input ltr" type="url" id="contact-instagram" name="instagram_url"
                   maxlength="300" placeholder="https://instagram.com/..."
                   value="${escapeHtml(settings.instagram_url)}">
          </div>
          <div class="field">
            <label for="contact-facebook">رابط فيسبوك</label>
            <input class="input ltr" type="url" id="contact-facebook" name="facebook_url"
                   maxlength="300" placeholder="https://facebook.com/..."
                   value="${escapeHtml(settings.facebook_url)}">
          </div>
          <div class="field full">
            <button type="submit" class="btn btn-primary" id="contact-settings-save">
              ${icon("check")} حفظ بيانات التواصل
            </button>
          </div>
        </form>
      </div>

      <div class="settings-card settings-card-wide">
        <h3>إعدادات الشحن</h3>
        <p>تحكم في الشحن المجاني والرسوم الافتراضية. رسوم كل محافظة تُعدّل من الجدول بالأسفل.</p>
        <form id="shipping-settings-form" novalidate>
          <div class="setting-toggle">
            <div>
              <strong>تشغيل الشحن المجاني</strong>
              <span>لو مفعّل، هيبقى الشحن مجاني للطلبات اللي توصل للحد المحدد.</span>
            </div>
            <button type="button" class="switch${freeShipping ? " on" : ""}"
                    id="free-shipping-toggle" data-action="toggle-free-shipping"
                    role="switch" aria-checked="${freeShipping}"
                    aria-label="تشغيل أو إيقاف الشحن المجاني"></button>
          </div>
          <div class="admin-form-grid" style="margin-top:16px">
            <div class="field">
              <label for="free-shipping-threshold">حد الشحن المجاني (${currency})</label>
              <input class="input" id="free-shipping-threshold" name="free_shipping_threshold"
                     type="number" min="0" step="10"
                     value="${Number(settings.free_shipping_threshold)}"
                     ${freeShipping ? "" : "disabled"}>
            </div>
            <div class="field">
              <label for="default-shipping-fee">رسوم الشحن الافتراضية (${currency})</label>
              <input class="input" id="default-shipping-fee" name="default_shipping_fee"
                     type="number" min="0" step="5"
                     value="${Number(settings.default_shipping_fee)}">
            </div>
            <div class="field full">
              <button type="submit" class="btn btn-primary btn-sm" id="shipping-settings-save">
                ${icon("check")} حفظ إعدادات الشحن
              </button>
            </div>
          </div>
        </form>
      </div>

      <div class="settings-card settings-card-wide">
        <div class="settings-card-head">
          <div>
            <h3>شحن المحافظات</h3>
            <p>عدّل رسوم الشحن لكل محافظة، وحدد المحافظات اللي متاح لها الشحن.</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-action="add-governorate">
            ${icon("plus")} إضافة محافظة
          </button>
        </div>
        ${
          rows
            ? `<div class="table-scroll">
          <table class="shipping-table">
            <thead>
              <tr>
                <th>المحافظة</th>
                <th>رسوم الشحن</th>
                <th>حالة الشحن</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>`
            : `<div class="table-empty"><p>لا توجد محافظات مضافة بعد.</p></div>`
        }
        <p class="field-hint" style="margin-top:10px">
          المحافظات الموقوفة لا تظهر للعميل في صفحة إتمام الطلب.
        </p>
      </div>

      <div class="settings-card">
        <h3>تغيير كلمة المرور</h3>
        <p>استخدم كلمة مرور قوية لا تقل عن 8 أحرف لحماية لوحة التحكم.</p>
        <form id="password-form" novalidate>
          <div class="field">
            <label for="current-password">كلمة المرور الحالية</label>
            <input class="input" id="current-password" name="current_password"
                   type="password" autocomplete="current-password">
          </div>
          <div class="field">
            <label for="new-password">كلمة المرور الجديدة</label>
            <input class="input" id="new-password" name="new_password"
                   type="password" autocomplete="new-password">
          </div>
          <div class="field">
            <label for="confirm-password">تأكيد كلمة المرور الجديدة</label>
            <input class="input" id="confirm-password" name="confirm_password"
                   type="password" autocomplete="new-password">
          </div>
          <button type="submit" class="btn btn-primary btn-sm" id="password-save">
            ${icon("lock")} تحديث كلمة المرور
          </button>
        </form>
      </div>

      <div class="settings-card">
        <h3>حساب المدير</h3>
        <p>بيانات الحساب المستخدم حاليًا في إدارة المتجر.</p>
        <div class="info-list">
          <div class="info-row"><span>اسم المستخدم</span><strong class="ltr">${escapeHtml(
            state.admin?.username || "—"
          )}</strong></div>
          <div class="info-row"><span>الاسم الظاهر</span><strong>${escapeHtml(
            state.admin?.display_name || "—"
          )}</strong></div>
          <div class="info-row"><span>حالة الجلسة</span><strong style="color:var(--success)">نشطة</strong></div>
        </div>
        <button type="button" class="btn btn-outline btn-sm" id="settings-logout"
                style="margin-top:16px">${icon("logout")} تسجيل الخروج</button>
      </div>

      <div class="settings-card settings-card-wide">
        <div class="settings-card-head">
          <div>
            <h3>طرق الدفع</h3>
            <p>فعّل أو أوقف أي طريقة دفع، أو أضف طريقة جديدة تظهر للعميل عند إتمام الطلب.</p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" data-action="add-payment">
            ${icon("plus")} إضافة طريقة دفع
          </button>
        </div>
        ${
          paymentRows
            ? `<div class="table-scroll">
          <table class="shipping-table payment-table">
            <thead>
              <tr>
                <th>طريقة الدفع</th>
                <th>الوصف</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${paymentRows}</tbody>
          </table>
        </div>`
            : `<div class="table-empty"><p>لا توجد طرق دفع مضافة بعد.</p></div>`
        }
        <p class="field-hint" style="margin-top:10px">
          ${paymentHint}
        </p>
      </div>
    </div>`;

  document.getElementById("settings-logout")?.addEventListener("click", () => logout());
  document
    .getElementById("password-form")
    ?.addEventListener("submit", handlePasswordChange);
  document
    .getElementById("store-settings-form")
    ?.addEventListener("submit", handleStoreSettings);
  document
    .getElementById("contact-settings-form")
    ?.addEventListener("submit", handleContactSettings);
  document
    .getElementById("shipping-settings-form")
    ?.addEventListener("submit", handleShippingSettings);
}

async function handleStoreSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);

  const payload = {
    name: String(data.get("name") || "").trim(),
    name_en: String(data.get("name_en") || "").trim(),
    tagline: String(data.get("tagline") || "").trim(),
    currency: String(data.get("currency") || "").trim(),
    instapay_handle: String(data.get("instapay_handle") || "").trim(),
    wallet_number: String(data.get("wallet_number") || "").trim(),
  };

  if (!payload.name || !payload.currency) {
    toast("اسم المتجر والعملة لا يمكن تركهما فارغين", "error");
    return;
  }

  const button = document.getElementById("store-settings-save");
  setBusy(button, true, "جارٍ الحفظ...");

  try {
    await apiPut("/api/admin/settings", payload);
    await refreshStoreInfo();
    applyStoreBranding();
    toast("تم حفظ بيانات المتجر");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر حفظ بيانات المتجر", "error");
    setBusy(button, false);
  }
}

async function handleContactSettings(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  const payload = {
    contact_phone: String(data.get("contact_phone") || "").trim(),
    contact_email: String(data.get("contact_email") || "").trim(),
    whatsapp_number: String(data.get("whatsapp_number") || "").trim(),
    store_address: String(data.get("store_address") || "").trim(),
    working_hours: String(data.get("working_hours") || "").trim(),
    instagram_url: String(data.get("instagram_url") || "").trim(),
    facebook_url: String(data.get("facebook_url") || "").trim(),
  };

  const button = document.getElementById("contact-settings-save");
  setBusy(button, true, "جارٍ الحفظ...");

  try {
    await apiPut("/api/admin/settings", payload);
    await refreshStoreInfo();
    toast("تم حفظ بيانات التواصل والروابط");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر حفظ بيانات التواصل", "error");
    setBusy(button, false);
  }
}

function toggleFreeShipping(button) {
  const enabled = !button.classList.contains("on");
  button.classList.toggle("on", enabled);
  button.setAttribute("aria-checked", String(enabled));

  const threshold = document.getElementById("free-shipping-threshold");
  if (threshold) threshold.disabled = !enabled;
}

async function handleShippingSettings(event) {
  event.preventDefault();
  const toggle = document.getElementById("free-shipping-toggle");
  const thresholdInput = document.getElementById("free-shipping-threshold");
  const feeInput = document.getElementById("default-shipping-fee");

  const enabled = Boolean(toggle?.classList.contains("on"));
  const threshold = Number(thresholdInput?.value || 0);
  const defaultFee = Number(feeInput?.value || 0);

  if (!Number.isFinite(threshold) || threshold < 0) {
    toast("حد الشحن المجاني غير صحيح", "error");
    return;
  }
  if (!Number.isFinite(defaultFee) || defaultFee < 0) {
    toast("رسوم الشحن الافتراضية غير صحيحة", "error");
    return;
  }

  const button = document.getElementById("shipping-settings-save");
  setBusy(button, true, "جارٍ الحفظ...");

  try {
    await apiPut("/api/admin/settings", {
      free_shipping_enabled: enabled,
      free_shipping_threshold: threshold,
      default_shipping_fee: defaultFee,
    });
    await refreshStoreInfo();
    applyStoreBranding();
    toast("تم حفظ إعدادات الشحن");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر حفظ إعدادات الشحن", "error");
    setBusy(button, false);
  }
}

async function saveGovernorateFee(id) {
  const input = document.querySelector(`[data-gov-fee="${id}"]`);
  if (!input) return;

  const fee = Number(input.value);
  if (!Number.isFinite(fee) || fee < 0) {
    toast("رسوم الشحن غير صحيحة", "error");
    return;
  }

  const button = document.querySelector(
    `[data-action="save-governorate-fee"][data-id="${id}"]`
  );
  setBusy(button, true, "حفظ...");

  try {
    await apiPut(`/api/admin/shipping/governorates/${id}`, { fee });
    await refreshStoreInfo();
    toast("تم تحديث رسوم الشحن");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر تحديث رسوم الشحن", "error");
    setBusy(button, false);
  }
}

async function toggleGovernorate(id) {
  try {
    const result = await apiPatch(`/api/admin/shipping/governorates/${id}/toggle`);
    await refreshStoreInfo();
    toast(result.message || "تم تحديث حالة الشحن");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر تحديث حالة الشحن", "error");
  }
}

function openGovernorateModal(governorate = null) {
  const value = governorate || {
    name: "",
    fee: 0,
    sort_order: (state.governorates.size || 0) + 1,
    is_active: true,
  };

  openModal({
    title: governorate ? "تعديل المحافظة" : "إضافة محافظة",
    body: `
      <form id="governorate-form" class="admin-form-grid" novalidate>
        <div class="field full">
          <label for="g-name">اسم المحافظة <span>*</span></label>
          <input class="input" id="g-name" name="name" maxlength="60"
                 placeholder="مثال: القاهرة" value="${escapeHtml(value.name)}">
        </div>
        <div class="field">
          <label for="g-fee">رسوم الشحن (${escapeHtml(store.info.currency || "ج.م")})</label>
          <input class="input" id="g-fee" name="fee" type="number" min="0" step="5"
                 value="${Number(value.fee) || 0}">
          <span class="field-hint">اكتب 0 لو الشحن مجاني للمحافظة.</span>
        </div>
        <div class="field">
          <label for="g-order">ترتيب الظهور</label>
          <input class="input" id="g-order" name="sort_order" type="number" step="1"
                 value="${Number(value.sort_order) || 0}">
        </div>
        <label class="check-item full">
          <input type="checkbox" name="is_active" ${value.is_active ? "checked" : ""}>
          <span>الشحن متاح لهذه المحافظة</span>
        </label>
      </form>`,
    footer: `
      <button type="button" class="btn btn-outline btn-sm" data-modal-close>إلغاء</button>
      <button type="submit" form="governorate-form" class="btn btn-primary btn-sm" id="governorate-save">
        ${icon("check")} حفظ
      </button>`,
  });

  document
    .getElementById("governorate-form")
    ?.addEventListener("submit", (event) =>
      saveGovernorate(event, governorate?.id || null)
    );
}

async function saveGovernorate(event, id) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);

  const payload = {
    name: String(data.get("name") || "").trim(),
    fee: Number(data.get("fee") || 0),
    sort_order: Number(data.get("sort_order") || 0),
    is_active: Boolean(form.querySelector('[name="is_active"]')?.checked),
  };

  if (payload.name.length < 2) {
    toast("اسم المحافظة يجب أن يكون حرفين على الأقل", "error");
    return;
  }
  if (!Number.isFinite(payload.fee) || payload.fee < 0) {
    toast("رسوم الشحن غير صحيحة", "error");
    return;
  }

  const button = document.getElementById("governorate-save");
  setBusy(button, true, "جارٍ الحفظ...");

  try {
    if (id) {
      await apiPut(`/api/admin/shipping/governorates/${id}`, payload);
    } else {
      await apiPost("/api/admin/shipping/governorates", payload);
    }
    closeModal();
    await refreshStoreInfo();
    toast(id ? "تم تحديث المحافظة" : "تمت إضافة المحافظة");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر حفظ المحافظة", "error");
    setBusy(button, false);
  }
}

async function deleteGovernorate(governorate) {
  if (!governorate) return;

  const confirmed = await confirmAction({
    title: "حذف المحافظة",
    message: `هل تريد حذف <b>${escapeHtml(governorate.name)}</b>؟ لو ليها طلبات سابقة هيتم إيقاف الشحن لها بدل الحذف.`,
    confirmLabel: "نعم، حذف",
  });
  if (!confirmed) return;

  try {
    const result = await apiDelete(
      `/api/admin/shipping/governorates/${governorate.id}`
    );
    await refreshStoreInfo();
    toast(result.message || "تم حذف المحافظة");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر حذف المحافظة", "error");
  }
}

function openPaymentModal(method = null) {
  const value = method || {
    name: "",
    description: "",
    icon: "creditCard",
    sort_order: (state.paymentMethods.size || 0) + 1,
    is_active: true,
  };

  const iconOptions = PAYMENT_ICON_OPTIONS.map(
    (option) => `
      <option value="${option.value}" ${option.value === (value.icon || "creditCard") ? "selected" : ""}>
        ${option.label}
      </option>`
  ).join("");

  openModal({
    title: method ? "تعديل طريقة الدفع" : "إضافة طريقة دفع",
    body: `
      <form id="payment-form" class="admin-form-grid" novalidate>
        <div class="field full">
          <label for="p-name">اسم طريقة الدفع <span>*</span></label>
          <input class="input" id="p-name" name="name" maxlength="80"
                 placeholder="مثال: بطاقة بنكية" value="${escapeHtml(value.name)}">
        </div>
        <div class="field full">
          <label for="p-description">وصف قصير</label>
          <input class="input" id="p-description" name="description" maxlength="300"
                 placeholder="مثال: ادفع بأي بطاقة فيزا أو ماستركارد"
                 value="${escapeHtml(value.description || "")}">
        </div>
        <div class="field">
          <label for="p-icon">الأيقونة</label>
          <select class="input" id="p-icon" name="icon">${iconOptions}</select>
        </div>
        <div class="field">
          <label for="p-order">ترتيب الظهور</label>
          <input class="input" id="p-order" name="sort_order" type="number" step="1"
                 value="${Number(value.sort_order) || 0}">
        </div>
        <label class="check-item full">
          <input type="checkbox" name="is_active" ${value.is_active ? "checked" : ""}>
          <span>متاحة للعملاء عند إتمام الطلب</span>
        </label>
      </form>`,
    footer: `
      <button type="button" class="btn btn-outline btn-sm" data-modal-close>إلغاء</button>
      <button type="submit" form="payment-form" class="btn btn-primary btn-sm" id="payment-save">
        ${icon("check")} حفظ
      </button>`,
  });

  document
    .getElementById("payment-form")
    ?.addEventListener("submit", (event) =>
      savePaymentMethod(event, method?.id || null)
    );
}

async function savePaymentMethod(event, id) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);

  const payload = {
    name: String(data.get("name") || "").trim(),
    description: String(data.get("description") || "").trim(),
    icon: String(data.get("icon") || "creditCard"),
    sort_order: Number(data.get("sort_order") || 0),
    is_active: Boolean(form.querySelector('[name="is_active"]')?.checked),
  };

  if (payload.name.length < 2) {
    toast("اسم طريقة الدفع يجب أن يكون حرفين على الأقل", "error");
    return;
  }

  const button = document.getElementById("payment-save");
  setBusy(button, true, "جارٍ الحفظ...");

  try {
    if (id) {
      await apiPut(`/api/admin/payments/${id}`, payload);
    } else {
      await apiPost("/api/admin/payments", payload);
    }
    closeModal();
    await refreshStoreInfo();
    await loadAdminPayments(true);
    toast(id ? "تم تحديث طريقة الدفع" : "تمت إضافة طريقة الدفع");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر حفظ طريقة الدفع", "error");
    setBusy(button, false);
  }
}

async function togglePaymentMethod(id) {
  try {
    const result = await apiPatch(`/api/admin/payments/${id}/toggle`);
    await refreshStoreInfo();
    await loadAdminPayments(true);
    toast(result.message || "تم تحديث حالة طريقة الدفع");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر تحديث حالة طريقة الدفع", "error");
  }
}

async function deletePaymentMethod(method) {
  if (!method) return;

  const confirmed = await confirmAction({
    title: "حذف طريقة الدفع",
    message: `هل تريد حذف <b>${escapeHtml(method.name)}</b>؟ لو ليها طلبات سابقة هيتم إيقافها بدل الحذف.`,
    confirmLabel: "نعم، حذف",
  });
  if (!confirmed) return;

  try {
    const result = await apiDelete(`/api/admin/payments/${method.id}`);
    await refreshStoreInfo();
    await loadAdminPayments(true);
    toast(result.message || "تم حذف طريقة الدفع");
    await settingsView();
  } catch (error) {
    toast(error.message || "تعذر حذف طريقة الدفع", "error");
  }
}

async function handlePasswordChange(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const current = String(formData.get("current_password") || "");
  const next = String(formData.get("new_password") || "");
  const confirm = String(formData.get("confirm_password") || "");

  if (!current || !next) {
    toast("اكتب كلمة المرور الحالية والجديدة", "error");
    return;
  }
  if (next.length < 8) {
    toast("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل", "error");
    return;
  }
  if (next !== confirm) {
    toast("تأكيد كلمة المرور غير مطابق", "error");
    return;
  }

  const button = document.getElementById("password-save");
  setBusy(button, true, "جارٍ التحديث...");

  try {
    const result = await apiPut("/api/admin/password", {
      current_password: current,
      new_password: next,
    });
    form.reset();
    toast(result.message || "تم تحديث كلمة المرور");
  } catch (error) {
    toast(error.message || "تعذر تحديث كلمة المرور", "error");
  } finally {
    setBusy(button, false);
  }
}

/* ============================ Image upload ============================ */
function bindImageUpload({ inputId, fileId, previewId, clearId }) {
  const input = document.getElementById(inputId);
  const file = document.getElementById(fileId);
  const preview = document.getElementById(previewId);
  const clear = document.getElementById(clearId);

  const renderPreview = (url) => {
    if (!preview) return;
    if (url) {
      preview.innerHTML = `<img src="${escapeHtml(url)}" alt=""
        onerror="this.parentElement.innerHTML='<span>لا توجد صورة</span>'">`;
    } else {
      preview.innerHTML = "<span>لا توجد صورة</span>";
    }
  };

  input?.addEventListener("input", () => renderPreview(input.value.trim()));

  clear?.addEventListener("click", () => {
    if (input) input.value = "";
    if (file) file.value = "";
    renderPreview("");
  });

  file?.addEventListener("change", async () => {
    const selected = file.files?.[0];
    if (!selected) return;

    const label = document.querySelector(`label[for="${fileId}"]`);
    const original = label?.innerHTML;
    if (label) {
      label.innerHTML = `${icon("spinner", 'class="spin"')} جارٍ الرفع...`;
    }

    const formData = new FormData();
    formData.append("file", selected);

    try {
      const result = await apiUpload("/api/admin/upload", formData);
      if (input) input.value = result.url;
      renderPreview(result.url);
      toast("تم رفع الصورة بنجاح");
    } catch (error) {
      toast(error.message || "تعذر رفع الصورة", "error");
    } finally {
      if (label && original) label.innerHTML = original;
      file.value = "";
    }
  });
}

/* ============================ View events ============================ */
async function handleViewClick(event) {
  const target = event.target.closest("[data-action], [data-page]");
  if (!target) return;

  const page = target.closest("[data-page]");
  if (page) {
    if (page.disabled) return;
    const kind = page.dataset.pageKind;
    const number = Number(page.dataset.page);
    if (!kind || !Number.isFinite(number)) return;
    state.filters[kind].page = number;
    if (kind === "orders") await loadOrders();
    if (kind === "products") await loadProducts();
    return;
  }

  const action = target.dataset.action;
  const id = Number(target.dataset.id);

  try {
    switch (action) {
      case "retry":
        renderView();
        break;
      case "go-orders":
        go("orders");
        break;
      case "go-products":
        go("products");
        break;
      case "refresh-orders":
        await loadOrders();
        break;
      case "view-order":
        await openOrderModal(id);
        break;
      case "add-product":
        await openProductModal();
        break;
      case "edit-product": {
        const product = state.products.get(id);
        if (product) await openProductModal(product);
        break;
      }
      case "delete-product": {
        const product = state.products.get(id);
        if (product) await deleteProduct(product);
        break;
      }
      case "toggle-product":
        await toggleProduct(id);
        break;
      case "add-category":
        await openCategoryModal();
        break;
      case "edit-category": {
        const category = state.categories.get(id);
        if (category) await openCategoryModal(category);
        break;
      }
      case "delete-category": {
        const category = state.categories.get(id);
        if (category) await deleteCategory(category);
        break;
      }
      case "add-governorate":
        openGovernorateModal();
        break;
      case "edit-governorate": {
        const governorate = state.governorates.get(id);
        if (governorate) openGovernorateModal(governorate);
        break;
      }
      case "delete-governorate": {
        const governorate = state.governorates.get(id);
        if (governorate) await deleteGovernorate(governorate);
        break;
      }
      case "toggle-governorate":
        await toggleGovernorate(id);
        break;
      case "save-governorate-fee":
        await saveGovernorateFee(id);
        break;
      case "add-payment":
        openPaymentModal();
        break;
      case "edit-payment": {
        const method = paymentMethodById(id);
        if (method) openPaymentModal(method);
        break;
      }
      case "delete-payment": {
        const method = paymentMethodById(id);
        if (method) await deletePaymentMethod(method);
        break;
      }
      case "toggle-payment":
        await togglePaymentMethod(id);
        break;
      case "toggle-free-shipping": {
        const toggle = target.closest(".switch");
        if (toggle) toggleFreeShipping(toggle);
        break;
      }
      default:
        break;
    }
  } catch (error) {
    if (error?.status !== 401) {
      toast(error.message || "حدث خطأ غير متوقع", "error");
    }
  }
}

async function handleViewChange(event) {
  const select = event.target.closest("[data-order-status]");
  if (select) await changeOrderStatus(select);
}

/* ============================ Modal ============================ */
function openModal({ title, body, footer = "", wide = false }) {
  if (!modal) return;
  modalTitle.textContent = title || "تفاصيل";
  modalBody.innerHTML = body || "";
  modalFoot.innerHTML = footer || "";
  modal.querySelector(".modal")?.classList.toggle("wide", Boolean(wide));
  modal.hidden = false;
  document.body.classList.add("no-scroll");

  modalFoot.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  window.setTimeout(() => {
    const firstField = modalBody.querySelector("input:not([type='file']), textarea, select");
    firstField?.focus({ preventScroll: true });
  }, 80);
}

function closeModal() {
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("no-scroll");
  modalBody.innerHTML = "";
  modalFoot.innerHTML = "";
  modal.querySelector(".modal")?.classList.remove("wide");

  if (confirmResolve) {
    const resolve = confirmResolve;
    confirmResolve = null;
    resolve(false);
  }
}

function confirmAction({ title, message, confirmLabel = "تأكيد" }) {
  return new Promise((resolve) => {
    confirmResolve = resolve;

    openModal({
      title,
      body: `<p class="confirm-message">${message}</p>`,
      footer: `
        <button type="button" class="btn btn-outline btn-sm" data-confirm="no">إلغاء</button>
        <button type="button" class="btn btn-danger btn-sm" data-confirm="yes">
          ${escapeHtml(confirmLabel)}
        </button>`,
    });

    modalFoot.querySelectorAll("[data-confirm]").forEach((button) => {
      button.addEventListener("click", () => {
        const result = button.dataset.confirm === "yes";
        const done = confirmResolve;
        confirmResolve = null;
        closeModal();
        done?.(result);
      });
    });
  });
}

/* ============================ Shared UI ============================ */
function loadingBlock(label = "جارٍ التحميل...") {
  return `
    <div class="table-loading">
      ${icon("spinner", 'class="spin"')}
      <span>${escapeHtml(label)}</span>
    </div>`;
}

function errorBlock(message) {
  return `
    <div class="table-empty">
      <p style="color:var(--danger);margin-bottom:14px">${escapeHtml(message)}</p>
      <button type="button" class="btn btn-outline btn-sm" data-action="retry">
        ${icon("refresh")} إعادة المحاولة
      </button>
    </div>`;
}

function paginationMarkup(data, kind) {
  if (!data.pages || data.pages <= 1) {
    return `
      <div class="pagination">
        <span class="page-info">إجمالي ${data.total} عنصر</span>
      </div>`;
  }

  const from = (data.page - 1) * data.page_size + 1;
  const to = Math.min(data.page * data.page_size, data.total);

  return `
    <div class="pagination">
      <span class="page-info">عرض ${from}–${to} من ${data.total}</span>
      <div class="page-buttons">
        <button type="button" class="page-btn" data-page-kind="${kind}"
                data-page="${data.page - 1}"${data.page <= 1 ? " disabled" : ""}
                aria-label="الصفحة السابقة">${icon("chevronRight")}</button>
        <button type="button" class="page-btn" disabled>${data.page} / ${data.pages}</button>
        <button type="button" class="page-btn" data-page-kind="${kind}"
                data-page="${data.page + 1}"${data.page >= data.pages ? " disabled" : ""}
                aria-label="الصفحة التالية">${icon("chevronLeft")}</button>
      </div>
    </div>`;
}

function setBusy(button, busy, label = "جارٍ التنفيذ...") {
  if (!button) return;
  if (busy) {
    button.dataset.original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `${icon("spinner", 'class="spin"')} ${escapeHtml(label)}`;
  } else {
    button.disabled = false;
    if (button.dataset.original) {
      button.innerHTML = button.dataset.original;
      delete button.dataset.original;
    }
  }
}

function parseList(value) {
  return String(value || "")
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseColors(value) {
  return parseList(value).map((entry) => {
    const [name, rawHex] = entry.split(":").map((part) => part.trim());
    const hex = rawHex
      ? rawHex.startsWith("#")
        ? rawHex
        : `#${rawHex}`
      : "#1f3d33";
    return {
      name: name || entry,
      hex: /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(hex)
        ? hex
        : "#1f3d33",
    };
  });
}

function setTopbarDate() {
  const element = document.getElementById("topbar-date");
  if (!element) return;
  element.textContent = new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: store.info.timezone || "Africa/Cairo",
  }).format(new Date());
}

/* ============================ Views map ============================ */
const VIEWS = {
  dashboard: dashboardView,
  orders: ordersView,
  products: productsView,
  categories: categoriesView,
  settings: settingsView,
};
