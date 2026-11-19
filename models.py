"""جداول قاعدة البيانات."""
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


def utcnow() -> datetime:
    """وقت UTC بدون منطقة زمنية (متوافق مع SQLite)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(120), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    products = relationship(
        "Product", back_populates="category", passive_deletes=True
    )


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(180), nullable=False)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    details = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    compare_at_price = Column(Float, nullable=True)
    stock = Column(Integer, default=0, nullable=False)
    image_url = Column(String(500), nullable=True)
    gallery = Column(JSON, default=list, nullable=False)
    sizes = Column(JSON, default=list, nullable=False)
    colors = Column(JSON, default=list, nullable=False)
    category_id = Column(
        Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True
    )
    is_active = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    rating = Column(Float, default=4.8)
    reviews_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    category = relationship("Category", back_populates="products")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(40), unique=True, nullable=False, index=True)
    customer_name = Column(String(120), nullable=False)
    customer_phone = Column(String(20), nullable=False, index=True)
    governorate = Column(String(60), nullable=False)
    city = Column(String(120), nullable=False)
    address = Column(Text, nullable=False)
    notes = Column(Text, nullable=True)
    payment_method = Column(String(30), nullable=False, default="cod")
    payment_status = Column(String(20), nullable=False, default="pending")
    subtotal = Column(Float, nullable=False)
    shipping_fee = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String(30), nullable=False, default="pending", index=True)
    stock_restored = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    items = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    product_id = Column(
        Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    product_name = Column(String(180), nullable=False)
    image_url = Column(String(500), nullable=True)
    size = Column(String(40), nullable=True)
    color = Column(String(60), nullable=True)
    unit_price = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    line_total = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(60), unique=True, nullable=False, index=True)
    password_hash = Column(String(300), nullable=False)
    display_name = Column(String(100), default="مدير المتجر")
    created_at = Column(DateTime, default=utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)


class Setting(Base):
    """إعدادات المتجر القابلة للتعديل من لوحة التحكم (مفتاح/قيمة JSON)."""

    __tablename__ = "settings"

    key = Column(String(60), primary_key=True)
    value = Column(Text, nullable=False)


class PaymentMethod(Base):
    """طرق الدفع المتاحة، مع إمكانية إيقاف أي طريقة أو إضافة طرق جديدة."""

    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(40), unique=True, nullable=False, index=True)
    name = Column(String(80), nullable=False)
    description = Column(String(300), nullable=True)
    icon = Column(String(30), default="creditCard", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class ShippingGovernorate(Base):
    """محافظات الشحن مع رسومها وإمكانية إيقاف الشحن لكل محافظة."""

    __tablename__ = "shipping_governorates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(60), unique=True, nullable=False, index=True)
    fee = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0)
