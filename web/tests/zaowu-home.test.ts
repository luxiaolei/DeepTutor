import assert from "node:assert/strict";
import test from "node:test";

import {
  guidanceDensity,
  learnerCapabilityAllowed,
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

test("learner home hides research capabilities and keeps visualize", () => {
  const allowed = ["chat", "visualize", "immersive_reading"];
  assert.equal(learnerCapabilityAllowed(allowed, ""), true);
  assert.equal(learnerCapabilityAllowed(allowed, "visualize"), true);
  assert.equal(learnerCapabilityAllowed(allowed, "deep_research"), false);
  assert.equal(learnerCapabilityAllowed(allowed, "deep_solve"), false);
  assert.equal(learnerCapabilityAllowed(null, "deep_research"), true);
});
