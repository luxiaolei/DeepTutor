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
  "再看两个不一样的。我还没选，先不要做出来。";

/** Placeholder once a picture has been chosen. The choice screen keeps the shorter line. */
export const MAKER_AFTER_PICK_PLACEHOLDER = "先点上面的按钮试试。";

/** Placeholder while the toy is being made and there is nothing to tap yet. */
export const MAKER_MAKING_PLACEHOLDER = "我们正在做，马上就好。";

/**
 * Composer line for a learner. Choosing a topic again (after 「还想做另一个吗？」)
 * uses the choice-screen line. Generating a toy says we are making it.
 * A ready preview asks them to tap the button above.
 */
export function makerComposerLine(options: {
  messages: ReadonlyArray<{ role: string; content: string }>;
  streaming: boolean;
  choosing: string;
}): string {
  const latestAssistant = [...options.messages].reverse().find((message) => message.role === "assistant");
  const choosingAgain = Boolean(
    latestAssistant &&
    latestAssistant.content.includes("还想做另一个") &&
    makerChoiceLines(latestAssistant.content).length >= 2,
  );
  const picked = options.messages.some(
    (message) => message.role === "user" && makerPickStarted(message.content),
  );
  if (choosingAgain && !options.streaming) return options.choosing;
  if (options.streaming && picked) return MAKER_MAKING_PLACEHOLDER;
  if (picked) return MAKER_AFTER_PICK_PLACEHOLDER;
  return options.choosing;
}

/** Sent after the child taps the button inside the toy. Not shown as their bubble. */
export function makerTriedPrompt(label: string): string {
  const name = label.replace(/\s+/g, "").slice(0, 16);
  return name ? `我试过了：${name}。先别改。` : "我试过了。先别改。";
}

/** The short line spoken the moment the in-toy button is tapped. */
export function makerTriedReaction(label: string): string {
  if (label.includes("飞")) return "飞起来了！";
  if (label.includes("跳")) return "跳起来了！";
  if (label.includes("转")) return "转起来了！";
  if (label.includes("摆")) return "摆起来了！";
  return "真好看！";
}

/** Said the moment a picture card is tapped, before any making starts. */
export function makerPickAck(choice: string): string {
  const name = choice.trim() || "这个";
  return `好，我们就做${name}。`;
}

/** A real pick, not the opening direction and not the hidden 「看别的」 ask. */
export function makerPickStarted(text: string): boolean {
  const value = text.trim();
  if (!value || value === MAKER_OTHER_CHOICES_PROMPT || value.startsWith("我试过了")) return false;
  if (value.includes("我想做")) return false;
  return true;
}

/** Words beside a first preview. The child hears the next tap, never the source. */
export function makerPreviewWords(content: string, html: string, title: string): string {
  const button = html.match(/<button\b[^>]*>([^<]{1,16})<\/button>/i)?.[1]?.replace(/\s+/g, "").trim();
  const cue = button ? `点「${button}」试试，再给旁边的人看。` : "看一看，再给旁边的人看。";
  const prose = content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const looksLikeSource =
    !prose ||
    prose.length > 80 ||
    /[{};]|function |const |<!|@keyframes|animation:/.test(prose);
  if (looksLikeSource) return cue;
  if (button && prose.includes(button) && prose.includes("试试")) {
    return prose.includes("旁边的人") ? prose : `${prose.replace(/。$/, "")}，再给旁边的人看。`;
  }
  void title;
  return cue;
}

/** The line a listening child needs before picture choices. */
export const MAKER_CHOICE_INVITATION = "你想先做哪一个？";

/** The reply already asks which picture to tap next. */
export function makerInvitesChoice(text: string): boolean {
  // 「还是」 is the how-it-should-be question (跳得高高，还是轻轻跳跳).
  // The topic question stays 「你想先做哪一个？」.
  return text.includes("先做哪一个") || text.includes("还是") || text.includes("还想做另一个");
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

const CHOICE_LINE = /^\s*(?:[-*]\s+)?\d+\s*[.．。、)）]\s*(.+?)\s*$/;

function choiceLabel(raw: string): string | null {
  const cleaned = raw.replace(/\*+/g, "").trim();
  if (!cleaned || cleaned.length > 40) return null;
  return cleaned;
}

function choiceSource(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n1. ")
    .replace(/<\/li>/gi, "\n");
}

/** Short numbered options the maker shell turns into send buttons. */
export function makerChoiceLines(text: string): string[] {
  const choices: string[] = [];
  for (const line of choiceSource(text).split("\n")) {
    const match = line.match(CHOICE_LINE);
    if (!match) continue;
    const label = choiceLabel(match[1] ?? "");
    if (label) choices.push(label);
  }
  const picked =
    choices.length > 3 ? choices.filter((label) => label.length <= 16) : choices;
  if (picked.length < 2 || picked.length > 3) return [];
  return picked;
}

/**
 * The maker shell turns those short numbered lines into buttons. Once the
 * buttons are on screen, the same lines should not also sit in the answer
 * as a numbered list.
 */
export function withoutMakerChoiceLines(text: string, choices: string[]): string {
  if (choices.length === 0) return text;
  const drop = new Set(choices);
  const withoutItems = text.replace(/<li\b[^>]*>\s*([^<]*?)\s*<\/li>/gi, (whole, inner: string) => {
    const label = choiceLabel(inner.replace(/^\d+\s*[.．。、)）]\s*/, ""));
    return label && drop.has(label) ? "" : whole;
  });
  const kept = withoutItems.split("\n").filter((line) => {
    const match = line.match(CHOICE_LINE);
    const label = match ? choiceLabel(match[1] ?? "") : null;
    return !(label && drop.has(label));
  });
  return kept
    .join("\n")
    .replace(/<(ol|ul)\b[^>]*>\s*<\/\1>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * While a choice reply is still being written, drop lines that are already
 * a numbered option. A child who cannot read should not see `1.` before
 * the pictures are ready.
 */
export function withoutInProgressChoiceLines(text: string): string {
  const kept = text.split("\n").filter((line) => {
    if (CHOICE_LINE.test(line)) return false;
    return !/^\s*\d+\s*[.．。、)）]?\s*$/.test(line);
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
  | "red"
  | "blue"
  | "high"
  | "gentle"
  | "pinwheel"
  | "butterfly"
  | "tree"
  | "motion"
  | "swap"
  | "glow"
  | "spark";

const PICTURE_RULES: ReadonlyArray<readonly [RegExp, MakerPicture]> = [
  [/光|亮/, "glow"],
  [/蝴蝶/, "butterfly"],
  [/树/, "tree"],
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
  [/红/, "red"],
  [/蓝/, "blue"],
  [/高高|跳得高/, "high"],
  [/轻轻/, "gentle"],
  [/快/, "motion"],
  [/风车|转得|慢慢转/, "pinwheel"],
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
