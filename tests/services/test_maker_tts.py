"""Young-maker read-aloud uses Qwen flash and Serena, and caches the audio."""

from __future__ import annotations

import pytest

from deeptutor.services.voice import maker


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    maker._cache.clear()
    monkeypatch.setattr(maker, "_disk_dir", lambda: tmp_path)
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    yield
    maker._cache.clear()


def test_maker_voice_is_serena_on_qwen_flash(monkeypatch):
    monkeypatch.setenv("DASHSCOPE_API_KEY", "sk-preview")
    config = maker.resolve_maker_tts_config(catalog={"services": {"tts": {"profiles": []}}})
    assert config.model == "qwen3-tts-flash"
    assert "realtime" not in config.model
    assert config.voice == "Serena"
    assert config.language == "Chinese"
    assert config.provider_name == "dashscope"
    assert config.api_key == "sk-preview"


def test_catalog_dashscope_connection_supplies_the_key(monkeypatch):
    monkeypatch.setenv("DASHSCOPE_API_KEY", "sk-env")
    catalog = {
        "services": {
            "tts": {
                "profiles": [
                    {
                        "binding": "openai",
                        "api_key": "sk-other",
                        "base_url": "https://api.openai.com/v1",
                    },
                    {
                        "binding": "dashscope",
                        "api_key": "sk-catalog",
                        "base_url": "https://dashscope.aliyuncs.com/api/v1",
                    },
                ]
            }
        }
    }
    config = maker.resolve_maker_tts_config(catalog=catalog)
    assert config.api_key == "sk-catalog"
    assert config.base_url == "https://dashscope.aliyuncs.com/api/v1"
    assert config.model == "qwen3-tts-flash"
    assert config.voice == "Serena"


def test_missing_dashscope_key_does_not_echo_secrets(monkeypatch):
    monkeypatch.setenv("DASHSCOPE_API_KEY", "")
    with pytest.raises(ValueError, match="not configured") as caught:
        maker.resolve_maker_tts_config(catalog={"services": {"tts": {"profiles": []}}})
    assert "sk-" not in str(caught.value)


@pytest.mark.asyncio
async def test_repeat_text_does_not_call_qwen_again(monkeypatch):
    monkeypatch.setenv("DASHSCOPE_API_KEY", "sk-preview")
    calls: list[str] = []

    async def fake_timeout(_adapter, text, config):
        calls.append(text)
        assert config.model == "qwen3-tts-flash"
        assert config.voice == "Serena"
        return b"RIFFaudio", "audio/wav"

    monkeypatch.setattr(maker, "synthesize_with_timeout", fake_timeout)
    catalog = {"services": {"tts": {"profiles": []}}}
    first = await maker.synthesize_maker_speech("会动的。", catalog=catalog)
    maker._cache.clear()
    second = await maker.synthesize_maker_speech("会动的。", catalog=catalog)
    assert first == second == (b"RIFFaudio", "audio/wav")
    assert calls == ["会动的。"]
