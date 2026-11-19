import io
import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from PIL import Image, ImageOps
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload, selectinload

import models
import schemas
import store_config
from database import get_db
from deps import get_current_admin
from settings import STORE_TIMEZONE, UPLOAD_DIR
from utils import unique_slug

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ============================== Dashboard ==============================
@router.get("/stats", response_model=schemas.DashboardStats)
def dashboard_stats(
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    valid_orders = db.query(models.Order).filter(models.Order.status != "cancelled")
    revenue = float(valid_orders.with_entities(func.coalesce(func.sum(models.Order.total), 0)).scalar() or 0)
    orders_total = db.query(models.Order).count()
    orders_pending = (
        db.query(models.Order).filter(models.Order.status == "pending").count()
    )
    # نستخدم توقيت المتجر لحساب بداية اليوم بدلًا من UTC،
    # حتى تتطابق إحصائيات "اليوم" مع تاريخ لوحة التحكم المحلي.
    store_tz = ZoneInfo(STORE_TIMEZONE)
    local_today = datetime.now(store_tz).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    today_start = local_today.astimezone(timezone.utc).replace(tzinfo=None)
    orders_today = (
        db.query(models.Order).filter(models.Order.created_at >= today_start).count()
    )
    products_total = (
        db.query(models.Product).filter(models.Product.is_active.is_(True)).count()
    )
    products_low_stock = (
        db.query(models.Product)
        .filter(models.Product.is_active.is_(True), models.Product.stock <= 5)
        .count()
    )
    customers_total = (
        db.query(func.count(func.distinct(models.Order.customer_phone))).scalar() or 0
    )
    avg_order_value = round(revenue / max(valid_orders.count(), 1), 2)

    sales_last_7_days = []
    for offset in range(6, -1, -1):
        local_day = local_today - timedelta(days=offset)
        day_start = local_day.astimezone(timezone.utc).replace(tzinfo=None)
        day_end = (local_day + timedelta(days=1)).astimezone(timezone.utc).replace(
            tzinfo=None
        )
        day_orders = db.query(models.Order).filter(
            models.Order.created_at >= day_start,
            models.Order.created_at < day_end,
            models.Order.status != "cancelled",
        )
        sales_last_7_days.append(
            schemas.StatPoint(
                date=local_day.strftime("%Y-%m-%d"),
                orders=day_orders.count(),
                revenue=round(
                    float(
                        day_orders.with_entities(
                            func.coalesce(func.sum(models.Order.total), 0)
                        ).scalar()
                        or 0
                    ),
                    2,
                ),
            )
        )

    recent_orders = (
        db.query(models.Order)
        .options(selectinload(models.Order.items))
        .order_by(models.Order.created_at.desc())
        .limit(6)
        .all()
    )

    low_stock_products = [
        {
            "id": product.id,
            "name": product.name,
            "stock": product.stock,
            "image_url": product.image_url,
        }
        for product in db.query(models.Product)
        .filter(models.Product.is_active.is_(True), models.Product.stock <= 5)
        .order_by(models.Product.stock.asc())
        .limit(6)
        .all()
    ]

    top_rows = (
        db.query(
            models.OrderItem.product_name.label("name"),
            models.OrderItem.image_url.label("image_url"),
            func.sum(models.OrderItem.quantity).label("quantity"),
            func.sum(models.OrderItem.line_total).label("revenue"),
        )
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(models.Order.status != "cancelled")
        .group_by(models.OrderItem.product_name, models.OrderItem.image_url)
        .order_by(func.sum(models.OrderItem.quantity).desc())
        .limit(5)
        .all()
    )
    top_products = [
        {
            "name": row.name,
            "image_url": row.image_url,
            "quantity": int(row.quantity or 0),
            "revenue": round(float(row.revenue or 0), 2),
        }
        for row in top_rows
    ]

    return schemas.DashboardStats(
        revenue=round(revenue, 2),
        orders_total=orders_total,
        orders_pending=orders_pending,
        orders_today=orders_today,
        products_total=products_total,
        products_low_stock=products_low_stock,
        customers_total=customers_total,
        avg_order_value=avg_order_value,
        sales_last_7_days=sales_last_7_days,
        recent_orders=recent_orders,
        low_stock_products=low_stock_products,
        top_products=top_products,
    )


# ============================== Orders ==============================
@router.get("/orders", response_model=schemas.OrderPage)
def admin_list_orders(
    q: str | None = Query(default=None, max_length=100),
    status_filter: str | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.Order).options(selectinload(models.Order.items))

    if status_filter:
        query = query.filter(models.Order.status == status_filter)

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.Order.order_number.ilike(term),
                models.Order.customer_name.ilike(term),
                models.Order.customer_phone.ilike(term),
            )
        )

    total = query.count()
    items = (
        query.order_by(models.Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    pages = max(1, (total + page_size - 1) // page_size)

    return schemas.OrderPage(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


@router.get("/orders/{order_id}", response_model=schemas.OrderOut)
def admin_get_order(
    order_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = (
        db.query(models.Order)
        .options(selectinload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")
    return order


@router.patch("/orders/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: int,
    payload: schemas.OrderStatusUpdate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = (
        db.query(models.Order)
        .options(selectinload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="الطلب غير موجود")

    if payload.status:
        new_status = payload.status
        was_cancelled = order.status == "cancelled"
        order.status = new_status

        if new_status == "cancelled":
            # رجوع الكمية للمخزن مرة واحدة فقط لكل أوردر.
            if not order.stock_restored:
                if was_cancelled:
                    # أوردر كان ملغي قبل تفعيل الميزة: اعتبر المخزن مرجّع.
                    order.stock_restored = True
                else:
                    for item in order.items:
                        if item.product_id is None:
                            continue
                        product = db.get(models.Product, item.product_id)
                        if product is not None:
                            product.stock = int(product.stock or 0) + int(
                                item.quantity or 0
                            )
                    order.stock_restored = True

            if order.payment_status == "pending":
                order.payment_status = (
                    "refunded" if order.payment_method != "cod" else "pending"
                )

        if (
            new_status == "delivered"
            and order.payment_method == "cod"
            and order.payment_status == "pending"
        ):
            order.payment_status = "paid"

    if payload.payment_status:
        order.payment_status = payload.payment_status

    db.commit()
    db.refresh(order)
    return order


# ============================== Products ==============================
@router.get("/products", response_model=schemas.ProductPage)
def admin_list_products(
    q: str | None = Query(default=None, max_length=100),
    category_id: int | None = None,
    active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.Product).options(joinedload(models.Product.category))

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(models.Product.name.ilike(term))

    if category_id:
        query = query.filter(models.Product.category_id == category_id)

    if active is not None:
        query = query.filter(models.Product.is_active.is_(active))

    total = query.count()
    items = (
        query.order_by(models.Product.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    pages = max(1, (total + page_size - 1) // page_size)

    return schemas.ProductPage(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


@router.post(
    "/products",
    response_model=schemas.ProductOut,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    payload: schemas.ProductCreate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    data = payload.model_dump()
    if data.get("category_id") and not db.get(models.Category, data["category_id"]):
        raise HTTPException(status_code=400, detail="القسم غير موجود")

    product = models.Product(
        **data,
        slug=unique_slug(db, models.Product, payload.name),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")

    data = payload.model_dump(exclude_unset=True)

    if "category_id" in data and data["category_id"]:
        if not db.get(models.Category, data["category_id"]):
            raise HTTPException(status_code=400, detail="القسم غير موجود")

    if "name" in data and data["name"] and data["name"] != product.name:
        product.slug = unique_slug(
            db, models.Product, data["name"], exclude_id=product.id
        )

    for key, value in data.items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", response_model=schemas.MessageOut)
def delete_product(
    product_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")

    used = (
        db.query(models.OrderItem)
        .filter(models.OrderItem.product_id == product.id)
        .count()
    )
    if used:
        product.is_active = False
        db.commit()
        return schemas.MessageOut(
            message="المنتج مرتبط بطلبات سابقة، تم أرشفته وإخفاؤه من المتجر بدلًا من حذفه"
        )

    db.delete(product)
    db.commit()
    return schemas.MessageOut(message="تم حذف المنتج نهائيًا")


@router.patch("/products/{product_id}/toggle", response_model=schemas.MessageOut)
def toggle_product(
    product_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    product = db.get(models.Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    product.is_active = not product.is_active
    db.commit()
    state = "متاح في المتجر" if product.is_active else "مخفي من المتجر"
    return schemas.MessageOut(message=f"تم تحديث حالة المنتج: {state}")


# ============================== Categories ==============================
@router.get("/categories", response_model=list[schemas.CategoryOut])
def admin_list_categories(
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return (
        db.query(models.Category)
        .order_by(models.Category.sort_order, models.Category.id)
        .all()
    )


@router.post(
    "/categories",
    response_model=schemas.CategoryOut,
    status_code=status.HTTP_201_CREATED,
)
def create_category(
    payload: schemas.CategoryCreate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if db.query(models.Category).filter(models.Category.name == payload.name).first():
        raise HTTPException(status_code=400, detail="يوجد قسم بنفس الاسم بالفعل")

    category = models.Category(
        **payload.model_dump(),
        slug=unique_slug(db, models.Category, payload.name),
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.put("/categories/{category_id}", response_model=schemas.CategoryOut)
def update_category(
    category_id: int,
    payload: schemas.CategoryUpdate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    category = db.get(models.Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="القسم غير موجود")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"] and data["name"] != category.name:
        duplicate = (
            db.query(models.Category)
            .filter(
                models.Category.name == data["name"],
                models.Category.id != category.id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="يوجد قسم بنفس الاسم بالفعل")
        category.slug = unique_slug(
            db, models.Category, data["name"], exclude_id=category.id
        )

    for key, value in data.items():
        setattr(category, key, value)

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", response_model=schemas.MessageOut)
def delete_category(
    category_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    category = db.get(models.Category, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="القسم غير موجود")

    products_count = (
        db.query(models.Product)
        .filter(models.Product.category_id == category.id)
        .count()
    )
    if products_count:
        raise HTTPException(
            status_code=400,
            detail=f"لا يمكن حذف القسم لاحتوائه على {products_count} منتج. انقل المنتجات أو احذفها أولًا",
        )

    db.delete(category)
    db.commit()
    return schemas.MessageOut(message="تم حذف القسم بنجاح")


# ============================== Upload ==============================
@router.post("/upload", response_model=schemas.UploadOut)
async def upload_image(
    file: UploadFile = File(...),
    admin: models.AdminUser = Depends(get_current_admin),
):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(
            status_code=400, detail="صيغة الصورة غير مدعومة (JPG أو PNG أو WEBP فقط)"
        )

    contents = await file.read()
    if len(contents) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="حجم الصورة يجب أن يكون أقل من 8 ميجابايت")

    try:
        image = Image.open(io.BytesIO(contents))
        image = ImageOps.exif_transpose(image)
        if image.mode in {"RGBA", "LA", "P"}:
            background = Image.new("RGB", image.size, (255, 255, 255))
            background.paste(image.convert("RGBA"), mask=image.convert("RGBA").split()[-1])
            image = background
        else:
            image = image.convert("RGB")

        image.thumbnail((1600, 1600))
        filename = f"{uuid.uuid4().hex}.jpg"
        image.save(UPLOAD_DIR / filename, "JPEG", quality=86, optimize=True)
    except Exception:
        raise HTTPException(status_code=400, detail="تعذر قراءة الصورة، تأكد من صحة الملف")

    return schemas.UploadOut(
        url=f"/static/uploads/{filename}",
        filename=filename,
    )


# ============================== Store settings ==============================
SETTING_FIELDS = {
    "name": "store_name",
    "name_en": "store_name_en",
    "tagline": "store_tagline",
    "currency": "store_currency",
    "free_shipping_enabled": "free_shipping_enabled",
    "free_shipping_threshold": "free_shipping_threshold",
    "default_shipping_fee": "default_shipping_fee",
    "instapay_handle": "instapay_handle",
    "wallet_number": "wallet_number",
    "contact_phone": "contact_phone",
    "contact_email": "contact_email",
    "store_address": "store_address",
    "working_hours": "working_hours",
    "instagram_url": "instagram_url",
    "facebook_url": "facebook_url",
    "whatsapp_number": "whatsapp_number",
}


def _settings_payload(config: dict) -> schemas.StoreSettingsOut:
    return schemas.StoreSettingsOut(
        name=config["store_name"],
        name_en=config["store_name_en"],
        tagline=config["store_tagline"],
        currency=config["store_currency"],
        free_shipping_enabled=config["free_shipping_enabled"],
        free_shipping_threshold=config["free_shipping_threshold"],
        default_shipping_fee=config["default_shipping_fee"],
        instapay_handle=config["instapay_handle"],
        wallet_number=config["wallet_number"],
        contact_phone=config["contact_phone"],
        contact_email=config["contact_email"],
        store_address=config["store_address"],
        working_hours=config["working_hours"],
        instagram_url=config["instagram_url"],
        facebook_url=config["facebook_url"],
        whatsapp_number=config["whatsapp_number"],
    )


@router.get("/settings", response_model=schemas.StoreSettingsOut)
def get_store_settings(
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return _settings_payload(store_config.get_config(db))


@router.put("/settings", response_model=schemas.StoreSettingsOut)
def update_store_settings(
    payload: schemas.StoreSettingsUpdate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    data = payload.model_dump(exclude_unset=True)
    updates: dict[str, object] = {}

    for field, key in SETTING_FIELDS.items():
        if field not in data or data[field] is None:
            continue
        value = data[field]
        if isinstance(value, str):
            value = value.strip()
            if field in {"name", "currency"} and not value:
                raise HTTPException(
                    status_code=400,
                    detail="اسم المتجر والعملة لا يمكن تركهما فارغين",
                )
        updates[key] = value

    config = store_config.update_config(db, updates)
    return _settings_payload(config)


# ============================== Shipping ==============================
@router.get("/shipping", response_model=schemas.ShippingTableOut)
def shipping_table(
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    config = store_config.get_config(db)
    return schemas.ShippingTableOut(
        free_shipping_enabled=config["free_shipping_enabled"],
        free_shipping_threshold=config["free_shipping_threshold"],
        default_shipping_fee=config["default_shipping_fee"],
        governorates=store_config.list_governorates(db),
    )


@router.get("/shipping/governorates", response_model=list[schemas.GovernorateOut])
def list_shipping_governorates(
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return store_config.list_governorates(db)


@router.post(
    "/shipping/governorates",
    response_model=schemas.GovernorateOut,
    status_code=status.HTTP_201_CREATED,
)
def create_shipping_governorate(
    payload: schemas.GovernorateCreate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    duplicate = (
        db.query(models.ShippingGovernorate)
        .filter(models.ShippingGovernorate.name == name)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="توجد محافظة بنفس الاسم بالفعل")

    governorate = models.ShippingGovernorate(
        name=name,
        fee=payload.fee,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(governorate)
    db.commit()
    db.refresh(governorate)
    return governorate


@router.put(
    "/shipping/governorates/{governorate_id}",
    response_model=schemas.GovernorateOut,
)
def update_shipping_governorate(
    governorate_id: int,
    payload: schemas.GovernorateUpdate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    governorate = db.get(models.ShippingGovernorate, governorate_id)
    if governorate is None:
        raise HTTPException(status_code=404, detail="المحافظة غير موجودة")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"]:
        name = data["name"].strip()
        duplicate = (
            db.query(models.ShippingGovernorate)
            .filter(
                models.ShippingGovernorate.name == name,
                models.ShippingGovernorate.id != governorate.id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(status_code=400, detail="توجد محافظة بنفس الاسم بالفعل")
        data["name"] = name

    for key, value in data.items():
        setattr(governorate, key, value)

    db.commit()
    db.refresh(governorate)
    return governorate


@router.patch(
    "/shipping/governorates/{governorate_id}/toggle",
    response_model=schemas.MessageOut,
)
def toggle_shipping_governorate(
    governorate_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    governorate = db.get(models.ShippingGovernorate, governorate_id)
    if governorate is None:
        raise HTTPException(status_code=404, detail="المحافظة غير موجودة")

    governorate.is_active = not governorate.is_active
    db.commit()
    state = "متاح للشحن" if governorate.is_active else "موقوف من الشحن"
    return schemas.MessageOut(message=f"تم تحديث «{governorate.name}»: {state}")


@router.delete(
    "/shipping/governorates/{governorate_id}",
    response_model=schemas.MessageOut,
)
def delete_shipping_governorate(
    governorate_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    governorate = db.get(models.ShippingGovernorate, governorate_id)
    if governorate is None:
        raise HTTPException(status_code=404, detail="المحافظة غير موجودة")

    used = (
        db.query(models.Order)
        .filter(models.Order.governorate == governorate.name)
        .count()
    )
    if used:
        governorate.is_active = False
        db.commit()
        return schemas.MessageOut(
            message="المحافظة مرتبطة بطلبات سابقة، تم إيقاف الشحن لها بدلًا من حذفها"
        )

    db.delete(governorate)
    db.commit()
    return schemas.MessageOut(message="تم حذف المحافظة")


# ============================== Payment methods ==============================
PAYMENT_ICONS = {"cash", "creditCard", "wallet", "credit", "phone", "shield", "truck"}


def _active_payment_count(db: Session) -> int:
    return (
        db.query(models.PaymentMethod)
        .filter(models.PaymentMethod.is_active.is_(True))
        .count()
    )


@router.get("/payments", response_model=list[schemas.PaymentMethodOut])
def list_payment_methods(
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return store_config.list_payment_methods(db)


@router.post(
    "/payments",
    response_model=schemas.PaymentMethodOut,
    status_code=status.HTTP_201_CREATED,
)
def create_payment_method(
    payload: schemas.PaymentMethodCreate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="اسم طريقة الدفع مطلوب")

    duplicate = (
        db.query(models.PaymentMethod)
        .filter(models.PaymentMethod.name == name)
        .first()
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="توجد طريقة دفع بنفس الاسم بالفعل")

    if payload.icon not in PAYMENT_ICONS:
        raise HTTPException(status_code=400, detail="أيقونة طريقة الدفع غير معروفة")

    code = f"pm_{uuid.uuid4().hex[:8]}"
    method = models.PaymentMethod(
        code=code,
        name=name,
        description=(payload.description or "").strip() or None,
        icon=payload.icon,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(method)
    db.commit()
    db.refresh(method)
    return method


@router.put("/payments/{method_id}", response_model=schemas.PaymentMethodOut)
def update_payment_method(
    method_id: int,
    payload: schemas.PaymentMethodUpdate,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    method = db.get(models.PaymentMethod, method_id)
    if method is None:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")

    data = payload.model_dump(exclude_unset=True)

    if "name" in data and data["name"]:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="اسم طريقة الدفع مطلوب")
        duplicate = (
            db.query(models.PaymentMethod)
            .filter(
                models.PaymentMethod.name == name,
                models.PaymentMethod.id != method.id,
            )
            .first()
        )
        if duplicate:
            raise HTTPException(
                status_code=400, detail="توجد طريقة دفع بنفس الاسم بالفعل"
            )
        data["name"] = name

    if "description" in data:
        data["description"] = (data["description"] or "").strip() or None

    if "icon" in data and data["icon"] not in PAYMENT_ICONS:
        raise HTTPException(status_code=400, detail="أيقونة طريقة الدفع غير معروفة")

    if (
        data.get("is_active") is False
        and method.is_active
        and _active_payment_count(db) <= 1
    ):
        raise HTTPException(
            status_code=400,
            detail="لازم تفضل طريقة دفع واحدة متاحة على الأقل للعملاء",
        )

    for key, value in data.items():
        setattr(method, key, value)

    db.commit()
    db.refresh(method)
    return method


@router.patch("/payments/{method_id}/toggle", response_model=schemas.MessageOut)
def toggle_payment_method(
    method_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    method = db.get(models.PaymentMethod, method_id)
    if method is None:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")

    if method.is_active and _active_payment_count(db) <= 1:
        raise HTTPException(
            status_code=400,
            detail="لازم تفضل طريقة دفع واحدة متاحة على الأقل للعملاء",
        )

    method.is_active = not method.is_active
    db.commit()
    state = "متاحة للعملاء" if method.is_active else "موقوفة"
    return schemas.MessageOut(message=f"تم تحديث «{method.name}»: {state}")


@router.delete("/payments/{method_id}", response_model=schemas.MessageOut)
def delete_payment_method(
    method_id: int,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    method = db.get(models.PaymentMethod, method_id)
    if method is None:
        raise HTTPException(status_code=404, detail="طريقة الدفع غير موجودة")

    if method.is_active and _active_payment_count(db) <= 1:
        raise HTTPException(
            status_code=400,
            detail="لازم تفضل طريقة دفع واحدة متاحة على الأقل للعملاء",
        )

    used = (
        db.query(models.Order)
        .filter(models.Order.payment_method == method.code)
        .count()
    )
    if used:
        method.is_active = False
        db.commit()
        return schemas.MessageOut(
            message="طريقة الدفع مرتبطة بطلبات سابقة، تم إيقافها بدلًا من حذفها"
        )

    db.delete(method)
    db.commit()
    return schemas.MessageOut(message="تم حذف طريقة الدفع")
