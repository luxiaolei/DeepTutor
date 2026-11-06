"""KidsAI learner defaults: locked 造物 persona, no adult tools, no one-shot."""

from __future__ import annotations

from deeptutor.multi_user.maker_gate import (
    REVISE,
    SEED,
    TALK,
    DETAIL,
    decide_maker_stage,
    detail_choice_reply,
    route_maker_turn,
    seed_payload_error,
)
from deeptutor.multi_user.grants import learner_grant, save_grant
from deeptutor.multi_user.learning_access import (
    apply_learning_policy,
    restrict_learner_tools,
)
from deeptutor.multi_user.session_gate import (
    assert_session_start_allowed,
    confirm_session_start,
    requires_start_confirmation,
)
from deeptutor.multi_user.zaowu_guidance import guidance_block, guidance_density
from deeptutor.services.persona.service import PersonaService, PRESETS_DIR
from deeptutor.services.skill.service import BUILTIN_SKILLS_ROOT, SkillService

import pytest


def test_learner_grant_locks_zaowu_and_allows_visualize():
    grant = learner_grant("learner-1")
    policy = grant["learning_policy"]
    assert policy["locked_persona"] == "zaowu"
    assert policy["default_capability"] == "chat"
    assert policy["allowed_capabilities"] == ["chat", "visualize", "immersive_reading"]
    assert grant["enabled_tools"] == []
    assert grant["exec_enabled"] is False
    assert "deep_research" not in policy["allowed_capabilities"]
    assert "deep_solve" not in policy["allowed_capabilities"]


def _learner(seed_user, name: str):
    seed_user("admin", role="admin")
    return seed_user(name)


def test_learner_turn_strips_adult_tools(mu_isolated_root, seed_user, as_user):
    learner = _learner(seed_user, "maker")
    save_grant(learner["id"], learner_grant(learner["id"]))
    with as_user(learner["id"], username="maker"):
        result = apply_learning_policy(
            {
                "capability": "chat",
                "persona": "teacher",
                "tools": ["web_search", "exec"],
                "enabled_tools": ["web_search"],
                "enable_web_search": True,
            }
        )
    assert result["persona"] == "zaowu"
    assert result["tools"] == []
    assert result["enabled_tools"] == []
    assert result["enable_web_search"] is False
    kept = restrict_learner_tools(
        ["web_search", "exec", "workspace_read", "web_fetch", "ask_user", "submit_visualization"]
    )
    assert kept == ["ask_user", "submit_visualization"]


def test_learner_cannot_open_research_capabilities(mu_isolated_root, seed_user, as_user):
    learner = _learner(seed_user, "maker")
    save_grant(learner["id"], learner_grant(learner["id"]))
    with as_user(learner["id"], username="maker"):
        with pytest.raises(PermissionError, match="cannot use this mode"):
            apply_learning_policy({"capability": "deep_research"})
        with pytest.raises(PermissionError, match="cannot use this mode"):
            apply_learning_policy({"capability": "deep_solve"})


def test_one_sentence_stays_in_talk_and_a_seed_is_not_a_finished_page():
    assert decide_maker_stage([], "做一个今天天气的小网页") == TALK
    assert (
        decide_maker_stage(
            [
                {"role": "user", "content": "做一个今天天气的小网页"},
                {"role": "assistant", "content": "想做会动的，还是会讲故事的？"},
            ],
            "会动的",
        )
        == DETAIL
    )
    assert (
        decide_maker_stage(
            [
                {"role": "user", "content": "我想做一个会动的小东西。"},
                {"role": "assistant", "content": "1. 会跳的小球\n2. 会摆尾的小鱼"},
            ],
            "再看两个不一样的。我还没选，先不要做出来。",
        )
        == TALK
    )
    history = [
        {"role": "user", "content": "会动的"},
        {"role": "assistant", "content": '<div data-zaowu-stage="seed"></div>'},
    ]
    assert decide_maker_stage(history, "太阳太大了") == REVISE
    assert decide_maker_stage(history, "还想做另一个") == TALK
    asked = [
        *history,
        {"role": "assistant", "content": "还想做另一个吗？\n1. 会画画的\n2. 会唱歌的"},
    ]
    assert decide_maker_stage(asked, "会画画的") == DETAIL
    finished = (
        "<!DOCTYPE html><html><body data-zaowu-stage=\"seed\">"
        + ("<button>go</button>" * 3)
        + "<canvas></canvas><script>requestAnimationFrame(()=>{})</script></body></html>"
    )
    assert seed_payload_error("html", finished)
    seed = (
        '<!DOCTYPE html><html><body data-zaowu-stage="seed">'
        '<button aria-label="reset">reset</button>'
        "<script>document.body.dataset.ready='1'</script></body></html>"
    )
    assert seed_payload_error("html", seed) == ""


