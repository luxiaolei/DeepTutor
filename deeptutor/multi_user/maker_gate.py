"""Stop a learning account from one-shotting a finished visualization.

The path is fixed: talk first, the child picks, a short seed is allowed, then
one revision after the child critiques. Adults (no learning policy) are unchanged.
"""

from __future__ import annotations

from typing import Any

TALK = "talk"
DETAIL = "detail"
SEED = "seed"
REVISE = "revise"
TRIED = "tried"

MAKER_STAGE_KEY = "zaowu_maker_stage"
SEED_MARKER = 'data-zaowu-stage="seed"'
SEED_MARKER_ALT = "data-zaowu-stage='seed'"
SEED_HTML_MAX_CHARS = 2400
SEED_OTHER_MAX_CHARS = 900

_STAGES = {TALK, DETAIL, SEED, REVISE, TRIED}


def decide_maker_stage(
    history: list[dict[str, Any]] | None,
    current_message: str,
) -> str:
    """Stage for one learner turn, from prior messages plus the new one."""
    if _tried_the_toy(current_message):
        return TRIED
    if _asks_for_another_piece(current_message):
        return TALK
    # 「还想做另一个吗？」 starts a new piece. Earlier picks and the previous
    # seed no longer decide this turn.
    scoped = _piece_history(history or [])
    commits = prior_visualization_commits(scoped)
    if commits >= 1:
        return REVISE
    # 「看别的」 asks for another pair. It is not a choice, so the turn stays
    # in talk. Treating it as the second sentence used to open visualize and
    # wait on submit_visualization, which never saved a reply.
    if _asks_for_other_choices(current_message):
        return TALK
    # The first picture tap is not a finished toy. The child still chooses
    # how it should be (high or gentle, fast or slow, red or blue). Only the
    # next tap may open the seed.
    picks = _real_picks(scoped, current_message)
    if picks >= 2:
        return SEED
    if picks == 1:
        return DETAIL
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


def route_maker_turn(
    *,
    requested: str,
    history: list[dict[str, Any]] | None,
    current_message: str,
    allowed_capabilities: set[str] | None,
    learning: bool,
) -> tuple[str, str | None]:
    """Return ``(capability, stage)`` for one learner turn.

    Talk stays on chat. After the child has chosen, the seed and the one
    change run on ``visualize`` so ``submit_visualization`` is actually
    mounted. A client that sent ``chat`` does not get a canvas otherwise.
    """
    if not learning:
        capability = requested or "chat"
        return capability, None
    stage = decide_maker_stage(history, current_message)
    capability = requested or "chat"
    allowed = allowed_capabilities or set()
    if stage in {SEED, REVISE} and capability in {"", "chat"} and "visualize" in allowed:
        return "visualize", stage
    return capability, stage


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


def tried_choice_reply(text: str) -> str:
    """After the child taps the toy. A reaction, then one invitation for a new pair."""
    label = str(text or "")
    if "飞" in label:
        reaction = "飞起来了！"
    elif "跳" in label:
        reaction = "跳起来了！"
    elif "转" in label:
        reaction = "转起来了！"
    elif "摆" in label:
        reaction = "摆起来了！"
    else:
        reaction = "真好看！"
    return f"{reaction}\n还想做另一个吗？\n1. 会唱歌的\n2. 会画画的"


def detail_choice_reply(pick: str) -> str:
    """Instant next picture pair. No model call, so the child is not left waiting."""
    name = str(pick or "").strip() or "这个"
    if any(word in name for word in ("跳", "球")):
        first, second = "跳得高高", "轻轻跳跳"
    elif any(word in name for word in ("转", "风", "摇", "摆")):
        first, second = "转得快一点", "慢慢转"
    else:
        first, second = "红红的", "蓝蓝的"
    return f"好，我们就做{name}。\n{first}，还是{second}？\n1. {first}\n2. {second}"


def _is_real_pick(text: str) -> bool:
    value = str(text or "").strip()
    if not value or _asks_for_other_choices(value) or _tried_the_toy(value):
        return False
    if "我想做" in value:
        return False
    return True


def _real_picks(history: list[dict[str, Any]], current_message: str) -> int:
    """Picture taps after a choice has been offered. The opening sentence is not one."""
    seen_assistant = False
    count = 0
    for message in history:
        if not isinstance(message, dict):
            continue
        role = str(message.get("role") or "")
        if role == "assistant":
            seen_assistant = True
        elif role == "user" and seen_assistant and _is_real_pick(str(message.get("content") or "")):
            count += 1
    if seen_assistant and _is_real_pick(current_message):
        count += 1
    return count


def _tried_the_toy(current_message: str) -> bool:
    return "我试过了" in str(current_message or "")


def _asks_for_another_piece(current_message: str) -> bool:
    text = str(current_message or "")
    return any(phrase in text for phrase in ("还想做另一个", "再做一个"))


def _piece_history(history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Messages since the latest invitation to make a different thing.

    The invitation itself stays, so the next picture tap still counts as a
    choice. Everything before it belonged to the piece they already tried.
    """
    start = 0
    for index, message in enumerate(history):
        if not isinstance(message, dict):
            continue
        if str(message.get("role") or "") != "assistant":
            continue
        if "还想做另一个" in str(message.get("content") or ""):
            start = index
    return history[start:]


def _asks_for_other_choices(current_message: str) -> bool:
    text = str(current_message or "")
    return any(phrase in text for phrase in ("再看两个", "再换两个", "看别的"))


__all__ = [
    "MAKER_STAGE_KEY",
    "REVISE",
    "SEED",
    "SEED_MARKER",
    "DETAIL",
    "TRIED",
    "TALK",
    "tried_choice_reply",
    "decide_maker_stage",
    "detail_choice_reply",
    "prior_visualization_commits",
    "route_maker_turn",
    "seed_payload_error",
    "stage_from_context",
]
