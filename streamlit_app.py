"""متجر EMO STORE على Streamlit Cloud — بدون أي سيرفر خارجي.

البيانات بتقرأ وتكتب مباشرة في SQLite الموجود داخل الـ repo.
ملاحظة: Streamlit Cloud بيفرض نظام ملفات مؤقت، فالتعديلات بتفضل لحد إعادة النشر/التشغيل.
"""
from contextlib import contextmanager
from html import escape
from pathlib import Path

import streamlit as st

import models
import schemas
import store_config
from database import Base, SessionLocal, engine, ensure_schema
from routers.admin import update_order_status
from routers.orders import create_order
from seed import seed_database
from security import verify_password
from settings import ORDER_STATUS_LABELS, STATIC_DIR

st.set_page_config(
    page_title="EMO STORE",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="collapsed",
)

THEME = """
<style>
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Cairo:wght@300;400;500;600;700;800&display=swap');

:root {
  --bg: #f7f4ee;
  --bg-2: #f1ece3;
  --surface: #fffdf9;
  --ink: #191714;
  --ink-2: #3d3933;
  --muted: #7b7468;
  --line: #e6dfd2;
  --line-strong: #d6ccba;
  --brand: #1f3d33;
  --brand-700: #173128;
  --brand-500: #2e5a4a;
  --brand-100: #e4ece7;
  --gold: #c9a24b;
  --gold-soft: #f0e4c9;
  --radius: 18px;
  --shadow: 0 24px 60px -38px rgba(25, 23, 20, 0.55);
}

html, body, [class*="css"] { font-family: "Cairo", "Segoe UI", Tahoma, sans-serif !important; }
.stApp { background: var(--bg) !important; color: var(--ink) !important; direction: rtl; }
[data-testid="stSidebar"], [data-testid="stHeader"], [data-testid="stBottomBlockContainer"] { display: none !important; }
footer:not(.emo-footer) { visibility: hidden; }
.block-container { max-width: 1240px !important; margin-inline: auto !important; padding: 0 24px 64px !important; }

h1, h2, h3 { font-family: "Amiri", "Cairo", serif !important; color: var(--brand) !important; }
h1 { font-size: clamp(34px, 4.6vw, 54px) !important; line-height: 1.2 !important; }
h2 { font-size: clamp(26px, 3.2vw, 38px) !important; }
h3 { font-size: 22px !important; }
[data-testid="stCaptionContainer"] { color: var(--muted) !important; font-size: 14px !important; }
hr { border-color: var(--line) !important; }

button[kind="secondary"],
button[kind="primary"] {
  min-height: 38px !important;
  height: auto !important;
  padding: 8px 16px !important;
  border-radius: 10px !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  line-height: 1.4 !important;
  box-shadow: none !important;
  transition: background 0.18s, border-color 0.18s, color 0.18s !important;
}
button[kind="secondary"] {
  background: transparent !important;
  color: var(--brand) !important;
  border: 1px solid transparent !important;
}
button[kind="secondary"]:hover {
  background: var(--brand-100) !important;
  border-color: var(--brand-100) !important;
  text-decoration: underline;
  text-decoration-color: var(--gold);
  text-underline-offset: 5px;
}
button[kind="primary"] {
  background: var(--gold) !important;
  color: #241c0d !important;
  border: 1px solid var(--gold) !important;
}
button[kind="primary"]:hover { background: #d8b25f !important; border-color: #d8b25f !important; }
button:active { transform: scale(0.97) !important; }

[data-testid="stFormSubmitButton"] button[kind="primary"] {
  min-height: 46px !important;
  padding: 10px 26px !important;
  border-radius: 999px !important;
  background: var(--brand) !important;
  color: #f8f5ee !important;
  border-color: var(--brand) !important;
  box-shadow: 0 12px 24px -16px rgba(31, 61, 51, 0.9) !important;
  font-size: 14px !important;
}
[data-testid="stFormSubmitButton"] button[kind="primary"]:hover {
  background: var(--brand-700) !important;
  border-color: var(--brand-700) !important;
}

[data-testid="stTextInput"] input,
[data-testid="stTextArea"] textarea,
[data-testid="stNumberInput"] input,
[data-testid="stSelectbox"] > div > div {
  background: #fff !important;
  border: 1px solid var(--line-strong) !important;
  border-radius: 12px !important;
  color: var(--ink) !important;
  text-align: right !important;
  min-height: 48px !important;
}
[data-testid="stTextInput"] input:focus,
[data-testid="stTextArea"] textarea:focus { border-color: var(--brand) !important; box-shadow: 0 0 0 4px rgba(31,61,51,0.08) !important; }

[data-testid="stContainer"], [data-testid="stExpander"], [data-testid="stForm"] {
  background: var(--surface) !important;
  border: 1px solid var(--line) !important;
  border-radius: var(--radius) !important;
  box-shadow: var(--shadow) !important;
  padding: 16px !important;
}
[data-testid="stImage"] img { border-radius: 14px !important; aspect-ratio: 1 / 1 !important; object-fit: cover !important; width: 100% !important; }
[data-testid="stAlert"] { border-radius: 14px !important; }

.emo-announce {
  background: var(--brand-700);
  color: #efe9db;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  padding: 9px 16px;
  letter-spacing: 0.2px;
  border-radius: 0 0 12px 12px;
}
.emo-announce span { color: var(--gold); padding-inline: 9px; }
.emo-header {
  display: flex; align-items: center; gap: 20px;
  padding: 18px 4px 14px;
  border-bottom: 1px solid var(--line);
}
.emo-brand { display: flex; align-items: center; gap: 10px; }
.emo-mark {
  width: 44px; height: 44px; border-radius: 12px;
  background: var(--brand); color: var(--gold);
  display: grid; place-items: center;
  font-family: "Amiri", serif; font-size: 26px; font-weight: 700;
  box-shadow: 0 8px 18px -10px rgba(31,61,51,0.9);
}
.emo-brand strong { display: block; font-family: "Amiri", serif; font-size: 25px; line-height: 1; color: var(--brand); }
.emo-brand small { display: block; font-size: 8px; letter-spacing: 3.4px; color: var(--muted); font-weight: 700; margin-top: 5px; }
.emo-header-note { color: var(--muted); font-size: 13px; margin-inline-start: auto; }
.emo-cart {
  background: var(--gold-soft); color: #241c0d;
  border-radius: 999px; padding: 8px 14px;
  font-size: 13px; font-weight: 700; white-space: nowrap;
}
.emo-hero {
  text-align: center;
  padding: 44px 20px 30px;
  background: radial-gradient(circle at 50% 0%, var(--gold-soft), transparent 62%);
  border-radius: var(--radius);
  margin-block: 22px 10px;
}
.emo-eyebrow {
  display: inline-block; font-size: 12px; font-weight: 800;
  letter-spacing: 2px; color: var(--brand-500);
  border-bottom: 1px solid var(--gold); padding-bottom: 4px; margin-bottom: 12px;
}
.emo-hero p { color: var(--ink-2); font-size: 15px; max-width: 640px; margin: 10px auto 0; line-height: 1.9; }
.emo-footer {
  margin-top: 56px; padding: 38px 28px 22px;
  background: var(--brand-700); color: #efe9db;
  border-radius: var(--radius) var(--radius) 0 0;
}
.emo-footer-grid { display: flex; flex-wrap: wrap; gap: 40px; justify-content: space-between; }
.emo-footer h4 { margin: 0 0 12px; font-size: 15px; color: var(--gold); }
.emo-footer a, .emo-footer p { display: block; color: #efe9db; font-size: 13.5px; line-height: 2; }
.emo-footer a:hover { color: var(--gold); }
.emo-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.emo-badges span { border: 1px solid rgba(239,233,219,0.28); border-radius: 999px; padding: 5px 12px; font-size: 11px; }
.emo-copy { text-align: center; border-top: 1px solid rgba(239,233,219,0.16); margin-top: 28px; padding-top: 16px; font-size: 11.5px; color: #b9b3a6; }
.emo-nav-description { color: var(--muted); font-size: 12.5px; text-align: center; margin: 6px 0 14px; }
</style>
"""

