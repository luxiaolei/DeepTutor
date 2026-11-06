"""Stop a learning account from one-shotting a finished visualization.

The path is fixed: talk first, the child picks, a short seed is allowed, then
one revision after the child critiques. Adults (no learning policy) are unchanged.
"""

from __future__ import annotations

from typing import Any

TALK = "talk"
SEED = "seed"
REVISE = "revise"

MAKER_STAGE_KEY = "zaowu_maker_stage"
SEED_MARKER = 'data-zaowu-stage="seed"'
SEED_MARKER_ALT = "data-zaowu-stage='seed'"
SEED_HTML_MAX_CHARS = 2400
SEED_OTHER_MAX_CHARS = 900

_STAGES = {TALK, SEED, REVISE}


def decide_maker_stage(
    history: list[dict[str, Any]] | None,
    current_message: str,
) -> str:
    """Stage for one learner turn, from prior messages plus the new one."""
    commits = prior_visualization_commits(history or [])
    if commits >= 1:
        return REVISE
    if _user_turns(history or [], current_message) >= 2:
        return SEED
    return TALK


def prior_visualization_commits(history: list[dict[str, Any]]) -> int:
    commits = 0
    for message in history:
        if not isinstance(message, dict):
            continue
        meta = message.get("metadata")
        if isinstance(meta, dict) and (
            meta.get("visualization")
            or meta.get("visualization_submitted")
            or meta.get("maker_stage") in {SEED, REVISE}
        ):
            commits += 1
            continue
        content = str(message.get("content") or "")
        if SEED_MARKER in content or SEED_MARKER_ALT in content:
            commits += 1
    return commits


def seed_payload_error(visualizer: str, payload: str) -> str:
    """Empty when a first visible piece is still a skeleton."""
    text = str(payload or "")
    kind = str(visualizer or "").strip().lower()
    limit = SEED_HTML_MAX_CHARS if kind == "html" else SEED_OTHER_MAX_CHARS
    if len(text) > limit:
        return (
            "This is the first visible piece, so it has to stay a short skeleton. "
            f"Shorten it below {limit} characters and submit again."
        )
    lowered = text.lower()
    if "requestanimationframe" in lowered or "<canvas" in lowered:
        return (
            "A seed is a still skeleton, not a running scene. Remove the animation "
            "loop or canvas and submit the short seed again."
        )
    if kind == "html":
        if SEED_MARKER not in text and SEED_MARKER_ALT not in text:
            return (
                "Mark the first visible piece with "
                'data-zaowu-stage="seed" on the root element, and keep it to one control.'
            )
        if lowered.count("<button") > 1:
            return "A seed has one control. Remove the extra buttons and submit again."
    return ""


def stage_from_context(context: Any) -> str | None:
    """Learning-account stage, or None when this turn is not gated."""
    metadata = getattr(context, "metadata", None)
    if not isinstance(metadata, dict):
        return None
    explicit = metadata.get(MAKER_STAGE_KEY)
    if explicit == "off":
        return None
    if explicit in _STAGES:
        return str(explicit)
    from deeptutor.multi_user.learning_access import current_learning_policy

    if current_learning_policy() is None:
        return None
    stage = decide_maker_stage(
        getattr(context, "conversation_history", None) or [],
        str(getattr(context, "user_message", "") or ""),
    )
    metadata[MAKER_STAGE_KEY] = stage
    return stage


def _user_turns(history: list[dict[str, Any]], current_message: str) -> int:
    prior = 0
    for message in history:
        if not isinstance(message, dict):
            continue
        if str(message.get("role") or "") != "user":
            continue
        if str(message.get("content") or "").strip():
            prior += 1
    if str(current_message or "").strip():
        return prior + 1
    return prior


__all__ = [
    "MAKER_STAGE_KEY",
    "REVISE",
    "SEED",
    "SEED_MARKER",
    "TALK",
    "decide_maker_stage",
    "prior_visualization_commits",
    "seed_payload_error",
    "stage_from_context",
]
