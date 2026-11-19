from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

import models
import schemas
import store_config
from database import get_db
from utils import generate_order_number

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: schemas.OrderCreate, db: Session = Depends(get_db)):
    governorate = (
        db.query(models.ShippingGovernorate)
        .filter(
            models.ShippingGovernorate.name == payload.governorate,
            models.ShippingGovernorate.is_active.is_(True),
        )
        .first()
    )
    if governorate is None:
        raise HTTPException(
            status_code=400,
            detail="الشحن غير متاح لهذه المحافظة حاليًا",
        )

    if store_config.payment_method_for(db, payload.payment_method) is None:
        raise HTTPException(
            status_code=400,
            detail="طريقة الدفع غير متاحة حاليًا، اختر طريقة أخرى",
        )

    product_ids = {item.product_id for item in payload.items}
    products = {
        product.id: product
        for product in db.query(models.Product)
        .filter(models.Product.id.in_(product_ids))
        .all()
    }

    order_items: list[models.OrderItem] = []
    subtotal = 0.0

    for item in payload.items:
        product = products.get(item.product_id)
        if product is None or not product.is_active:
            raise HTTPException(
                status_code=404,
                detail=f"المنتج رقم {item.product_id} غير متوفر حاليًا",
            )

        if product.stock < item.quantity:
            raise HTTPException(
                status_code=409,
                detail=f"الكمية المطلوبة من «{product.name}» غير متوفرة. المتاح: {product.stock}",
            )

        if item.size and product.sizes and item.size not in product.sizes:
            raise HTTPException(
                status_code=400,
                detail=f"المقاس المطلوب غير متوفر للمنتج «{product.name}»",
            )

        color_names = [
            color.get("name") for color in (product.colors or []) if isinstance(color, dict)
        ]
        if item.color and color_names and item.color not in color_names:
            raise HTTPException(
                status_code=400,
                detail=f"اللون المطلوب غير متوفر للمنتج «{product.name}»",
            )

        line_total = round(product.price * item.quantity, 2)
        subtotal += line_total

        order_items.append(
            models.OrderItem(
                product_id=product.id,
                product_name=product.name,
                image_url=product.image_url,
                size=item.size,
                color=item.color,
                unit_price=product.price,
                quantity=item.quantity,
                line_total=line_total,
            )
        )

    subtotal = round(subtotal, 2)
    shipping_fee = store_config.shipping_fee_for(db, payload.governorate, subtotal)
    if shipping_fee is None:
        raise HTTPException(
            status_code=400,
            detail="الشحن غير متاح لهذه المحافظة حاليًا",
        )
    total = round(subtotal + shipping_fee, 2)

    order = models.Order(
        order_number=generate_order_number(db, models.Order),
        customer_name=payload.customer_name,
        customer_phone=payload.customer_phone,
        governorate=payload.governorate,
        city=payload.city,
        address=payload.address,
        notes=payload.notes,
        payment_method=payload.payment_method,
        payment_status="pending",
        subtotal=subtotal,
        shipping_fee=shipping_fee,
        total=total,
        status="pending",
    )

    db.add(order)
    db.flush()

    for order_item in order_items:
        order_item.order_id = order.id
        db.add(order_item)

    # خصم المخزون بشكل آمن (مع التحقق من التوفر داخل نفس العملية)
    for item in payload.items:
        updated = (
            db.query(models.Product)
            .filter(
                models.Product.id == item.product_id,
                models.Product.stock >= item.quantity,
            )
            .update(
                {models.Product.stock: models.Product.stock - item.quantity},
                synchronize_session=False,
            )
        )
        if not updated:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="نفدت الكمية من أحد المنتجات أثناء إتمام الطلب، يرجى المحاولة مرة أخرى",
            )

    db.commit()

    saved_order = (
        db.query(models.Order)
        .options(selectinload(models.Order.items))
        .filter(models.Order.id == order.id)
        .first()
    )
    return saved_order


@router.get("/track/{order_number}", response_model=schemas.TrackOut)
def track_order(
    order_number: str,
    phone: str = Query(min_length=8, max_length=20),
    db: Session = Depends(get_db),
):
    order = (
        db.query(models.Order)
        .options(selectinload(models.Order.items))
        .filter(models.Order.order_number == order_number.strip().upper())
        .first()
    )
    if order is None or order.customer_phone != phone.strip():
        raise HTTPException(
            status_code=404,
            detail="لا يوجد طلب مطابق لرقم الطلب ورقم الهاتف المدخلين",
        )

    return schemas.TrackOut(
        order_number=order.order_number,
        status=order.status,
        payment_status=order.payment_status,
        payment_method=order.payment_method,
        total=order.total,
        created_at=order.created_at,
        items=order.items,
    )
