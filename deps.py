from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import models
from database import get_db
from security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.AdminUser:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="الجلسة منتهية أو غير صالحة، يرجى تسجيل الدخول مرة أخرى",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise unauthorized

    admin = (
        db.query(models.AdminUser)
        .filter(models.AdminUser.username == payload.get("sub"))
        .first()
    )
    if admin is None:
        raise unauthorized
    return admin
