"""On-device start confirmation for primary-age learner accounts.

Built-in bands 6–8 and 9–12 cover the product's primary ages (about 5–12).
Band 13–15 is above that range and does not require a fresh confirmation.

This is a sitting confirmation, not a second login. The parent is holding the
device and taps once. A guardian account can record the same confirmation
through the existing restrictions permission. A lock the child cannot press
themselves is left for a later pass.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
from typing import Any

from deeptutor.services.file_io import atomic_write_text

PRIMARY_AGE_BANDS = frozenset({"6-8", "9-12"})
CONFIRMATION_HOURS = 12
_DIR_NAME = "session_starts"


def requires_start_confirmation(age_band: str | None) -> bool:
    return str(age_band or "").strip() in PRIMARY_AGE_BANDS


def _path(user_id: str):
    # Resolved at call time so tests that redirect ``paths.SYSTEM_ROOT`` are honored.
    from .paths import SYSTEM_ROOT, ensure_system_dirs

    ensure_system_dirs()
    directory = SYSTEM_ROOT / _DIR_NAME
    directory.mkdir(parents=True, exist_ok=True)
    return directory / f"{user_id}.json"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _read(user_id: str) -> dict[str, Any] | None:
    path = _path(user_id)
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


def confirmation_fresh(user_id: str, *, now: datetime | None = None) -> bool:
    record = _read(user_id)
    if not record:
        return False
    raw = str(record.get("expires_at") or "")
    try:
        expires = datetime.fromisoformat(raw)
    except ValueError:
        return False
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    moment = now or _now()
    return expires > moment


def confirm_session_start(user_id: str, *, actor_id: str) -> dict[str, Any]:
    moment = _now()
    record = {
        "user_id": user_id,
        "actor_id": actor_id,
        "confirmed_at": moment.isoformat(),
        "expires_at": (moment + timedelta(hours=CONFIRMATION_HOURS)).isoformat(),
    }
    atomic_write_text(_path(user_id), json.dumps(record, ensure_ascii=False, indent=2) + "\n")
    return record


def session_start_status(user_id: str, policy: dict[str, Any] | None) -> dict[str, Any]:
    required = bool(policy) and requires_start_confirmation(
        str((policy or {}).get("age_band") or "")
    )
    return {
        "required": required,
        "confirmed": (not required) or confirmation_fresh(user_id),
    }


def assert_session_start_allowed(
    policy: dict[str, Any] | None,
    *,
    session_has_user_message: bool,
    user_id: str,
) -> None:
    """Block the first turn of a sitting until a parent has confirmed."""
    if not policy or session_has_user_message:
        return
    if not requires_start_confirmation(str(policy.get("age_band") or "")):
        return
    if confirmation_fresh(user_id):
        return
    raise PermissionError("请家长确认后再开始这一次。")


__all__ = [
    "PRIMARY_AGE_BANDS",
    "assert_session_start_allowed",
    "confirm_session_start",
    "confirmation_fresh",
    "requires_start_confirmation",
    "session_start_status",
]