st.markdown(THEME, unsafe_allow_html=True)

STATUSES = list(ORDER_STATUS_LABELS.keys())
PAGES = ["المتجر", "السلة", "الطلبات", "الإعدادات"]


@st.cache_resource
def init_database() -> bool:
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    with session_scope() as db:
        seed_database(db)
    return True


@contextmanager
def session_scope():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def product_image(product) -> str | None:
    url = getattr(product, "image_url", None)
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    relative = url.lstrip("/")
    if relative.startswith("static/"):
        relative = relative[len("static/") :]
    path: Path = STATIC_DIR / relative
    return str(path) if path.exists() else None


def error_text(exc: Exception) -> str:
    detail = getattr(exc, "detail", None)
    if isinstance(detail, list):
        return " • ".join(
            str(item.get("msg", item)) if isinstance(item, dict) else str(item)
            for item in detail
        )
    return str(detail or exc)


def render_header(config: dict, cart_count: int) -> None:
    html = f"""
    <div class="emo-announce">
      شحن مجاني للطلبات فوق 1,500 ج.م <span>•</span>
      الدفع عند الاستلام متاح لكل المحافظات <span>•</span>
      استرجاع مجاني خلال 14 يوم
    </div>
    <div class="emo-header">
      <div class="emo-brand">
        <span class="emo-mark">E</span>
        <span>
          <strong>{escape(str(config.get('store_name') or 'EMO STORE'))}</strong>
          <small>{escape(str(config.get('store_name_en') or 'EMO STORE'))}</small>
        </span>
      </div>
      <div class="emo-header-note">{escape(str(config.get('store_tagline') or ''))}</div>
      <div class="emo-cart">🛒 السلة ({cart_count})</div>
    </div>
    """
    st.markdown(html, unsafe_allow_html=True)


