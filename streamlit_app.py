"""واجهة Streamlit للمتجر.

تعمل كـ واجهة أمامية بتتكلم مع الـ FastAPI API الموجود على Render (أو أي رابط تاني).
اربط الرابط من Streamlit Secrets:

    API_BASE_URL = "https://aseel-store.onrender.com"
"""
import os

import requests
import streamlit as st

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
    .stButton>button, .stTextInput>div>input, .stSelectbox>div>div {
        text-align: right;
    }
    .block-container { padding-top: 2rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
STATUS_LABELS = {
    "pending": "قيد المراجعة",
    "confirmed": "تم التأكيد",
    "processing": "قيد التجهيز",
    "shipped": "تم الشحن",
    "delivered": "تم التسليم",
    "cancelled": "ملغي",
}


def api_base() -> str:
    """عنوان الـ Backend من Streamlit Secrets أو متغير البيئة."""
    secret = None
    try:
        secret = st.secrets.get("API_BASE_URL")
    except Exception:
        pass
    return (secret or os.getenv("API_BASE_URL") or "https://aseel-store.onrender.com").rstrip("/")


def image_url(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{api_base()}{path}"


def api(path: str, method: str = "GET", payload: dict | None = None, auth: bool = False):
    headers = {}
    if auth and st.session_state.get("token"):
        headers["Authorization"] = f"Bearer {st.session_state.token}"

    try:
        response = requests.request(
            method,
            f"{api_base()}{path}",
            headers=headers,
            json=payload,
            timeout=60,  # Render المجاني بياخد وقت عشان يصحى
        )
    except requests.exceptions.RequestException as exc:
        st.error(f"تعذر الاتصال بالـ Backend. لو الخدمة نايمة استنى شوية وجرب تاني. ({exc})")
        return None

    if response.status_code == 401:
        st.session_state.token = None
        st.session_state.username = ""
        st.error("انتهت الجلسة، سجّل دخول تاني.")
        return None

    if not response.ok:
        try:
            detail = response.json().get("detail", response.text)
        except Exception:
            detail = response.text
        st.error(detail or "حصل خطأ غير متوقع.")
        return None

    try:
        return response.json()
    except Exception:
        return response.text


def login_panel() -> None:
    with st.sidebar:
        st.markdown("---")
        st.subheader("دخول الأدمن")
        if st.session_state.get("token"):
            st.success(f"مسجّل كـ **{st.session_state.get('username', 'admin')}**")
            if st.button("تسجيل الخروج", use_container_width=True):
                st.session_state.token = None
                st.session_state.username = ""
                st.rerun()
            return

        with st.form("admin_login", clear_on_submit=False):
            username = st.text_input("اسم المستخدم", value="admin")
            password = st.text_input("كلمة المرور", type="password")
            if st.form_submit_button("دخول", use_container_width=True):
                result = api(
                    "/api/admin/login",
                    "POST",
                    {"username": username, "password": password},
                )
                if result and result.get("access_token"):
                    st.session_state.token = result["access_token"]
                    st.session_state.username = result.get("username", username)
                    st.success("تم تسجيل الدخول")
                    st.rerun()


def store_page() -> None:
    info = api("/api/store-info") or {}
    name = info.get("name", "EMO STORE")
    currency = info.get("currency", "ج.م")

    st.title(name)
    st.caption(info.get("tagline", ""))

    col1, col2, col3 = st.columns(3)
    col1.metric("العملة", currency)
    col2.metric("المحافظات", len(info.get("governorates") or []))
    col3.metric("طرق الدفع", len(info.get("payment_methods") or []))

    st.markdown("---")
    st.subheader("المنتجات")
    data = api("/api/products?page=1&page_size=24") or {}
    products = data.get("items") or []
    if not products:
        st.info("لا توجد منتجات لعرضها حاليًا.")
        return

    for start in range(0, len(products), 3):
        columns = st.columns(3)
        for column, product in zip(columns, products[start : start + 3]):
            with column:
                with st.container(border=True):
                    picture = image_url(product.get("image_url"))
                    if picture:
                        st.image(picture, use_container_width=True)
                    st.markdown(f"**{product.get('name', '')}**")
                    st.write(f"{product.get('price', 0)} {currency}")
                    stock = product.get("stock", 0)
                    st.caption("متوفر" if stock and stock > 0 else "نفد المخزون")

    st.caption(f"إجمالي المنتجات: {data.get('total', len(products))}")


def orders_page() -> None:
    st.title("الطلبات")
    selected = st.selectbox(
        "تصفية حسب الحالة",
        ["الكل"] + STATUSES,
        format_func=lambda value: STATUS_LABELS.get(value, value),
    )
    query = "/api/admin/orders?page=1&page_size=50"
    if selected != "الكل":
        query += f"&status={selected}"

    data = api(query, auth=True) or {}
    orders = data.get("items") or []
    if not orders:
        st.info("لا توجد طلبات مطابقة.")
        return

    for order in orders:
        current = order.get("status", "pending")
        label = f"#{order.get('order_number')} — {order.get('customer_name')} — {order.get('total')} {STATUS_LABELS.get(current, current)}"
        with st.expander(label):
            st.write(f"**الهاتف:** {order.get('customer_phone', '')}")
            st.write(f"**العنوان:** {order.get('governorate', '')} / {order.get('city', '')} / {order.get('address', '')}")
            st.write(f"**الدفع:** {order.get('payment_method', '')} — {order.get('payment_status', '')}")
            st.markdown("**المنتجات:**")
            for item in order.get("items") or []:
                st.write(
                    f"- {item.get('product_name', '')} × {item.get('quantity', 0)} "
                    f"= {item.get('line_total', 0)}"
                )

            new_status = st.selectbox(
                "تغيير الحالة",
                STATUSES,
                index=STATUSES.index(current) if current in STATUSES else 0,
                format_func=lambda value: STATUS_LABELS.get(value, value),
                key=f"status_{order['id']}",
            )
            if st.button("حفظ الحالة", key=f"save_{order['id']}", use_container_width=True):
                result = api(
                    f"/api/admin/orders/{order['id']}/status",
                    "PATCH",
                    {"status": new_status},
                    auth=True,
                )
                if result is not None:
                    if new_status == "cancelled":
                        st.success("تم إلغاء الطلب ورجوع الكميات للمخزن.")
                    else:
                        st.success("تم تحديث حالة الطلب.")
                    st.rerun()


def settings_page() -> None:
    st.title("إعدادات المتجر")
    settings = api("/api/admin/settings", auth=True)
    if not settings:
        return

    fields = [
        ("اسم المتجر", "name"),
        ("الاسم بالإنجليزية", "name_en"),
        ("الشعار / الوصف", "tagline"),
        ("العملة", "currency"),
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
            values[key] = st.text_input(label, value=str(settings.get(key) or ""))
        if st.form_submit_button("حفظ الإعدادات", use_container_width=True):
            result = api("/api/admin/settings", "PUT", values, auth=True)
            if result is not None:
                st.success("تم حفظ الإعدادات.")
                st.rerun()


def main() -> None:
    if "token" not in st.session_state:
        st.session_state.token = None
    if "username" not in st.session_state:
        st.session_state.username = ""

    login_panel()

    page = st.sidebar.radio("القائمة", ["المتجر", "الطلبات", "الإعدادات"])
    if page != "المتجر" and not st.session_state.get("token"):
        st.warning("سجّل الدخول من الشريط الجانبي أولًا.")
        return

    if page == "المتجر":
        store_page()
    elif page == "الطلبات":
        orders_page()
    else:
        settings_page()


if __name__ == "__main__":
    main()
