"""إعدادات المتجر القابلة للتعديل من لوحة التحكم.

القيم الافتراضية تأتي من `settings.py`، وأي تعديل من لوحة التحكم يُحفظ
في جدول `settings` بقاعدة البيانات، فيبقى بعد إعادة تشغيل الخادم.
"""
import json

from sqlalchemy.orm import Session

import models
from settings import (
    CONTACT_EMAIL,
    CONTACT_PHONE,
    CURRENCY,
    DEFAULT_SHIPPING_FEE,
    FACEBOOK_URL,
    FREE_SHIPPING_THRESHOLD,
    GOVERNORATES,
    INSTAGRAM_URL,
    INSTAPAY_HANDLE,
    PAYMENT_METHODS,
    STORE_ADDRESS,
    STORE_NAME,
    STORE_NAME_EN,
    STORE_TAGLINE,
    WALLET_NUMBER,
    WHATSAPP_NUMBER,
    WORKING_HOURS,
)

DEFAULTS: dict[str, object] = {
    "store_name": STORE_NAME,
    "store_name_en": STORE_NAME_EN,
    "store_tagline": STORE_TAGLINE,
    "store_currency": CURRENCY,
    "free_shipping_enabled": True,
    "free_shipping_threshold": FREE_SHIPPING_THRESHOLD,
    "default_shipping_fee": DEFAULT_SHIPPING_FEE,
    "instapay_handle": INSTAPAY_HANDLE,
    "wallet_number": WALLET_NUMBER,
    "contact_phone": CONTACT_PHONE,
    "contact_email": CONTACT_EMAIL,
    "store_address": STORE_ADDRESS,
    "working_hours": WORKING_HOURS,
    "instagram_url": INSTAGRAM_URL,
    "facebook_url": FACEBOOK_URL,
    "whatsapp_number": WHATSAPP_NUMBER,
}

BOOL_KEYS = {"free_shipping_enabled"}
FLOAT_KEYS = {"free_shipping_threshold", "default_shipping_fee"}


def _coerce(key: str, value):
    """تحويل القيمة المقروءة من JSON إلى النوع الصحيح."""
    if key in BOOL_KEYS:
        if isinstance(value, str):
            return value.strip().lower() in {"1", "true", "yes", "on"}
        return bool(value)
    if key in FLOAT_KEYS:
        try:
            return max(0.0, float(value))
        except (TypeError, ValueError):
            return float(DEFAULTS[key])
    return str(value or "")


def get_config(db: Session) -> dict:
    """الإعدادات الحالية = الافتراضية + أي تعديلات محفوظة."""
    config = dict(DEFAULTS)
    for row in db.query(models.Setting).all():
        if row.key not in config:
            continue
        try:
            config[row.key] = _coerce(row.key, json.loads(row.value))
        except (TypeError, ValueError, json.JSONDecodeError):
            continue
    return config


def update_config(db: Session, updates: dict) -> dict:
    """حفظ تعديلات الإعدادات. المفاتيح غير المعروفة تُتجاهل."""
    for key, value in updates.items():
        if key not in DEFAULTS or value is None:
            continue
        value = _coerce(key, value)
        row = db.get(models.Setting, key)
        if row is None:
            db.add(models.Setting(key=key, value=json.dumps(value, ensure_ascii=False)))
        else:
            row.value = json.dumps(value, ensure_ascii=False)
    db.commit()
    return get_config(db)


def ensure_defaults(db: Session) -> None:
    """إدخال القيم الافتراضية مرة واحدة عند أول تشغيل."""
    existing = {row.key for row in db.query(models.Setting).all()}
    changed = False
    for key, value in DEFAULTS.items():
        if key not in existing:
            db.add(models.Setting(key=key, value=json.dumps(value, ensure_ascii=False)))
            changed = True
    if changed:
        db.commit()


def ensure_governorates(db: Session) -> None:
    """تعبئة جدول المحافظات من القيم الافتراضية مرة واحدة فقط.

    نستخدم مفتاح `shipping_initialized` حتى لا تعود المحافظات للظهور لو
    قام المدير بحذفها كلها من لوحة التحكم.
    """
    marker = db.get(models.Setting, "shipping_initialized")
    if marker is not None:
        return

    if db.query(models.ShippingGovernorate).count() == 0:
        for index, (name, fee) in enumerate(GOVERNORATES.items(), start=1):
            db.add(
                models.ShippingGovernorate(
                    name=name,
                    fee=float(fee),
                    is_active=True,
                    sort_order=index,
                )
            )

    db.add(models.Setting(key="shipping_initialized", value=json.dumps(True)))
    db.commit()


def ensure_payment_methods(db: Session) -> None:
    """تعبئة طرق الدفع الافتراضية مرة واحدة فقط.

    مفتاح `payments_initialized` يمنع رجوع الطرق المحذوفة تاني لو المدير
    شالها من لوحة التحكم.
    """
    marker = db.get(models.Setting, "payments_initialized")
    if marker is not None:
        return

    if db.query(models.PaymentMethod).count() == 0:
        for index, item in enumerate(PAYMENT_METHODS, start=1):
            db.add(
                models.PaymentMethod(
                    code=item["code"],
                    name=item["name"],
                    description=item.get("description"),
                    icon=item.get("icon", "creditCard"),
                    is_active=True,
                    sort_order=item.get("sort_order", index),
                )
            )

    db.add(models.Setting(key="payments_initialized", value=json.dumps(True)))
    db.commit()


def list_payment_methods(db: Session, active_only: bool = False):
    query = db.query(models.PaymentMethod)
    if active_only:
        query = query.filter(models.PaymentMethod.is_active.is_(True))
    return query.order_by(
        models.PaymentMethod.sort_order,
        models.PaymentMethod.id,
    ).all()


def public_payment_methods(db: Session) -> list[dict]:
    """طرق الدفع المتاحة للعميل بالشكل الذي تستهلكه الواجهة."""
    return [
        {
            "id": item.code,
            "name": item.name,
            "description": item.description or "",
            "icon": item.icon or "creditCard",
        }
        for item in list_payment_methods(db, active_only=True)
    ]


def payment_method_for(db: Session, code: str):
    """طريقة دفع نشطة بالكود، أو None لو غير متاحة."""
    return (
        db.query(models.PaymentMethod)
        .filter(
            models.PaymentMethod.code == code,
            models.PaymentMethod.is_active.is_(True),
        )
        .first()
    )


def list_governorates(db: Session, active_only: bool = False):
    query = db.query(models.ShippingGovernorate)
    if active_only:
        query = query.filter(models.ShippingGovernorate.is_active.is_(True))
    return query.order_by(
        models.ShippingGovernorate.sort_order,
        models.ShippingGovernorate.id,
    ).all()


def public_governorates(db: Session) -> list[dict]:
    """المحافظات المتاح الشحن لها فقط، بالشكل الذي تستهلكه الواجهة."""
    return [
        {"name": item.name, "fee": float(item.fee)}
        for item in list_governorates(db, active_only=True)
    ]


def shipping_fee_for(db: Session, governorate: str, subtotal: float) -> float | None:
    """رسوم الشحن لمحافظة معينة، أو None لو الشحن غير متاح لها."""
    row = (
        db.query(models.ShippingGovernorate)
        .filter(
            models.ShippingGovernorate.name == governorate,
            models.ShippingGovernorate.is_active.is_(True),
        )
        .first()
    )
    if row is None:
        return None

    config = get_config(db)
    threshold = float(config["free_shipping_threshold"])
    if config["free_shipping_enabled"] and subtotal >= threshold:
        return 0.0
    return float(row.fee)
