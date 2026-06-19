"""
Minimal pydantic-compatible BaseModel stub for Python 3.15 where pydantic-core
wheels don't yet exist. Uses typing.get_type_hints() which respects PEP 649 lazy
annotations. Covers just the interface weather-service schemas need.
"""
from __future__ import annotations

import json
import os
from datetime import date, datetime
from typing import Any, Dict, List, Optional, Union, get_type_hints


def _coerce(value: Any, hint: Any) -> Any:
    """Best-effort type coercion: dict → nested model, str → date/datetime."""
    origin = getattr(hint, "__origin__", None)

    if origin is list:
        item_type = hint.__args__[0] if getattr(hint, "__args__", None) else Any
        return [_coerce(v, item_type) for v in (value or [])]

    if origin is Union:  # handles Optional[X]
        args = [a for a in hint.__args__ if a is not type(None)]
        if value is None:
            return None
        return _coerce(value, args[0]) if args else value

    if isinstance(hint, type):
        if issubclass(hint, BaseModel) and isinstance(value, dict):
            return hint(**value)
        if hint is date and isinstance(value, str):
            return date.fromisoformat(value)
        if hint is datetime and isinstance(value, str):
            return datetime.fromisoformat(value)
        if hint is bool and isinstance(value, bool):
            return value
        if hint in (int, float) and isinstance(value, (int, float)):
            return hint(value)

    return value


class BaseModel:
    __model_fields__: Dict[str, Any] = {}  # populated per subclass by __init_subclass__

    def __init_subclass__(cls, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)
        try:
            all_hints = get_type_hints(cls)
            # exclude annotations inherited from BaseModel itself
            base_hints = set(get_type_hints(BaseModel).keys())
            cls.__model_fields__ = {k: v for k, v in all_hints.items() if k not in base_hints}
        except Exception:
            cls.__model_fields__ = {}

    def __init__(self, **data: Any) -> None:
        hints = self.__class__.__model_fields__
        for name, hint in hints.items():
            raw = data.get(name, getattr(self.__class__, name, None))
            setattr(self, name, _coerce(raw, hint))

    # ── pydantic v1 interface ──────────────────────────────────────────────────
    def dict(self) -> dict:
        return {k: getattr(self, k, None) for k in self.__class__.__model_fields__}

    def json(self) -> str:
        def _enc(o: Any) -> Any:
            if isinstance(o, BaseModel):
                return json.loads(o.json())
            if isinstance(o, (date, datetime)):
                return o.isoformat()
            if isinstance(o, list):
                return [_enc(i) for i in o]
            return o

        payload = {k: _enc(getattr(self, k, None)) for k in self.__class__.__model_fields__}
        return json.dumps(payload)

    # ── pydantic v2 interface ──────────────────────────────────────────────────
    def model_dump(self, mode: str = "python") -> dict:
        if mode == "json":
            return json.loads(self.json())
        return self.dict()

    @classmethod
    def model_validate(cls, obj: Any) -> "BaseModel":
        return cls(**obj)

    @classmethod
    def parse_obj(cls, obj: Any) -> "BaseModel":
        return cls(**obj)

    def __eq__(self, other: object) -> bool:
        if type(self) is not type(other):
            return False
        return self.json() == other.json()  # type: ignore[union-attr]

    def __repr__(self) -> str:
        fields = ", ".join(
            f"{k}={getattr(self, k, None)!r}" for k in self.__class__.__model_fields__
        )
        return f"{self.__class__.__name__}({fields})"


class BaseSettings(BaseModel):
    """Reads field defaults from environment variables (env var name = field name)."""

    def __init__(self, **data: Any) -> None:
        hints = self.__class__.__model_fields__
        for name, hint in hints.items():
            env_val = os.getenv(name)
            if env_val is not None:
                setattr(self, name, _coerce(env_val, hint))
            elif name in data:
                setattr(self, name, _coerce(data[name], hint))
            else:
                setattr(self, name, getattr(self.__class__, name, None))

    class Config:
        env_file = ".env"
