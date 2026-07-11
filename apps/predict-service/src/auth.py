from __future__ import annotations

from typing import Any

import jwt
import structlog
from fastapi import Header, HTTPException

from src.config import settings

log = structlog.get_logger(__name__)


def _public_key() -> str:
    return settings.JWT_PUBLIC_KEY.replace("\\n", "\n")


async def require_auth(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization[len("Bearer "):]
    try:
        return jwt.decode(token, _public_key(), algorithms=["RS256"])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        log.warning("jwt verification failed", error=str(exc))
        raise HTTPException(status_code=401, detail="Invalid token") from exc
