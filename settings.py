"""إعدادات المتجر العامة.

يمكن تعديل القيم الحساسة عبر متغيرات البيئة قبل التشغيل:
    SECRET_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, HOST, PORT
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
IMG_DIR = STATIC_DIR / "img"
UPLOAD_DIR = STATIC_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

STORE_NAME = "EMO STORE"
STORE_NAME_EN = "EMO STORE"
STORE_TAGLINE = "قطع مختارة بعناية، لتفاصيل تستحقها"
CURRENCY = "ج.م"
STORE_TIMEZONE = os.getenv("STORE_TIMEZONE", "Africa/Cairo")

# منفذ التشغيل: غيّر الرقم هنا مرة واحدة، أو عيّن متغير البيئة PORT.
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", "8050"))

SECRET_KEY = os.getenv(
    "SECRET_KEY",
    "aseel-store-dev-secret-change-me-9f2c1a7b4e8d",
)
TOKEN_TTL_HOURS = int(os.getenv("TOKEN_TTL_HOURS", "12"))

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

# الشحن
FREE_SHIPPING_THRESHOLD = 1500.0
DEFAULT_SHIPPING_FEE = 60.0

GOVERNORATES: dict[str, float] = {
    "القاهرة": 50,
    "الجيزة": 50,
    "القليوبية": 60,
    "الإسكندرية": 60,
    "الدقهلية": 65,
    "الشرقية": 65,
    "الغربية": 65,
    "المنوفية": 65,
    "البحيرة": 65,
    "كفر الشيخ": 70,
    "دمياط": 70,
    "بورسعيد": 70,
    "الإسماعيلية": 70,
    "السويس": 70,
    "الفيوم": 75,
    "بني سويف": 75,
    "المنيا": 80,
    "أسيوط": 80,
    "سوهاج": 85,
    "قنا": 90,
    "الأقصر": 90,
    "أسوان": 100,
    "البحر الأحمر": 100,
    "مطروح": 100,
    "شمال سيناء": 110,
    "جنوب سيناء": 110,
    "الوادي الجديد": 110,
}

PAYMENT_METHODS = [
    {
        "code": "cod",
        "name": "الدفع عند الاستلام",
        "description": "ادفع نقدًا لمندوب الشحن عند وصول الطلب.",
        "icon": "cash",
        "sort_order": 1,
    },
    {
        "code": "instapay",
        "name": "إنستاباي",
        "description": "حوّل المبلغ على حساب المتجر ثم أرسل صورة التحويل.",
        "icon": "creditCard",
        "sort_order": 2,
    },
    {
        "code": "wallet",
        "name": "محفظة إلكترونية",
        "description": "فودافون كاش أو غيرها من المحافظ الإلكترونية.",
        "icon": "wallet",
        "sort_order": 3,
    },
]

INSTAPAY_HANDLE = "aseel.store@instapay"
WALLET_NUMBER = "0100 000 0000"

# بيانات التواصل والروابط اللي تظهر في الفوتر (قابلة للتعديل من لوحة التحكم)
CONTACT_PHONE = "+20 100 000 0000"
CONTACT_EMAIL = "hello@aseel.store"
STORE_ADDRESS = "القاهرة، مصر"
WORKING_HOURS = "السبت – الخميس: 10 ص – 8 م"
INSTAGRAM_URL = "https://instagram.com/aseel.store"
FACEBOOK_URL = "https://facebook.com/aseel.store"
WHATSAPP_NUMBER = "+20 100 000 0000"

ORDER_STATUSES = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
]

ORDER_STATUS_LABELS = {
    "pending": "قيد المراجعة",
    "confirmed": "تم التأكيد",
    "processing": "قيد التجهيز",
    "shipped": "تم الشحن",
    "delivered": "تم التسليم",
    "cancelled": "ملغي",
}

PAYMENT_STATUSES = ["pending", "paid", "refunded"]
