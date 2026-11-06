"""Rejected admissions must leave the session free for another request."""

from __future__ import annotations

import asyncio

import pytest

from deeptutor.runtime.coordination.memory import MemoryCoordinator
from deeptutor.services.session.sqlite_store import SQLiteSessionStore
from deeptutor.services.session.turn_runtime import TurnRuntimeManager


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["selection", "preferences", "begin"])
async def test_rejected_admission_releases_coordinator_lease(tmp_path, monkeypatch, failure):
    """Validate rejection using a real store and the production coordinator."""
    store = SQLiteSessionStore(tmp_path / "admission.db")
    coordinator = MemoryCoordinator()
    runtime = TurnRuntimeManager(store, coordinator=coordinator, owner_id="worker")
    session = await store.create_session()
    payload = {
        "type": "start_turn",
        "session_id": session["id"],
        "capability": "chat",
        "content": "hello",
        "tools": [],
        "knowledge_bases": [],
        "attachments": [],
        "language": "en",
        "config": {},
    }
    if failure == "selection":
        payload["config"] = {"selection_tutor_context": {"selected_text": " "}}
        expected = "needs selected text or the conversation"
    else:

        async def reject(*args, **kwargs):
            raise RuntimeError("admission storage failure")

        method = "update_session_preferences" if failure == "preferences" else "begin_turn"
        monkeypatch.setattr(store, method, reject)
        expected = "admission storage failure"
    try:
        for _ in range(2):
            with pytest.raises(RuntimeError, match=expected):
                await runtime.start_turn(payload)
            assert await store.get_active_turn(session["id"]) is None
            lease = await coordinator.acquire_turn(
                "probe", f"{runtime._coordination_scope}:{session['id']}", "probe-worker"
            )
            assert lease is not None
            assert await coordinator.release_turn(lease)
    finally:
        await runtime.close()
        await coordinator.close()


@pytest.mark.asyncio
async def test_learner_picture_tap_preempts_an_in_flight_choice_swap(tmp_path, monkeypatch):
    """A tap during 「看别的」 takes the session instead of being rejected."""
    monkeypatch.setattr(
        "deeptutor.multi_user.learning_access.current_learning_policy",
        lambda: {
            "allowed_capabilities": ["chat", "visualize"],
            "locked_persona": "zaowu",
            "allowed_surfaces": ["chat"],
        },
    )
    store = SQLiteSessionStore(tmp_path / "preempt.db")
    coordinator = MemoryCoordinator()
    runtime = TurnRuntimeManager(store, coordinator=coordinator, owner_id="worker")

    async def hang(_context):
        await asyncio.Event().wait()
        yield None

    runtime.turn_engine.execute = hang
    session = await store.create_session()
    base = {
        "type": "start_turn",
        "session_id": session["id"],
        "capability": "chat",
        "tools": [],
        "knowledge_bases": [],
        "attachments": [],
        "language": "zh",
        "config": {},
    }
    try:
        swap_session, swap_turn = await runtime.start_turn({
            **base,
            "content": "再看两个不一样的。我还没选，先不要做出来。",
        })
        assert swap_turn["status"] == "running"
        _picked_session, picked_turn = await runtime.start_turn({**base, "content": "会跳的小球"})
        assert picked_turn["id"] != swap_turn["id"]
        deadline = asyncio.get_running_loop().time() + 3
        while asyncio.get_running_loop().time() < deadline:
            first = await store.get_turn(swap_turn["id"])
            if first and first["status"] in {"cancelled", "failed"}:
                break
            await asyncio.sleep(0.05)
        first = await store.get_turn(swap_turn["id"])
        assert first is not None
        assert first["status"] in {"cancelled", "failed"}
        assert swap_session["id"] == session["id"]
    finally:
        await runtime.close()
        await coordinator.close()
