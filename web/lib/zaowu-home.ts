/**
 * Learner-home decisions for 造物.
 *
 * Product ages are 5–6 / 7–9 / 10–12. Stored bands are 6–8 / 9–12 / 13–15.
 * Profile age wins. Band 6–8 with no age stays on the shortest density,
 * because that band cannot tell 5–6 from 7–8. Band 9–12 with no age uses the
 * older primary density; set the profile age to 7, 8, or 9 for the middle one.
 * Band 13–15 is above the marketed range and stays older.
 */

export type ZaowuDensity = "early" | "middle" | "older";

export interface ZaowuChoice {
  label: string;
  prompt: string;
}

export interface ZaowuOpening {
  heading: string;
  choices: ZaowuChoice[];
  swapLabel: string;
}

const EARLY: ZaowuChoice[][] = [
  [
    { label: "会动的", prompt: "我想做一个会动的小东西。" },
    { label: "会讲故事的", prompt: "我想做一个会讲故事的小东西。" },
  ],
  [
    { label: "会发光的", prompt: "我想做一个会发光的小东西。" },
    { label: "给家人看的", prompt: "我想做一个能给家人看的小东西。" },
  ],
  [
    { label: "会唱歌的", prompt: "我想做一个会唱歌的小东西。" },
    { label: "会画画的", prompt: "我想做一个会画画的小东西。" },
  ],
];

const MIDDLE: ZaowuChoice[][] = [
  [
    { label: "能玩的", prompt: "我想做一个能玩的小作品。" },
    { label: "能讲给同学听的", prompt: "我想做一个能讲给同学听的小作品。" },
    { label: "会发光的", prompt: "我想做一个会发光的小作品。" },
  ],
  [
    { label: "小故事", prompt: "我想做一本很短的小故事。" },
    { label: "小网页", prompt: "我想做一个能点的小网页。" },
    { label: "小游戏", prompt: "我想做一个规则很简单的小游戏。" },
  ],
];

const OLDER: ZaowuChoice[][] = [
  [
    { label: "我有点子", prompt: "我已经有一个点子，我们从它开始。" },
    { label: "先看方向", prompt: "我还没有点子，先给我几个别人做过的方向。" },
  ],
  [
    { label: "改一个小网页", prompt: "我想先看一个很小的网页骨架，再改一处。" },
    { label: "写一个短故事", prompt: "我想一页一页做一个短故事。" },
  ],
];

export function guidanceDensity(
  age: number | null | undefined,
  ageBand: string | null | undefined,
): ZaowuDensity {
  if (typeof age === "number" && Number.isFinite(age)) {
    if (age <= 6) return "early";
    if (age <= 9) return "middle";
    return "older";
  }
  if (ageBand === "6-8") return "early";
  return "older";
}

export function makerOpening(
  density: ZaowuDensity,
  page = 0,
): ZaowuOpening {
  const decks = density === "early" ? EARLY : density === "middle" ? MIDDLE : OLDER;
  const choices = decks[Math.abs(page) % decks.length] ?? decks[0];
  const heading =
    density === "early"
      ? "今天我们做个小东西，给家人看。"
      : density === "middle"
        ? "你想做一个能玩的，还是能讲给同学听的？"
        : "今天做作品。你已经有点子了，还是先看几个方向？";
  return { heading, choices, swapLabel: "换一批" };
}

/** Home capability ids a learner grant actually allows. Empty value is chat. */
export function learnerCapabilityAllowed(
  allowed: readonly string[] | null | undefined,
  value: string,
): boolean {
  if (!allowed) return true;
  return allowed.includes(value || "chat");
}

export function isLearnerHome(learningPolicy: { allowedSurfaces?: string[] } | null | undefined): boolean {
  return Boolean(learningPolicy);
}

/** Sidebar header the learner sees. The workspace name stays for other accounts. */
export function learnerSidebarLabel(
  learner: boolean,
  workspaceName: string,
  zaowuLabel: string,
): string {
  return learner ? zaowuLabel : workspaceName;
}

/**
 * Composer style chip. A locked learner persona wins over an empty client
 * selection, which otherwise renders as the adult "Default" label.
 */
export function learnerStyleLabel(options: {
  selected?: string;
  lockedPersona?: string;
  personas?: readonly { name: string; title?: string }[];
  defaultLabel: string;
  zaowuLabel?: string;
}): string {
  const id = (options.lockedPersona || options.selected || "").trim();
  if (!id) return options.defaultLabel;
  const title = options.personas?.find((item) => item.name === id)?.title?.trim();
  if (title) return title;
  if (id === "zaowu") return options.zaowuLabel || "造物";
  return id;
}

/**
 * What 「看别的」 sends. It asks for a different pair of pictured choices.
 * It is not shown as the child's own bubble and it is not stored as one.
 */
export const MAKER_OTHER_CHOICES_PROMPT =
  "再换两个不一样的小点子。先问「你想先做哪一个？」，然后只写两行，一行一个，写成 1. 和 2.。不要和刚才的两个一样。";

