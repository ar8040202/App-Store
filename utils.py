"""أدوات مساعدة عامة."""
import re
import secrets
import unicodedata
from datetime import datetime

from sqlalchemy.orm import Session


def slugify(value: str) -> str:
    """توليد slug يدعم الحروف العربية والإنجليزية."""
    value = unicodedata.normalize("NFKC", value or "").strip().lower()
    value = re.sub(r"[\u064B-\u0652\u0670]", "", value)  # إزالة التشكيل
    value = re.sub(r"[^\w\u0600-\u06FF]+", "-", value, flags=re.UNICODE)
    value = value.replace("_", "-")
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value or "item"


def unique_slug(
    db: Session,
    model,
    value: str,
    *,
    exclude_id: int | None = None,
) -> str:
    base = slugify(value)
    candidate = base
    counter = 2
    while True:
        query = db.query(model).filter(model.slug == candidate)
        if exclude_id is not None:
            query = query.filter(model.id != exclude_id)
        if query.first() is None:
            return candidate
        candidate = f"{base}-{counter}"
        counter += 1


def generate_order_number(db: Session, model) -> str:
    prefix = datetime.now().strftime("ASL-%y%m%d")
    while True:
        candidate = f"{prefix}-{secrets.randbelow(9000) + 1000}"
        if db.query(model).filter(model.order_number == candidate).first() is None:
            return candidate