def render_banner(title: str, subtitle: str = "") -> None:
    st.markdown(
        f"""
        <div class="emo-hero">
          <div class="emo-eyebrow">EMO STORE</div>
          <h1>{escape(title)}</h1>
          <p>{escape(subtitle)}</p>
        </div>
        """,
        unsafe_allow_html=True,
    )


def render_footer(config: dict) -> None:
    phone = str(config.get("contact_phone") or "")
    email = str(config.get("contact_email") or "")
    whatsapp = str(config.get("whatsapp_number") or "")
    address = str(config.get("store_address") or "القاهرة، مصر")
    hours = str(config.get("working_hours") or "")
    instagram = str(config.get("instagram_url") or "#")
    facebook = str(config.get("facebook_url") or "#")

    def clean_link(value: str, prefix: str) -> str:
        value = value.strip()
        if not value:
            return "#"
        return value if value.startswith(("http://", "https://")) else prefix + value.lstrip("+")

    st.markdown(
        f"""
        <footer class="emo-footer">
          <div class="emo-footer-grid">
            <div>
              <h4>EMO STORE</h4>
              <p>قطع مختارة بعناية، بخامات تستحق البقاء. تجربة شراء بسيطة وآمنة من قلب مصر.</p>
              <div class="emo-badges">
                <a href="{escape(clean_link(instagram, 'https://instagram.com/'), quote=True)}">إنستجرام</a>
                <a href="{escape(clean_link(facebook, 'https://facebook.com/'), quote=True)}">فيسبوك</a>
                <a href="{escape(clean_link(whatsapp, 'https://wa.me/'), quote=True)}">واتساب</a>
              </div>
            </div>
            <div>
              <h4>تواصل معنا</h4>
              <a href="tel:{escape(phone, quote=True)}" dir="ltr">{escape(phone)}</a>
              <a href="mailto:{escape(email, quote=True)}" dir="ltr">{escape(email)}</a>
              <p>{escape(address)}<br>{escape(hours)}</p>
            </div>
            <div>
              <h4>الدفع والشحن</h4>
              <div class="emo-badges">
                <span>الدفع عند الاستلام</span>
                <span>إنستاباي</span>
                <span>محفظة إلكترونية</span>
                <span>شحن لكل المحافظات</span>
              </div>
            </div>
          </div>
          <div class="emo-copy">© 2026 EMO STORE. كل الحقوق محفوظة.</div>
        </footer>
        """,
        unsafe_allow_html=True,
    )


