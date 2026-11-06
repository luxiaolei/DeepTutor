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
  MAKER_CHOICE_INVITATION,
  MAKER_OTHER_CHOICES_PROMPT,
  makerChoiceLines,
  makerInvitesChoice,
  makerPickAck,
  makerPickStarted,
  makerPreviewWords,
  makerOpening,
  makerPicture,
  makerShowsPictures,
  makerSpeaks,
  spokenMakerPrompt,
  withMakerChoiceInvitation,
  withoutInProgressChoiceLines,
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
      maker: "想做什么？点一个。",
      adult: "How can I help you today?",
    }),
    "想做什么？点一个。",
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
  assert.equal(makerInvitesChoice(shown), false);
  assert.equal(
    withMakerChoiceInvitation("会动的小东西很有趣！"),
    `会动的小东西很有趣！\n\n${MAKER_CHOICE_INVITATION}`,
  );
  assert.equal(
    withMakerChoiceInvitation(`会动的小东西很有趣！${MAKER_CHOICE_INVITATION}`),
    `会动的小东西很有趣！${MAKER_CHOICE_INVITATION}`,
  );
  assert.equal(withMakerChoiceInvitation("  "), MAKER_CHOICE_INVITATION);
  assert.match(spokenMakerPrompt(withMakerChoiceInvitation("会动的小东西很有趣！"), ["会跳的小球", "会转的小风车"]), /你想先做哪一个/);
  assert.match(MAKER_OTHER_CHOICES_PROMPT, /再看两个不一样的/);
  assert.equal(makerPickStarted("会跳的小球"), true);
  assert.equal(makerPickStarted("我想做一个会动的小东西。"), false);
  assert.equal(makerPickStarted(MAKER_OTHER_CHOICES_PROMPT), false);
  assert.match(makerPreviewWords("", "<button>跳一下</button>", "会跳的小球"), /点「跳一下」试试，再给旁边的人看/);
  const sourceDump = "<style>button{color:red}</style><p>现在交给你一块会转的风车。</p><button>转起来</button><script>b.onclick=function(){}</script>";
  assert.equal(makerPreviewWords(sourceDump, sourceDump, "风车"), "点「转起来」试试，再给旁边的人看。");
  assert.equal(makerInvitesChoice("转得快一点，还是慢慢转？"), true);
  assert.equal(makerPickAck("会跳的小球"), "好，我们就做会跳的小球。");
  assert.equal(makerPicture("跳得高高"), "high");
  assert.equal(makerPicture("轻轻跳跳"), "gentle");
  assert.equal(makerPicture("红红的"), "red");
  assert.equal(makerPicture("蓝蓝的"), "blue");
  assert.equal(makerPicture("转得快一点"), "motion");
  assert.equal(makerPicture("慢慢转"), "pinwheel");
  assert.deepEqual(
    makerChoiceLines("会动的小东西很有趣！\n你想先做哪一个？\n1.会跳的小球\n2．会摆尾巴的小鱼"),
    ["会跳的小球", "会摆尾巴的小鱼"],
  );
  assert.deepEqual(
    makerChoiceLines("<ol><li>会跳的小球</li><li>会摆尾巴的小鱼</li></ol>"),
    ["会跳的小球", "会摆尾巴的小鱼"],
  );
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
  assert.equal(makerPicture("会转的小风车"), "pinwheel");
  assert.notEqual(makerPicture("会转的小风车"), makerPicture("会动的"));
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
  assert.match(list, /withMakerChoiceInvitation/);
  assert.match(list, /heading=\{choiceProse\}/);
  assert.match(list, /看别的/);
  assert.match(list, /pickIndex < 0 && !isStreaming && makerChoiceLines/);
  assert.match(list, /makerChoices\.length > 0 && !choicesLocked/);
  assert.match(list, /lastPickIndex >= 0 && i < lastPickIndex/);
  assert.match(workspace, /speakMaker\(makerPickAck\(choice\)\)/);
  assert.match(workspace, /MAKER_AFTER_PICK_PLACEHOLDER/);
  assert.match(workspace, /learnerHome \? null : \(\s*<TurnNavigator/s);
  assert.match(list, /withoutInProgressChoiceLines/);
  assert.equal(
    withoutInProgressChoiceLines("会动的小东西真有趣！\n你想先做哪一个？\n1. 会跳的小球\n2. 会转的小风车"),
    "会动的小东西真有趣！\n你想先做哪一个？",
  );
  const navigation = readFileSync(
    path.resolve(process.cwd(), "components/sidebar/CategoryNavigation.tsx"),
    "utf8",
  );
  assert.match(navigation, /navVisibleUnderPolicy\(item\.href, null\)/);
  const pageBar = readFileSync(
    path.resolve(process.cwd(), "components/sidebar/PageBar.tsx"),
    "utf8",
  );
  assert.match(pageBar, /if \(learningPolicy \|\| !located \|\| isMobile\) return null/);
  const composer = readFileSync(
    path.resolve(process.cwd(), "components/chat/home/ChatComposer.tsx"),
    "utf8",
  );
  assert.match(composer, /!learnerChrome && \(controls\?\.voice !== false \|\| recorder\.state !== "idle"\) \? \(/);
  assert.match(workspace, /learnerHome \? null : \(/);
  assert.match(workspace, /MAKER_OTHER_CHOICES_PROMPT/);
  assert.match(workspace, /displayUserMessage: false, persistUserMessage: false/);
  assert.match(workspace, /inputPlaceholderCompletion=\{learnerHome \? undefined : askHint\}/);
  assert.match(workspace, /paddingBottom: learnerHome \? "96px" : "48px"/);
  assert.match(workspace, /data-maker-choice-row/);
  assert.match(composer, /suppressed=\{learnerChrome\}/);
  const zh = readFileSync(path.resolve(process.cwd(), "locales/zh/app.json"), "utf8");
  assert.match(zh, /"What shall we make\?": "想做什么？点一个。"/);
  assert.match(list, /showModeBadge && !learnerChrome/);
  assert.match(list, /onMakerChoice && !isActiveAssistant/);
  assert.match(list, /snap\?\.persona && !learnerChrome/);
  assert.match(list, /这次没做成。再点一次。/);
  assert.match(list, /if \(learnerChrome\) \{/);
  assert.match(choices, /ellipse cx="20" cy="28"/);
  assert.match(choices, /M23 20c0-12 11-14 15-7/);
  const shell = readFileSync(
    path.resolve(process.cwd(), "components/sidebar/SidebarShell.tsx"),
    "utf8",
  );
  assert.match(shell, /sidebarCollapsed && !isMobile && !learnerHome/);
  assert.match(shell, /learnerHome \? null : \(/);
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
  const speech = readFileSync(path.resolve(process.cwd(), "lib/maker-speech.ts"), "utf8");
  assert.match(speech, /if \(current === audio\) notifyFailure\(false\)/);
  assert.doesNotMatch(speech, /speechSynthesis/);
  assert.match(speech, /maker:\s*true/);
  assert.match(speech, /\/api\/voice\/tts/);
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
