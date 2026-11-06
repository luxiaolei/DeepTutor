import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  LEARNER_TAB_TITLE,
  parseRememberedLearner,
  serializeRememberedLearner,
  tabTitleForAccount,
  writeDocumentTitle,
} from "../lib/learner-chrome";

test("a learner account owns the tab title", () => {
  assert.equal(tabTitleForAccount(true), LEARNER_TAB_TITLE);
  assert.equal(tabTitleForAccount(false), "DeepTutor");
  assert.equal(LEARNER_TAB_TITLE, "造物");
});

test("the title element is rewritten, not only document.title", () => {
  const element = { textContent: "DeepTutor" };
  const doc = {
    title: "DeepTutor",
    head: { querySelector: () => element },
    createElement: () => element,
  };
  writeDocumentTitle("造物", doc as unknown as Document);
  assert.equal(doc.title, "造物");
  assert.equal(element.textContent, "造物");
});

test("a remembered learner profile round-trips", () => {
  const raw = serializeRememberedLearner({
    learningPolicy: {
      allowedSurfaces: ["chat"],
      allowedCapabilities: ["chat", "visualize"],
      ageBand: "6-8",
      lockedPersona: "zaowu",
    },
    learnerAge: 6,
    sessionStart: { required: true, confirmed: true },
  });
  const parsed = parseRememberedLearner(raw);
  assert.equal(parsed?.learningPolicy.lockedPersona, "zaowu");
  assert.equal(parsed?.learnerAge, 6);
  assert.equal(parsed?.sessionStart?.confirmed, true);
  assert.equal(parseRememberedLearner("nope"), null);
  assert.equal(parseRememberedLearner(null), null);
});

test("the tab, the remount, and the opening scroll are wired", () => {
  const root = process.cwd();
  const layout = readFileSync(path.resolve(root, "app/layout.tsx"), "utf8");
  const shell = readFileSync(path.resolve(root, "components/layout/AppShell.tsx"), "utf8");
  const auth = readFileSync(path.resolve(root, "hooks/useAuthStatus.ts"), "utf8");
  const workspace = readFileSync(path.resolve(root, "features/chat/components/ChatWorkspace.tsx"), "utf8");
  assert.match(layout, /title:\s*\{\s*absolute:\s*title\s*\}/);
  assert.match(layout, /learning_policy/);
  assert.match(shell, /writeDocumentTitle\(LEARNER_TAB_TITLE/);
  assert.match(shell, /new MutationObserver/);
  assert.doesNotMatch(shell, /document\.title = previous/);
  assert.match(auth, /resolvedAuth \?\? INITIAL/);
  assert.match(workspace, /flexGrow: hasMessages \|\| learnerHome \? 0 : 1\.4/);
  assert.match(workspace, /overflow-x-hidden overflow-y-auto px-6 py-6/);
});
