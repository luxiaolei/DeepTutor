import assert from "node:assert/strict";
import test from "node:test";

import { readFileSync } from "node:fs";
import path from "node:path";
import {
  composerPlaceholder,
  guidanceDensity,
  learnerCapabilityAllowed,
  learnerSidebarLabel,
  learnerStyleLabel,
  learnerActivityLabel,
  makerChoiceLines,
  makerOpening,
  makerPicture,
  makerShowsPictures,
  makerSpeaks,
  spokenMakerPrompt,
  withoutMakerChoiceLines,
} from "../lib/zaowu-home";
import { planMakerSpeech, recentlySpoken } from "../lib/maker-speech";

test("product ages map onto the builtin bands", () => {
  assert.equal(guidanceDensity(5, "6-8"), "early");
  assert.equal(guidanceDensity(8, "6-8"), "middle");
  assert.equal(guidanceDensity(11, "9-12"), "older");
  assert.equal(guidanceDensity(null, "6-8"), "early");
  assert.equal(guidanceDensity(null, "9-12"), "older");
  assert.equal(guidanceDensity(null, "13-15"), "older");
});

test("younger openings use two large choices", () => {
  const opening = makerOpening("early");
  assert.equal(opening.choices.length, 2);
  assert.match(opening.heading, /家人/);
  assert.match(opening.heading, /东西/);
  const refresh = makerOpening("early", 1);
  assert.equal(refresh.choices[0]?.label, "会发光的");
  assert.equal(refresh.choices[1]?.label, "给家人看的");
  assert.equal(makerOpening("early", 2).choices[0]?.label, "会唱歌的");
});

test("learner chrome uses the maker name, not the adult defaults", () => {
  assert.equal(learnerSidebarLabel(true, "General workspace", "造物"), "造物");
  assert.equal(learnerSidebarLabel(false, "General workspace", "造物"), "General workspace");
  assert.equal(
    learnerStyleLabel({
      selected: "",
      lockedPersona: "zaowu",
      defaultLabel: "Default",
      zaowuLabel: "造物",
    }),
    "造物",
  );
  assert.equal(
    learnerStyleLabel({
      selected: "zaowu",
      personas: [{ name: "zaowu", title: "造物" }],
      defaultLabel: "Default",
    }),
    "造物",
  );
  assert.equal(learnerStyleLabel({ selected: "", defaultLabel: "Default" }), "Default");
  assert.equal(
    composerPlaceholder({
      learner: true,
      maker: "想做什么？点一个，或者说一句。",
      adult: "How can I help you today?",
    }),
    "想做什么？点一个，或者说一句。",
  );
  assert.equal(
    composerPlaceholder({
      learner: false,
      maker: "想做什么？",
      adult: "How can I help you today?",
    }),
    "How can I help you today?",
  );
  assert.equal(
    composerPlaceholder({
      learner: true,
      hint: "继续改太阳",
      maker: "想做什么？",
      adult: "How can I help you today?",
    }),
    "继续改太阳",
  );
});

test("maker chips send a choice and numbered replies become buttons", () => {
  const opening = makerOpening("early");
  assert.equal(opening.choices[0]?.prompt, "我想做一个会动的小东西。");
  const source = readFileSync(
    path.resolve(process.cwd(), "features/chat/components/ChatWorkspace.tsx"),
    "utf8",
  );
  assert.match(source, /void handleSend\(prompt\)/);
  assert.match(source, /void handleSend\(choice\)/);
  assert.deepEqual(
    makerChoiceLines("会动的小东西很有趣！你想做哪一种？\n1. 会跳的小球\n2. 会摆动的小星星"),
    ["会跳的小球", "会摆动的小星星"],
  );
  assert.deepEqual(makerChoiceLines("只有一句，没有选项。"), []);
  const reply = "会动的小东西很有趣！你想做哪一种？\n1. 会跳的小球\n2. 会摆动的小星星";
  const choices = makerChoiceLines(reply);
  const shown = withoutMakerChoiceLines(reply, choices);
  assert.match(shown, /你想做哪一种/);
  assert.doesNotMatch(shown, /1\./);
  assert.doesNotMatch(shown, /会跳的小球/);
  assert.equal(withoutMakerChoiceLines("普通的 1. 说明，不是选项。", []), "普通的 1. 说明，不是选项。");
  const list = readFileSync(
    path.resolve(process.cwd(), "features/chat/messages/ChatMessageList.tsx"),
    "utf8",
  );
  assert.match(list, /zaowuLabel: t\("Zaowu"\)/);
  assert.match(list, /withoutMakerChoiceLines/);
  assert.match(source, /activityName=\{learnerHome \? t\("Zaowu"\) : undefined\}/);
});

