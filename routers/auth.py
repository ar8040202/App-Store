from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from deps import get_current_admin
from security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/admin", tags=["auth"])


@router.post("/login", response_model=schemas.TokenOut)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    admin = (
        db.query(models.AdminUser)
        .filter(models.AdminUser.username == payload.username.strip())
        .first()
    )
    if admin is None or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="اسم المستخدم أو كلمة المرور غير صحيحة",
        )

    admin.last_login = models.utcnow()
    db.commit()

    return schemas.TokenOut(
        access_token=create_access_token(admin.username),
        username=admin.username,
        display_name=admin.display_name or admin.username,
    )


@router.get("/me", response_model=schemas.AdminMe)
def me(admin: models.AdminUser = Depends(get_current_admin)):
    return admin


@router.put("/password", response_model=schemas.MessageOut)
def change_password(
    payload: schemas.PasswordChange,
    admin: models.AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="كلمة المرور الحالية غير صحيحة")

    if payload.current_password == payload.new_password:
        raise HTTPException(
            status_code=400, detail="كلمة المرور الجديدة يجب أن تختلف عن الحالية"
        )

    admin.password_hash = hash_password(payload.new_password)
    db.commit()
    return schemas.MessageOut(message="تم تحديث كلمة المرور بنجاح")
