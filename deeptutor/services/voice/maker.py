"""Read-aloud for a young maker sitting.

Uses the existing DashScope adapter and ``qwen3-tts-flash`` (the non-realtime
model). Serena (苏瑶) is the shipped Mandarin voice: a gentle young woman.
Cherry (筊悦) is a warmer, brighter alternative a preview operator can try
later. Do not switch this to Chelsie, Bella, Bunny, Nini, Pip, Neil, or any
realtime conversational model.

The DashScope key stays on the server. A catalog connection named DashScope
supplies it when present; otherwise ``DASHSCOPE_API_KEY`` does. Adult TTS
settings are not changed.

Repeated text is cached so 「再听一遍」 does not call the provider again.
"""

from __future__ import annotations

from collections import OrderedDict
import hashlib
import logging
import os
from pathlib import Path
import tempfile
from typing import Any

from deeptutor.services.config.provider_links import resolve_profile_provider
from deeptutor.services.config.provider_runtime import (
    TTS_PROVIDERS,
    _as_str,
    _canonical_voice_provider,
    _load_catalog,
)
from deeptutor.services.voice.adapters import get_tts_adapter
from deeptutor.services.voice.base import strip_markdown_for_speech, synthesize_with_timeout
from deeptutor.services.voice.config import TTSConfig

logger = logging.getLogger(__name__)

MAKER_TTS_MODEL = "qwen3-tts-flash"
MAKER_TTS_VOICE = "Serena"
MAKER_TTS_LANGUAGE = "Chinese"
MAKER_TTS_PUBLIC = "这次没听成，再点一次。"
_CACHE_MAX = 32
_cache: OrderedDict[str, tuple[bytes, str]] = OrderedDict()


def _key_text(value: object) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        for item in value:
            text = _key_text(item)
            if text:
                return text
    return ""


def _dashscope_credentials(catalog: dict[str, Any] | None) -> tuple[str, str]:
    """Key and base URL from a DashScope TTS profile, else the env key."""
    spec = TTS_PROVIDERS["dashscope"]
    base_url = spec.default_api_base
    api_key = ""
    loaded = _load_catalog(catalog)
    profiles = ((loaded.get("services") or {}).get("tts") or {}).get("profiles") or []
    for raw in profiles:
        if not isinstance(raw, dict):
            continue
        profile = resolve_profile_provider(loaded, "tts", raw)
        binding = _canonical_voice_provider(_as_str(profile.get("binding")), TTS_PROVIDERS)
        if binding != "dashscope":
            continue
        found = _key_text(profile.get("api_key"))
        if _as_str(profile.get("base_url")):
            base_url = _as_str(profile.get("base_url"))
        if found:
            api_key = found
            break
    if not api_key:
        api_key = os.environ.get("DASHSCOPE_API_KEY", "").strip()
    return api_key, base_url


def resolve_maker_tts_config(catalog: dict[str, Any] | None = None) -> TTSConfig:
    """Force Qwen flash + Serena. Does not read the active adult TTS model."""
    spec = TTS_PROVIDERS["dashscope"]
    api_key, base_url = _dashscope_credentials(catalog)
    if not api_key:
        raise ValueError("DashScope TTS is not configured.")
    return TTSConfig(
        model=MAKER_TTS_MODEL,
        provider_name="dashscope",
        adapter=spec.adapter,
        auth_style=spec.auth_style,
        api_key=api_key,
        base_url=base_url or spec.default_api_base,
        voice=MAKER_TTS_VOICE,
        response_format="wav",
        language=MAKER_TTS_LANGUAGE,
        sample_rate=24000,
        max_input_chars=600,
        request_timeout=60,
    )


def _cache_key(text: str) -> str:
    material = f"{MAKER_TTS_MODEL}\n{MAKER_TTS_VOICE}\n{MAKER_TTS_LANGUAGE}\n{text}"
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def _disk_dir() -> Path:
    root = Path(tempfile.gettempdir()) / "deeptutor-maker-tts"
    root.mkdir(parents=True, exist_ok=True)
    return root


def _read_disk(key: str) -> tuple[bytes, str] | None:
    audio_path = _disk_dir() / f"{key}.audio"
    type_path = _disk_dir() / f"{key}.type"
    try:
        if not audio_path.is_file() or not type_path.is_file():
            return None
        content_type = type_path.read_text(encoding="utf-8").strip() or "audio/wav"
        audio = audio_path.read_bytes()
    except OSError:
        return None
    if not audio or not content_type.startswith("audio/"):
        return None
    return audio, content_type


def _write_disk(key: str, audio: bytes, content_type: str) -> None:
    try:
        directory = _disk_dir()
        (directory / f"{key}.type").write_text(content_type, encoding="utf-8")
        (directory / f"{key}.audio").write_bytes(audio)
    except OSError:
        logger.info("Maker TTS disk cache was not written")


def _remember(key: str, audio: bytes, content_type: str) -> None:
    _cache[key] = (audio, content_type)
    _cache.move_to_end(key)
    while len(_cache) > _CACHE_MAX:
        _cache.popitem(last=False)
    _write_disk(key, audio, content_type)


def cached_maker_speech(text: str) -> tuple[bytes, str] | None:
    prepared = strip_markdown_for_speech(text, max_chars=600, math_speak=False)
    if not prepared:
        return None
    key = _cache_key(prepared)
    found = _cache.get(key)
    if found:
        _cache.move_to_end(key)
        return found
    found = _read_disk(key)
    if found:
        _remember(key, *found)
    return found


async def synthesize_maker_speech(
    text: str, *, catalog: dict[str, Any] | None = None
) -> tuple[bytes, str]:
    """Synthesize Mandarin with Serena. Identical text reuses the cache."""
    prepared = strip_markdown_for_speech(text, max_chars=600, math_speak=False)
    if not prepared:
        raise ValueError("Nothing to speak.")
    key = _cache_key(prepared)
    found = _cache.get(key) or _read_disk(key)
    if found:
        _remember(key, *found)
        return found
    config = resolve_maker_tts_config(catalog)
    adapter = get_tts_adapter(config.adapter)
    audio, content_type = await synthesize_with_timeout(adapter, prepared, config)
    if not audio:
        raise ValueError("Empty speech audio.")
    _remember(key, audio, content_type)
    return audio, content_type