test("youngest maker choices are pictures and a spoken prompt", () => {
  assert.equal(makerPicture("会动的"), "motion");
  assert.equal(makerPicture("会讲故事的"), "story");
  assert.equal(makerPicture("会跳的小球"), "ball");
  assert.equal(makerPicture("会摆动的小星星"), "star");
  assert.equal(makerPicture("会摆尾的小鱼"), "fish");
  assert.equal(makerPicture("会发光的"), "glow");
  assert.equal(makerPicture("会唱歌的"), "music");
  assert.equal(makerPicture("会画画的"), "draw");
  assert.equal(learnerActivityLabel("zaowu"), "造物");
  assert.equal(learnerActivityLabel("read_skill"), null);
  assert.equal(learnerActivityLabel("读取技能"), "读取技能");
  assert.equal(learnerActivityLabel("name: zaowu"), "name: 造物");
  assert.equal(makerPicture("给家人看的"), "family");
  assert.equal(makerPicture("能玩的"), "play");
  assert.equal(makerPicture("小游戏"), "game");
  assert.equal(makerPicture("一块安静的布"), "spark");
  assert.equal(makerShowsPictures("early"), true);
  assert.equal(makerShowsPictures("middle"), true);
  assert.equal(makerShowsPictures("older"), false);
  assert.equal(makerSpeaks("early"), true);
  assert.equal(makerSpeaks("middle"), false);
  assert.equal(makerSpeaks("older"), false);
  const spoken = spokenMakerPrompt("今天我们一起做一个能给家人看的小东西。", ["会动的", "会讲故事的"]);
  assert.match(spoken, /能给家人看的小东西/);
  assert.match(spoken, /会动的/);
  assert.match(spoken, /或者，会讲故事的/);
  const plan = planMakerSpeech(spoken);
  assert.equal(plan?.lang, "zh-CN");
  assert.equal(plan?.text, spoken);
  assert.equal(planMakerSpeech("   "), null);
  assert.equal(recentlySpoken("还没说过"), false);
  const opening = readFileSync(
    path.resolve(process.cwd(), "components/chat/home/MakerOpening.tsx"),
    "utf8",
  );
  assert.match(opening, /MakerSpeakerButton/);
  assert.match(opening, /useSpokenMakerPrompt\(speak, spoken\)/);
  const choices = readFileSync(
    path.resolve(process.cwd(), "components/chat/home/MakerChoices.tsx"),
    "utf8",
  );
  assert.match(choices, /data-maker-picture=\{name\}/);
  assert.match(choices, /aria-label=\{"再听一遍"\}/);
  const list = readFileSync(
    path.resolve(process.cwd(), "features/chat/messages/ChatMessageList.tsx"),
    "utf8",
  );
  const workspace = readFileSync(
    path.resolve(process.cwd(), "features/chat/components/ChatWorkspace.tsx"),
    "utf8",
  );
  assert.match(list, /<MakerChoiceRow/);
  assert.match(workspace, /makerDensity=\{learnerHome \? makerDensity : undefined\}/);
  assert.match(workspace, /speakMaker\(/);
  assert.match(workspace, /overflow-x-hidden overflow-y-auto px-6 py-6/);
  assert.match(workspace, /learnerChrome=\{learnerHome\}/);
  assert.match(choices, /grid-cols-2/);
  assert.match(opening, /picture="swap"/);
  assert.match(opening, /whitespace-nowrap/);
  assert.match(opening, /请坐在旁边，让孩子点图/);
  assert.match(choices, /再听一遍/);
  const trace = readFileSync(
    path.resolve(process.cwd(), "features/chat/trace/TracePresentation.tsx"),
    "utf8",
  );
  assert.match(trace, /We are thinking together…/);
  assert.match(trace, /learner \? undefined : processSummary/);
});

test("learner home hides research capabilities and keeps visualize", () => {
  const allowed = ["chat", "visualize", "immersive_reading"];
  assert.equal(learnerCapabilityAllowed(allowed, ""), true);
  assert.equal(learnerCapabilityAllowed(allowed, "visualize"), true);
  assert.equal(learnerCapabilityAllowed(allowed, "deep_research"), false);
  assert.equal(learnerCapabilityAllowed(allowed, "deep_solve"), false);
  assert.equal(learnerCapabilityAllowed(null, "deep_research"), true);
});
