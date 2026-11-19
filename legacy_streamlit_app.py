"""لوحة التحكم القديمة (Streamlit) — مهملة.

هذا الملف محفوظ كمرجع تاريخي فقط. لوحة التحكم الحالية مدمجة في تطبيق FastAPI
على المسار /admin وتعمل عبر static/admin.html و static/js/admin.js.

لا تستخدم هذا الملف: نقاط النهاية القديمة (/products/ و/categories/ و/orders/)
لم تعد موجودة في الـ Backend الحالي.
"""

import streamlit as st
import requests

from settings import PORT

# عنوان الـ Backend بتاعنا
BASE_URL = f"http://127.0.0.1:{PORT}"

st.set_page_config(page_title="لوحة تحكم المتجر الإلكتروني", layout="wide")

st.title("🛒 إدارة المتجر الإلكتروني (Admin Dashboard)")
st.sidebar.title("القائمة الرئيسية")

# القائمة الجانبية للتنقل
menu = st.sidebar.radio("اختر الصفحة:", ["عرض المنتجات", "إضافة قسم جديد", "إضافة منتج جديد", "عرض الطلبات"])

# 1. عرض المنتجات
if menu == "عرض المنتجات":
    st.header("📦 المنتجات المتاحة في المتجر")
    try:
        response = requests.get(f"{BASE_URL}/products/")
        if response.status_code == 200:
            products = response.json()
            if not products:
                st.info("لا توجد منتجات مضافة حتى الآن.")
            else:
                for p in products:
                    with st.container():
                        col1, col2, col3 = st.columns([2, 4, 2])
                        with col1:
                            if p.get("image_url"):
                                st.image(p["image_url"], width=150)
                            else:
                                st.write("🖼️ بدون صورة")
                        with col2:
                            st.subheader(p["name"])
                            st.write(f"**الوصف:** {p.get('description', 'لا يوجد وصف')}")
                            st.write(f"**السعر:** ${p['price']}")
                        with col3:
                            st.write(f"**المخزون:** {p['stock']}")
                            st.write(f"**رقم القسم:** {p['category_id']}")
                        st.divider()
        else:
            st.error("فشل الاتصال بالخادم لجلب المنتجات.")
    except Exception as e:
        st.error(f"تعذر الاتصال بالخادم تأكد أن الـ Backend يعمل: {e}")

# 2. إضافة قسم جديد
elif menu == "إضافة قسم جديد":
    st.header("📂 إضافة قسم جديد")
    with st.form("category_form"):
        cat_name = st.text_input("اسم القسم")
        submit_cat = st.form_submit_button("حفظ القسم")
        
        if submit_cat:
            if cat_name:
                try:
                    res = requests.post(f"{BASE_URL}/categories/", json={"name": cat_name})
                    if res.status_code == 201:
                        st.success("تم إضافة القسم بنجاح! 🎉")
                    else:
                        # قراءة الخطأ بأمان سواء كان JSON أو نص
                        try:
                            err_msg = res.json().get('detail', 'حدث خطأ ما')
                        except:
                            err_msg = res.text or "حدث خطأ غير معروف"
                        st.error(f"خطأ: {err_msg}")
                except Exception as e:
                    st.error(f"فشل الاتصال بالخادم: {e}")
            else:
                st.warning("يرجى إدخال اسم القسم.")

# 3. إضافة منتج جديد
elif menu == "إضافة منتج جديد":
    st.header("➕ إضافة منتج جديد")
    
    try:
        cat_res = requests.get(f"{BASE_URL}/categories/")
        categories = cat_res.json() if cat_res.status_code == 200 else []
        cat_dict = {c["name"]: c["id"] for c in categories}
    except:
        cat_dict = {}

    if not cat_dict:
        st.warning("⚠️ يجب إضافة أقسام أولاً قبل إضافة المنتجات! (أو تأكد من تشغيل السيرفر)")
    else:
        with st.form("product_form"):
            name = st.text_input("اسم المنتج")
            description = st.text_area("وصف المنتج")
            price = st.number_input("السعر ($)", min_value=0.0, step=0.5)
            stock = st.number_input("الكمية في المخزون", min_value=0, step=1)
            image_url = st.text_input("رابط الصورة (Image URL)")
            
            selected_cat_name = st.selectbox("القسم", options=list(cat_dict.keys()))
            
            submit_prod = st.form_submit_button("إضافة المنتج")
            
            if submit_prod:
                prod_data = {
                    "name": name,
                    "description": description,
                    "price": price,
                    "stock": int(stock),
                    "image_url": image_url,
                    "category_id": cat_dict[selected_cat_name]
                }
                try:
                    res = requests.post(f"{BASE_URL}/products/", json=prod_data)
                    if res.status_code == 201:
                        st.success("تم إضافة المنتج بنجاح! 🚀")
                    else:
                        try:
                            err_msg = res.json().get('detail', res.text)
                        except:
                            err_msg = res.text
                        st.error(f"خطأ أثناء الإضافة: {err_msg}")
                except Exception as e:
                    st.error(f"فشل الاتصال بالخادم: {e}")

# 4. عرض الطلبات
elif menu == "عرض الطلبات":
    st.header("📋 طلبات العملاء الواردة")
    try:
        res = requests.get(f"{BASE_URL}/orders/")
        if res.status_code == 200:
            orders = res.json()
            if not orders:
                st.info("لا توجد طلبات حتى الآن.")
            else:
                for o in orders:
                    with st.expander(f"طلب رقم #{o['id']} - العميل: {o['customer_name']} (الإجمالي: ${o['total_amount']})"):
                        st.write(f"📞 **رقم الهاتف:** {o['customer_phone']}")
                        st.write(f"📍 **عنوان الشحن:** {o['shipping_address']}")
                        st.write(f"📌 **حالة الطلب:** {o['status']}")
                        st.write(f"🕒 **تاريخ الطلب:** {o['created_at']}")
                        st.markdown("---")
                        st.write("**المنتجات المطلوبة:**")
                        for item in o['items']:
                            st.write(f"- منتج ID: {item['product_id']} | الكمية: {item['quantity']} | السعر وقت الشراء: ${item['price']}")
        else:
            st.error("فشل جلب الطلبات من الخادم.")
    except Exception as e:
        st.error(f"فشل الاتصال بالخادم: {e}")