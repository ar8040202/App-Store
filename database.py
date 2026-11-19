from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

# مسار قاعدة البيانات المحلية (SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///./ecommerce.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def ensure_schema():
    """ترقية قاعدة البيانات الحالية بدون حذف البيانات (SQLite)."""
    if "orders" not in inspect(engine).get_table_names():
        return  # create_all هيعمل الجدول بالأعمدة الجديدة

    columns = {column["name"] for column in inspect(engine).get_columns("orders")}
    if "stock_restored" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE orders ADD COLUMN stock_restored BOOLEAN "
                    "NOT NULL DEFAULT 0"
                )
            )


def get_db():
    """فتح جلسة قاعدة بيانات لكل طلب وإغلاقها بعد الانتهاء."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