def navigation() -> None:
    columns = st.columns(len(PAGES) + 1)
    current = st.session_state.get("page", PAGES[0])
    for index, label in enumerate(PAGES):
        with columns[index]:
            text = ("● " if label == current else "") + label
            if st.button(text, key=f"nav_{label}", width="stretch"):
                st.session_state.page = label
                st.rerun()
    with columns[-1]:
        auth_label = "🚪 خروج" if st.session_state.get("admin") else "👤 دخول الأدمن"
        if st.button(auth_label, key="nav_auth", width="stretch"):
            if st.session_state.get("admin"):
                st.session_state.admin = ""
                st.session_state.page = PAGES[0]
            else:
                st.session_state.page = "الإعدادات"
            st.rerun()
    st.markdown('<div class="emo-nav-description">قطع مختارة بعناية، لتفاصيل تستحقها</div>', unsafe_allow_html=True)


def admin_gate() -> bool:
    if st.session_state.get("admin"):
        st.success(f"مسجّل كـ **{st.session_state.admin}**")
        return True

    st.markdown("### دخول الأدمن")
    with st.form("admin_login"):
        username = st.text_input("اسم المستخدم", value="admin")
        password = st.text_input("كلمة المرور", type="password")
        if st.form_submit_button("دخول", type="primary", width="stretch"):
            with session_scope() as db:
                admin = (
                    db.query(models.AdminUser)
                    .filter(models.AdminUser.username == username.strip())
                    .first()
                )
                if admin and verify_password(password, admin.password_hash):
                    st.session_state.admin = admin.username
                    st.success("تم تسجيل الدخول")
                    st.rerun()
                else:
                    st.error("اسم المستخدم أو كلمة المرور غير صحيحة")
    return False


def store_page(config: dict) -> None:
    render_banner("قطع مختارة بعناية", config.get("store_tagline", ""))
    currency = config["store_currency"]

    with session_scope() as db:
        category_rows = (
            db.query(models.Category)
            .filter(models.Category.is_active.is_(True))
            .order_by(models.Category.sort_order, models.Category.id)
            .all()
        )
        names = ["الكل"] + [row.name for row in category_rows]
        filter_col1, filter_col2 = st.columns([1, 2])
        with filter_col1:
            selected = st.selectbox("القسم", names)
        with filter_col2:
            search = st.text_input("ابحث عن منتج")

        query = db.query(models.Product).filter(models.Product.is_active.is_(True))
        if selected != "الكل":
            category_id = next((row.id for row in category_rows if row.name == selected), -1)
            query = query.filter(models.Product.category_id == category_id)
        if search.strip():
            query = query.filter(models.Product.name.contains(search.strip()))
        products = query.order_by(models.Product.id.desc()).all()

    st.markdown("---")
    st.subheader(f"المنتجات ({len(products)})")
    if not products:
        st.info("لا توجد منتجات مطابقة.")
        return

    for start in range(0, len(products), 3):
        columns = st.columns(3)
        for column, product in zip(columns, products[start : start + 3]):
            with column:
                with st.container(border=True):
                    picture = product_image(product)
                    if picture:
                        st.image(picture, width="stretch")
                    st.markdown(f"**{product.name}**")
                    st.write(f"**{product.price} {currency}**")
                    st.caption("متوفر ✅" if product.stock > 0 else "نفد المخزون")
                    if product.stock > 0:
                        if st.button("أضف للسلة", key=f"add_{product.id}", type="primary", width="stretch"):
                            if "cart" not in st.session_state:
                                st.session_state.cart = {}
                            st.session_state.cart[product.id] = min(
                                st.session_state.cart.get(product.id, 0) + 1,
                                product.stock,
                            )
                            st.toast("اتضاف للسلة 🛒")


