"""متجر EMO STORE على Streamlit Cloud — بدون أي سيرفر خارجي.

البيانات بتقرأ وتكتب مباشرة في SQLite الموجود داخل الـ repo.
ملاحظة: Streamlit Cloud بيفرض نظام ملفات مؤقت، فالتعديلات بتفضل لحد إعادة النشر/التشغيل.
"""
from contextlib import contextmanager
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
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
    .stApp, .stSidebar { direction: rtl; text-align: right; }
    .stButton>button, .stTextInput>div>input, .stNumberInput input {
        text-align: right;
    }
    .block-container { padding-top: 2rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

STATUSES = list(ORDER_STATUS_LABELS.keys())


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
        return " • ".join(str(item.get("msg", item)) if isinstance(item, dict) else str(item) for item in detail)
    return str(detail or exc)


def login_panel() -> None:
    with st.sidebar:
        st.markdown("---")
        st.subheader("دخول الأدمن")
        if st.session_state.get("admin"):
            st.success(f"مسجّل كـ **{st.session_state.admin}**")
            if st.button("تسجيل الخروج", width="stretch"):
                st.session_state.admin = ""
                st.rerun()
            return

        with st.form("admin_login"):
            username = st.text_input("اسم المستخدم", value="admin")
            password = st.text_input("كلمة المرور", type="password")
            if st.form_submit_button("دخول", width="stretch"):
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


def store_page() -> None:
    with session_scope() as db:
        config = store_config.get_config(db)
        currency = config["store_currency"]

        st.title(config["store_name"])
        st.caption(config["store_tagline"])

        category_rows = (
            db.query(models.Category)
            .filter(models.Category.is_active.is_(True))
            .order_by(models.Category.sort_order, models.Category.id)
            .all()
        )
        names = ["الكل"] + [row.name for row in category_rows]
        selected = st.selectbox("القسم", names)
        search = st.text_input("ابحث عن منتج")

        query = db.query(models.Product).filter(models.Product.is_active.is_(True))
        if selected != "الكل":
            query = query.filter(models.Product.category_id == next(
                (row.id for row in category_rows if row.name == selected), -1
            ))
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
                    st.write(f"{product.price} {currency}")
                    st.caption("متوفر" if product.stock > 0 else "نفد المخزون")
                    if product.stock > 0:
                        if st.button("أضف للسلة", key=f"add_{product.id}", width="stretch"):
                            if "cart" not in st.session_state:
                                st.session_state.cart = {}
                            cart = st.session_state.cart
                            cart[product.id] = min(cart.get(product.id, 0) + 1, product.stock)
                            st.toast("اتضاف للسلة 🛒")


def cart_page() -> None:
    st.title("السلة")
    cart: dict[int, int] = st.session_state.get("cart", {})

    with session_scope() as db:
        config = store_config.get_config(db)
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

        st.markdown("---")
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
                if st.button("حذف", key=f"remove_{product_id}"):
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
            submit = st.form_submit_button("تأكيد الطلب", width="stretch")

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
    if not st.session_state.get("admin"):
        st.warning("سجّل الدخول من الشريط الجانبي أولًا.")
        return

    st.title("الطلبات")
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
            if st.button("حفظ الحالة", key=f"save_{order.id}", width="stretch"):
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
    if not st.session_state.get("admin"):
        st.warning("سجّل الدخول من الشريط الجانبي أولًا.")
        return

    st.title("إعدادات المتجر")
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

    with st.form("store_settings"):
        values = {}
        for label, key in fields:
            values[key] = st.text_input(label, value=str(config.get(key) or ""))
        if st.form_submit_button("حفظ الإعدادات", width="stretch"):
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

    login_panel()
    page = st.sidebar.radio("القائمة", ["المتجر", "السلة", "الطلبات", "الإعدادات"])
    st.sidebar.caption("البيانات محفوظة داخل Streamlit وقد تُعاد للافتراضي بعد إعادة النشر.")

    if page == "المتجر":
        store_page()
    elif page == "السلة":
        cart_page()
    elif page == "الطلبات":
        orders_page()
    else:
        settings_page()


if __name__ == "__main__":
    main()
