"""نقطة تشغيل متجر EMO STORE (FastAPI)."""
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

import models
from database import Base, SessionLocal, engine, ensure_schema
from routers import admin, auth, catalog, orders
from seed import seed_database
from settings import STATIC_DIR, STORE_NAME

FIELD_LABELS = {
    "customer_name": "الاسم",
    "customer_phone": "رقم الهاتف",
    "governorate": "المحافظة",
    "city": "المدينة",
    "address": "العنوان",
    "notes": "الملاحظات",
    "items": "المنتجات",
    "quantity": "الكمية",
    "name": "الاسم",
    "price": "السعر",
    "stock": "المخزون",
    "password": "كلمة المرور",
    "username": "اسم المستخدم",
    "new_password": "كلمة المرور الجديدة",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=f"{STORE_NAME} Store API",
    version="2.0.0",
    description="واجهة برمجة متجر EMO STORE: منتجات، طلبات، ولوحة تحكم.",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def revalidate_store_assets(request: Request, call_next):
    """منع المتصفح من عرض نسخة قديمة من الواجهة بعد التحديثات."""
    response = await call_next(request)
    if request.url.path.startswith("/static/") or request.url.path in ("/", "/admin"):
        response.headers["Cache-Control"] = "no-cache, must-revalidate"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """تحويل أخطاء التحقق إلى رسالة عربية واضحة للعميل."""
    errors = exc.errors()
    if not errors:
        return JSONResponse(status_code=422, content={"detail": "بيانات غير صحيحة"})

    first = errors[0]
    location = [str(part) for part in first.get("loc", []) if part not in ("body", "query")]
    field = location[-1] if location else ""
    label = FIELD_LABELS.get(field, field)
    message = str(first.get("msg", "قيمة غير صحيحة"))
    message = message.replace("Value error, ", "").replace("String should have", "يجب أن يحتوي على")
    detail = f"{label}: {message}" if label else message
    return JSONResponse(status_code=422, content={"detail": detail})


app.include_router(catalog.router)
app.include_router(orders.router)
app.include_router(auth.router)
app.include_router(admin.router)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "store": STORE_NAME}


@app.get("/", include_in_schema=False)
def storefront():
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/admin", include_in_schema=False)
def admin_dashboard():
    return FileResponse(STATIC_DIR / "admin.html")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse(STATIC_DIR / "img" / "favicon.svg")