def cart_page(config: dict) -> None:
    render_banner("سلة التسوق", "راجع اختياراتك وأكمل طلبك بخطوات بسيطة.")
    cart: dict[int, int] = st.session_state.get("cart", {})

    with session_scope() as db:
        currency = config["store_currency"]
        products = {
            row.id: row
            for row in db.query(models.Product)
            .filter(models.Product.id.in_(cart.keys()))
            .all()
        }
        governorates = store_config.public_governorates(db)
        payment_methods = store_config.public_payment_methods(db)

        if not products:
            st.info("السلة فاضية. اختار منتجات من صفحة المتجر.")
            return

        total = 0.0
        for product_id, quantity in list(cart.items()):
            product = products.get(product_id)
            if not product:
                cart.pop(product_id, None)
                continue
            col1, col2, col3 = st.columns([5, 2, 1])
            with col1:
                st.markdown(f"**{product.name}**")
                st.caption(f"{product.price} {currency}")
            with col2:
                qty = st.number_input(
                    "الكمية",
                    min_value=1,
                    max_value=max(1, product.stock),
                    value=min(quantity, max(1, product.stock)),
                    key=f"qty_{product_id}",
                )
                cart[product_id] = qty
                total += product.price * qty
            with col3:
                if st.button("حذف", key=f"remove_{product_id}", width="stretch"):
                    cart.pop(product_id, None)
                    st.rerun()

        st.subheader(f"الإجمالي: {total:,.2f} {currency}")

        if not governorates:
            st.error("الشحن غير متاح حاليًا.")
            return
        if not payment_methods:
            st.error("لا توجد طرق دفع متاحة حاليًا.")
            return

        with st.form("checkout"):
            customer_name = st.text_input("الاسم")
            phone = st.text_input("رقم الهاتف (01012345678)")
            governorate = st.selectbox("المحافظة", [row["name"] for row in governorates])
            city = st.text_input("المدينة")
            address = st.text_area("العنوان")
            notes = st.text_area("ملاحظات (اختياري)")
            payment = st.selectbox(
                "طريقة الدفع",
                [row["id"] for row in payment_methods],
                format_func=lambda code: next(
                    row["name"] for row in payment_methods if row["id"] == code
                ),
            )
            submit = st.form_submit_button("تأكيد الطلب", type="primary", width="stretch")

        if submit:
            try:
                payload = schemas.OrderCreate(
                    customer_name=customer_name,
                    customer_phone=phone,
                    governorate=governorate,
                    city=city,
                    address=address,
                    notes=notes or None,
                    payment_method=payment,
                    items=[
                        schemas.OrderItemIn(product_id=product_id, quantity=qty)
                        for product_id, qty in cart.items()
                    ],
                )
                order = create_order(payload, db)
                st.session_state.cart = {}
                st.success(f"تم إنشاء الطلب **{order.order_number}** ✅")
                st.rerun()
            except Exception as exc:
                st.error(error_text(exc))