/** The line a listening child needs before picture choices. */
export const MAKER_CHOICE_INVITATION = "你想先做哪一个？";

/** The reply already asks which picture to tap next. */
export function makerInvitesChoice(text: string): boolean {
  return text.includes("先做哪一个");
}

/**
 * Picture choices have to invite the next tap even when the model only
 * praises. The same string is shown above the cards and read aloud.
 */
export function withMakerChoiceInvitation(text: string): string {
  const body = text.trim();
  if (makerInvitesChoice(body)) return body;
  if (!body) return MAKER_CHOICE_INVITATION;
  const gap = /[。！？!?]$/.test(body) ? "" : "。";
  return `${body}${gap}\n\n${MAKER_CHOICE_INVITATION}`;
}

/** Short numbered options the maker shell turns into send buttons. */
export function makerChoiceLines(text: string): string[] {
  const choices: string[] = [];
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*\d+[.、)]\s+(.+?)\s*$/);
    if (!match) continue;
    const label = match[1].trim();
    if (label && label.length <= 40) choices.push(label);
  }
  if (choices.length < 2 || choices.length > 3) return [];
  return choices;
}

/**
 * The maker shell turns those short numbered lines into buttons. Once the
 * buttons are on screen, the same lines should not also sit in the answer
 * as a numbered list.
 */
export function withoutMakerChoiceLines(text: string, choices: string[]): string {
  if (choices.length === 0) return text;
  const drop = new Set(choices);
  const kept = text.split("\n").filter((line) => {
    const match = line.match(/^\s*\d+[.、)]\s+(.+?)\s*$/);
    return !(match && drop.has(match[1].trim()));
  });
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * A picture a child can tap without reading the label. More specific words
 * win, so 「会跳的小球」 is a ball and 「会动的」 stays a motion mark.
 */
export type MakerPicture =
  | "ball"
  | "star"
  | "story"
  | "classmates"
  | "family"
  | "web"
  | "game"
  | "play"
  | "music"
  | "draw"
  | "animal"
  | "fish"
  | "idea"
  | "direction"
  | "pinwheel"
  | "motion"
  | "swap"
  | "glow"
  | "spark";

const PICTURE_RULES: ReadonlyArray<readonly [RegExp, MakerPicture]> = [
  [/光|亮/, "glow"],
  [/鱼/, "fish"],
  [/球/, "ball"],
  [/星/, "star"],
  [/故事|书/, "story"],
  [/同学|讲给/, "classmates"],
  [/家人|家里/, "family"],
  [/网页|页面/, "web"],
  [/游戏/, "game"],
  [/玩/, "play"],
  [/歌|唱|音乐/, "music"],
  [/画|颜色|涂/, "draw"],
  [/猫|狗|动物|鸟/, "animal"],
  [/主意|点子|想法/, "idea"],
  [/方向/, "direction"],
  [/风车/, "pinwheel"],
  [/动|转|摆|跳|风/, "motion"],
];

export function makerPicture(label: string): MakerPicture {
  for (const [pattern, picture] of PICTURE_RULES) {
    if (pattern.test(label)) return picture;
  }
  return "spark";
}

/** 5–6 and 7–9 get a picture. 10–12 stays words. */
export function makerShowsPictures(density: ZaowuDensity): boolean {
  return density === "early" || density === "middle";
}

/** Only the youngest band is spoken. Older bands are not read aloud for them. */
export function makerSpeaks(density: ZaowuDensity): boolean {
  return density === "early";
}

/** One utterance: the prompt, then each choice, with a pause between them. */
export function spokenMakerPrompt(heading: string, choices: readonly string[]): string {
  const lead = heading.replace(/\s+/g, " ").trim();
  const labels = choices.map((item) => item.trim()).filter(Boolean);
  const options = labels
    .map((label, index) => (index === 0 ? label : `或者，${label}`))
    .join("。");
  if (!lead) return options ? `${options}。` : "";
  if (!options) return lead;
  const gap = /[。！？]$/.test(lead) ? "" : "。";
  return `${lead}${gap}${options}。`;
}

/**
 * What a learner may see on a tool row. `zaowu` becomes 造物. Any other
 * bare skill or tool slug is dropped so the row keeps only its verb.
 */
export function learnerActivityLabel(value: string | null | undefined): string | null {
  if (value == null) return null;
  const rewritten = value.replace(/\bzaowu\b/gi, "造物").trim();
  if (!rewritten) return null;
  if (/^[a-z][a-z0-9_-]{1,48}$/.test(rewritten)) return null;
  return rewritten;
}

/** Empty-composer line. A continuation hint still wins once a chat has one. */
export function composerPlaceholder(options: {
  learner: boolean;
  hint?: string;
  maker: string;
  adult: string;
}): string {
  const hint = options.hint?.trim();
  if (hint) return hint;
  return options.learner ? options.maker : options.adult;
}
