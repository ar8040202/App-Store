"""أدوات الأمان: تشفير كلمات المرور وإصدار/التحقق من توكن الأدمن."""
import base64
import hashlib
import hmac
import json
import secrets
import time

from settings import SECRET_KEY, TOKEN_TTL_HOURS

PBKDF2_ITERATIONS = 260_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS
    )
    return "pbkdf2_sha256${}${}${}".format(
        PBKDF2_ITERATIONS,
        base64.b64encode(salt).decode("ascii"),
        base64.b64encode(digest).decode("ascii"),
    )


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, int(iterations)
        )
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def create_access_token(subject: str) -> str:
    payload = {
        "sub": subject,
        "exp": int(time.time()) + TOKEN_TTL_HOURS * 3600,
    }
    body = _b64encode(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    )
    signature = hmac.new(
        SECRET_KEY.encode("utf-8"), body.encode("ascii"), hashlib.sha256
    ).digest()
    return f"{body}.{_b64encode(signature)}"


def decode_access_token(token: str) -> dict | None:
    try:
        body, signature = token.split(".")
        expected = hmac.new(
            SECRET_KEY.encode("utf-8"), body.encode("ascii"), hashlib.sha256
        ).digest()
        if not hmac.compare_digest(_b64decode(signature), expected):
            return None
        payload = json.loads(_b64decode(body))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except (ValueError, TypeError, json.JSONDecodeError):
        return None
