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
  makerChoiceLines,
  makerOpening,
  withoutMakerChoiceLines,
} from "../lib/zaowu-home";

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

test("learner home hides research capabilities and keeps visualize", () => {
  const allowed = ["chat", "visualize", "immersive_reading"];
  assert.equal(learnerCapabilityAllowed(allowed, ""), true);
  assert.equal(learnerCapabilityAllowed(allowed, "visualize"), true);
  assert.equal(learnerCapabilityAllowed(allowed, "deep_research"), false);
  assert.equal(learnerCapabilityAllowed(allowed, "deep_solve"), false);
  assert.equal(learnerCapabilityAllowed(null, "deep_research"), true);
});
