import assert from "node:assert/strict";
import test from "node:test";

import {
  composerPlaceholder,
  guidanceDensity,
  learnerCapabilityAllowed,
  learnerSidebarLabel,
  learnerStyleLabel,
  makerOpening,
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

test("learner home hides research capabilities and keeps visualize", () => {
  const allowed = ["chat", "visualize", "immersive_reading"];
  assert.equal(learnerCapabilityAllowed(allowed, ""), true);
  assert.equal(learnerCapabilityAllowed(allowed, "visualize"), true);
  assert.equal(learnerCapabilityAllowed(allowed, "deep_research"), false);
  assert.equal(learnerCapabilityAllowed(allowed, "deep_solve"), false);
  assert.equal(learnerCapabilityAllowed(null, "deep_research"), true);
});
