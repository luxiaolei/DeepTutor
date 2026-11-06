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
    { label: "会出主意的", prompt: "我想做一个会出主意的小东西。" },
    { label: "给家人看的", prompt: "我想做一个能给家人看的小东西。" },
  ],
];

const MIDDLE: ZaowuChoice[][] = [
  [
    { label: "能玩的", prompt: "我想做一个能玩的小作品。" },
    { label: "能讲给同学听的", prompt: "我想做一个能讲给同学听的小作品。" },
    { label: "我自己的点子", prompt: "我有一个自己的点子，想先说说。" },
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
      ? "今天我们一起做一个能给家人看的小东西。"
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
