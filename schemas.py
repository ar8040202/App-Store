"""نماذج التحقق والاستجابة (Pydantic v2)."""
import re
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

PHONE_RE = re.compile(r"^01[0125][0-9]{8}$")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- Categories ----------
class CategoryBase(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    image_url: Optional[str] = Field(default=None, max_length=500)
    sort_order: int = 0
    is_active: bool = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    image_url: Optional[str] = Field(default=None, max_length=500)
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class CategoryOut(ORMModel, CategoryBase):
    id: int
    slug: str


# ---------- Products ----------
class ColorOption(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    hex: str = Field(default="#1f3d33", max_length=20)


class ProductBase(BaseModel):
    name: str = Field(min_length=2, max_length=180)
    description: Optional[str] = None
    details: Optional[str] = None
    price: float = Field(gt=0)
    compare_at_price: Optional[float] = Field(default=None, gt=0)
    stock: int = Field(default=0, ge=0)
    image_url: Optional[str] = Field(default=None, max_length=500)
    gallery: list[str] = Field(default_factory=list)
    sizes: list[str] = Field(default_factory=list)
    colors: list[ColorOption] = Field(default_factory=list)
    category_id: Optional[int] = None
    is_active: bool = True
    is_featured: bool = False
    rating: float = Field(default=4.8, ge=0, le=5)
    reviews_count: int = Field(default=0, ge=0)


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=180)
    description: Optional[str] = None
    details: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    compare_at_price: Optional[float] = Field(default=None, gt=0)
    stock: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = Field(default=None, max_length=500)
    gallery: Optional[list[str]] = None
    sizes: Optional[list[str]] = None
    colors: Optional[list[ColorOption]] = None
    category_id: Optional[int] = None
    is_active: Optional[bool] = None
    is_featured: Optional[bool] = None
    rating: Optional[float] = Field(default=None, ge=0, le=5)
    reviews_count: Optional[int] = Field(default=None, ge=0)


class ProductOut(ORMModel, ProductBase):
    id: int
    slug: str
    created_at: datetime
    category: Optional[CategoryOut] = None


class ProductPage(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int
    pages: int


# ---------- Orders ----------
class OrderItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=50)
    size: Optional[str] = Field(default=None, max_length=40)
    color: Optional[str] = Field(default=None, max_length=60)


class OrderCreate(BaseModel):
    customer_name: str = Field(min_length=3, max_length=120)
    customer_phone: str
    governorate: str = Field(min_length=2, max_length=60)
    city: str = Field(min_length=2, max_length=120)
    address: str = Field(min_length=8, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=500)
    payment_method: str = Field(default="cod", min_length=2, max_length=40)
    items: list[OrderItemIn] = Field(min_length=1)

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        value = value.strip()
        if not PHONE_RE.match(value):
            raise ValueError("رقم الهاتف غير صحيح، مثال: 01012345678")
        return value

    @field_validator("customer_name", "city", "address")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class OrderItemOut(ORMModel):
    id: int
    product_id: Optional[int] = None
    product_name: str
    image_url: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    unit_price: float
    quantity: int
    line_total: float


class OrderOut(ORMModel):
    id: int
    order_number: str
    customer_name: str
    customer_phone: str
    governorate: str
    city: str
    address: str
    notes: Optional[str] = None
    payment_method: str
    payment_status: str
    subtotal: float
    shipping_fee: float
    total: float
    status: str
    stock_restored: bool = False
    created_at: datetime
    items: list[OrderItemOut] = []


class TrackOut(BaseModel):
    order_number: str
    status: str
    payment_status: str
    payment_method: str
    total: float
    created_at: datetime
    items: list[OrderItemOut]


class OrderPage(BaseModel):
    items: list[OrderOut]
    total: int
    page: int
    page_size: int
    pages: int


class OrderStatusUpdate(BaseModel):
    status: Optional[Literal[
        "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"
    ]] = None
    payment_status: Optional[Literal["pending", "paid", "refunded"]] = None


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str = Field(min_length=2, max_length=60)
    password: str = Field(min_length=4, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    display_name: str


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=4)
    new_password: str = Field(min_length=8, max_length=200)


class AdminMe(BaseModel):
    id: int
    username: str
    display_name: str


# ---------- Stats ----------
class StatPoint(BaseModel):
    date: str
    orders: int
    revenue: float


class DashboardStats(BaseModel):
    revenue: float
    orders_total: int
    orders_pending: int
    orders_today: int
    products_total: int
    products_low_stock: int
    customers_total: int
    avg_order_value: float
    sales_last_7_days: list[StatPoint]
    recent_orders: list[OrderOut]
    low_stock_products: list[dict]
    top_products: list[dict]


class UploadOut(BaseModel):
    url: str
    filename: str


# ---------- Store settings ----------
class StoreSettingsOut(BaseModel):
    name: str
    name_en: str
    tagline: str
    currency: str
    free_shipping_enabled: bool
    free_shipping_threshold: float
    default_shipping_fee: float
    instapay_handle: str
    wallet_number: str
    contact_phone: str
    contact_email: str
    store_address: str
    working_hours: str
    instagram_url: str
    facebook_url: str
    whatsapp_number: str


class StoreSettingsUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=80)
    name_en: Optional[str] = Field(default=None, max_length=80)
    tagline: Optional[str] = Field(default=None, max_length=200)
    currency: Optional[str] = Field(default=None, min_length=1, max_length=20)
    free_shipping_enabled: Optional[bool] = None
    free_shipping_threshold: Optional[float] = Field(default=None, ge=0)
    default_shipping_fee: Optional[float] = Field(default=None, ge=0)
    instapay_handle: Optional[str] = Field(default=None, max_length=120)
    wallet_number: Optional[str] = Field(default=None, max_length=60)
    contact_phone: Optional[str] = Field(default=None, max_length=60)
    contact_email: Optional[str] = Field(default=None, max_length=160)
    store_address: Optional[str] = Field(default=None, max_length=200)
    working_hours: Optional[str] = Field(default=None, max_length=200)
    instagram_url: Optional[str] = Field(default=None, max_length=300)
    facebook_url: Optional[str] = Field(default=None, max_length=300)
    whatsapp_number: Optional[str] = Field(default=None, max_length=60)


# ---------- Shipping governorates ----------
class GovernorateOut(ORMModel):
    id: int
    name: str
    fee: float
    is_active: bool
    sort_order: int


class GovernorateCreate(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    fee: float = Field(default=0, ge=0)
    is_active: bool = True
    sort_order: int = 0


class GovernorateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=60)
    fee: Optional[float] = Field(default=None, ge=0)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class ShippingTableOut(BaseModel):
    free_shipping_enabled: bool
    free_shipping_threshold: float
    default_shipping_fee: float
    governorates: list[GovernorateOut]


# ---------- Payment methods ----------
class PaymentMethodOut(ORMModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    icon: str
    is_active: bool
    sort_order: int


class PaymentMethodCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=300)
    icon: str = Field(default="creditCard", max_length=30)
    is_active: bool = True
    sort_order: int = 0


class PaymentMethodUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=300)
    icon: Optional[str] = Field(default=None, max_length=30)
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


class MessageOut(BaseModel):
    message: str
