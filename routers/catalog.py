from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

import models
import schemas
import store_config
from database import get_db
from settings import ORDER_STATUS_LABELS, STORE_TIMEZONE

router = APIRouter(prefix="/api", tags=["catalog"])


@router.get("/store-info")
def store_info(db: Session = Depends(get_db)):
    config = store_config.get_config(db)
    return {
        "name": config["store_name"],
        "name_en": config["store_name_en"],
        "tagline": config["store_tagline"],
        "currency": config["store_currency"],
        "timezone": STORE_TIMEZONE,
        "free_shipping_enabled": config["free_shipping_enabled"],
        "free_shipping_threshold": config["free_shipping_threshold"],
        "default_shipping_fee": config["default_shipping_fee"],
        "governorates": store_config.public_governorates(db),
        "payment_methods": store_config.public_payment_methods(db),
        "instapay_handle": config["instapay_handle"],
        "wallet_number": config["wallet_number"],
        "contact_phone": config["contact_phone"],
        "contact_email": config["contact_email"],
        "store_address": config["store_address"],
        "working_hours": config["working_hours"],
        "instagram_url": config["instagram_url"],
        "facebook_url": config["facebook_url"],
        "whatsapp_number": config["whatsapp_number"],
        "order_status_labels": ORDER_STATUS_LABELS,
    }


@router.get("/categories", response_model=list[schemas.CategoryOut])
def list_categories(db: Session = Depends(get_db)):
    return (
        db.query(models.Category)
        .filter(models.Category.is_active.is_(True))
        .order_by(models.Category.sort_order, models.Category.id)
        .all()
    )


@router.get("/products", response_model=schemas.ProductPage)
def list_products(
    q: str | None = Query(default=None, max_length=100),
    category: str | None = Query(default=None, max_length=120),
    featured: bool | None = None,
    in_stock: bool | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    sort: str = Query(default="newest"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=48),
    db: Session = Depends(get_db),
):
    query = (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(models.Product.is_active.is_(True))
    )

    if q:
        term = f"%{q.strip()}%"
        query = query.filter(
            or_(
                models.Product.name.ilike(term),
                models.Product.description.ilike(term),
            )
        )

    if category:
        query = query.join(models.Category).filter(models.Category.slug == category)

    if featured is not None:
        query = query.filter(models.Product.is_featured.is_(featured))

    if in_stock:
        query = query.filter(models.Product.stock > 0)

    if min_price is not None:
        query = query.filter(models.Product.price >= min_price)

    if max_price is not None:
        query = query.filter(models.Product.price <= max_price)

    order_map = {
        "newest": models.Product.created_at.desc(),
        "oldest": models.Product.created_at.asc(),
        "price_asc": models.Product.price.asc(),
        "price_desc": models.Product.price.desc(),
        "rating": models.Product.rating.desc(),
        "name": models.Product.name.asc(),
    }
    query = query.order_by(order_map.get(sort, order_map["newest"]))

    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    pages = max(1, (total + page_size - 1) // page_size)

    return schemas.ProductPage(
        items=items, total=total, page=page, page_size=page_size, pages=pages
    )


@router.get("/products/{slug}", response_model=schemas.ProductOut)
def get_product(slug: str, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(models.Product.slug == slug, models.Product.is_active.is_(True))
        .first()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")
    return product


@router.get("/products/{slug}/related", response_model=list[schemas.ProductOut])
def related_products(slug: str, db: Session = Depends(get_db)):
    product = (
        db.query(models.Product)
        .filter(models.Product.slug == slug, models.Product.is_active.is_(True))
        .first()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="المنتج غير موجود")

    query = (
        db.query(models.Product)
        .options(joinedload(models.Product.category))
        .filter(
            models.Product.is_active.is_(True),
            models.Product.id != product.id,
        )
    )
    if product.category_id:
        query = query.filter(models.Product.category_id == product.category_id)

    items = query.order_by(models.Product.rating.desc()).limit(4).all()

    if len(items) < 4:
        fallback = (
            db.query(models.Product)
            .options(joinedload(models.Product.category))
            .filter(
                models.Product.is_active.is_(True),
                models.Product.id != product.id,
                models.Product.id.notin_([item.id for item in items]),
            )
            .order_by(models.Product.created_at.desc())
            .limit(4 - len(items))
            .all()
        )
        items.extend(fallback)

    return items