def orders_page() -> None:
    render_banner("الطلبات", "تابع الطلبات وغيّر حالتها — الإلغاء يرجّع الكميات للمخزن.")
    if not admin_gate():
        return

    selected = st.selectbox(
        "تصفية حسب الحالة",
        ["الكل"] + STATUSES,
        format_func=lambda value: ORDER_STATUS_LABELS.get(value, value),
    )

    with session_scope() as db:
        query = db.query(models.Order)
        if selected != "الكل":
            query = query.filter(models.Order.status == selected)
        orders = query.order_by(models.Order.created_at.desc()).limit(100).all()

    if not orders:
        st.info("لا توجد طلبات مطابقة.")
        return

    for order in orders:
        label = (
            f"#{order.order_number} — {order.customer_name} — "
            f"{ORDER_STATUS_LABELS.get(order.status, order.status)}"
        )
        with st.expander(label):
            st.write(f"**الهاتف:** {order.customer_phone}")
            st.write(f"**العنوان:** {order.governorate} / {order.city} / {order.address}")
            st.write(f"**الدفع:** {order.payment_method} — {order.payment_status}")
            st.write(f"**الإجمالي:** {order.total}")
            st.markdown("**المنتجات:**")
            for item in order.items:
                st.write(f"- {item.product_name} × {item.quantity} = {item.line_total}")

            new_status = st.selectbox(
                "تغيير الحالة",
                STATUSES,
                index=STATUSES.index(order.status) if order.status in STATUSES else 0,
                format_func=lambda value: ORDER_STATUS_LABELS.get(value, value),
                key=f"status_{order.id}",
            )
            if st.button("حفظ الحالة", key=f"save_{order.id}", type="primary", width="stretch"):
                with session_scope() as db:
                    update_order_status(
                        order.id,
                        schemas.OrderStatusUpdate(status=new_status),
                        None,
                        db,
                    )
                if new_status == "cancelled":
                    st.success("تم الإلغاء ورجوع الكميات للمخزن ✅")
                else:
                    st.success("تم تحديث الحالة ✅")
                st.rerun()


def settings_page() -> None:
    render_banner("إعدادات المتجر", "عدّل بيانات المتجر ووسائل التواصل والروابط من مكان واحد.")
    if not admin_gate():
        return

    with session_scope() as db:
        config = store_config.get_config(db)

    fields = [
        ("اسم المتجر", "store_name"),
        ("الاسم بالإنجليزية", "store_name_en"),
        ("الشعار / الوصف", "store_tagline"),
        ("العملة", "store_currency"),
        ("حساب إنستاباي", "instapay_handle"),
        ("رقم المحفظة", "wallet_number"),
        ("رقم الهاتف", "contact_phone"),
        ("البريد الإلكتروني", "contact_email"),
        ("رقم واتساب", "whatsapp_number"),
        ("العنوان", "store_address"),
        ("ساعات العمل", "working_hours"),
        ("رابط إنستجرام", "instagram_url"),
        ("رابط فيسبوك", "facebook_url"),
    ]

    left, right = st.columns(2)
    with st.form("store_settings"):
        values = {}
        for index, (label, key) in enumerate(fields):
            target = left if index % 2 == 0 else right
            with target:
                values[key] = st.text_input(label, value=str(config.get(key) or ""))
        if st.form_submit_button("حفظ الإعدادات", type="primary", width="stretch"):
            with session_scope() as db:
                store_config.update_config(db, values)
            st.success("تم حفظ الإعدادات ✅")
            st.rerun()


def main() -> None:
    init_database()
    if "admin" not in st.session_state:
        st.session_state.admin = ""
    if "cart" not in st.session_state:
        st.session_state.cart = {}
    if "page" not in st.session_state:
        st.session_state.page = PAGES[0]

    with session_scope() as db:
        config = store_config.get_config(db)

    render_header(config, len(st.session_state.cart))
    navigation()

    page = st.session_state.page
    if page == "المتجر":
        store_page(config)
    elif page == "السلة":
        cart_page(config)
    elif page == "الطلبات":
        orders_page()
    else:
        settings_page()

    render_footer(config)


if __name__ == "__main__":
    main()