def test_chat_seed_turn_is_routed_to_visualize():
    history = [
        {"role": "user", "content": "我想做一个会动的小东西。"},
        {"role": "assistant", "content": "1. 会跳的小球\n2. 会摆动的小星星"},
    ]
    capability, stage = route_maker_turn(
        requested="chat",
        history=history,
        current_message="会跳的小球",
        allowed_capabilities={"chat", "visualize", "immersive_reading"},
        learning=True,
    )
    assert stage == DETAIL
    assert capability == "chat"
    seed_capability, seed_stage = route_maker_turn(
        requested="chat",
        history=[
            *history,
            {"role": "user", "content": "会跳的小球"},
            {"role": "assistant", "content": detail_choice_reply("会跳的小球")},
        ],
        current_message="跳得高高",
        allowed_capabilities={"chat", "visualize", "immersive_reading"},
        learning=True,
    )
    assert seed_stage == SEED
    assert seed_capability == "visualize"
    assert "跳得高高" in detail_choice_reply("会跳的小球")
    talk_capability, talk_stage = route_maker_turn(
        requested="chat",
        history=[],
        current_message="我想做一个会动的小东西。",
        allowed_capabilities={"chat", "visualize"},
        learning=True,
    )
    assert talk_stage == TALK
    assert talk_capability == "chat"
    stayed, stayed_stage = route_maker_turn(
        requested="chat",
        history=history,
        current_message="会跳的小球",
        allowed_capabilities={"chat"},
        learning=True,
    )
    assert stayed_stage == DETAIL
    assert stayed == "chat"


def test_primary_age_needs_a_parent_tap(mu_isolated_root):
    policy = {"age_band": "6-8"}
    assert requires_start_confirmation("6-8")
    assert requires_start_confirmation("9-12")
    assert not requires_start_confirmation("13-15")
    with pytest.raises(PermissionError, match="请家长确认"):
        assert_session_start_allowed(policy, session_has_user_message=False, user_id="learner-kid")
    assert_session_start_allowed(policy, session_has_user_message=True, user_id="learner-kid")
    confirm_session_start("learner-kid", actor_id="parent")
    assert_session_start_allowed(policy, session_has_user_message=False, user_id="learner-kid")


def test_age_density_maps_product_ages_onto_builtin_bands():
    assert guidance_density(5, "6-8") == "early"
    assert guidance_density(6, None) == "early"
    assert guidance_density(8, "6-8") == "middle"
    assert guidance_density(9, "9-12") == "middle"
    assert guidance_density(11, "9-12") == "older"
    assert guidance_density(None, "6-8") == "early"
    assert guidance_density(None, "9-12") == "older"
    assert guidance_density(None, "13-15") == "older"
    early = guidance_block(5, "6-8")
    assert "还不认字" in early
    assert "你想先做哪一个" in early
    assert "会跳的小球" in early
    assert "打字" in early
    middle = guidance_block(8, "6-8")
    assert "短选项" in middle
    assert "写一句" in middle


def test_zaowu_persona_and_skill_are_shipped():
    persona = PersonaService(root=PRESETS_DIR).get_detail("zaowu")
    assert persona.title == "造物"
    assert "马上交付完整" not in persona.content
    assert "禁止一句话做完" in persona.content
    assert "data-zaowu-stage" in persona.content
    assert "不答应保密" in persona.content
    skill = SkillService(root=BUILTIN_SKILLS_ROOT, builtin_root=None).get_detail("zaowu")
    rendered = SkillService(root=BUILTIN_SKILLS_ROOT, builtin_root=None).load_for_context(["zaowu"])
    assert "种子" in skill.content
    assert "Active Skills" in rendered
    assert "always: true" not in skill.content
    assert "always: false" in skill.content
