/**
 * Speak a maker prompt with the browser speech API.
 *
 * Immersive Reading already hands text to this same API (`browser_speech`).
 * The maker journey uses it directly so a 5–6 sitting does not call a TTS
 * provider.
 */

export interface MakerUtterancePlan {
  text: string;
  lang: string;
  rate: number;
}

const REPLAY_WINDOW_MS = 8000;
let lastSpokenText = "";
let lastSpokenAt = 0;

export function planMakerSpeech(text: string, locale = "zh-CN"): MakerUtterancePlan | null {
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken) return null;
  return { text: spoken, lang: locale, rate: 0.9 };
}

/** True when this exact line was just started, so a follow-up effect does not say it twice. */
export function recentlySpoken(text: string, now = Date.now()): boolean {
  return text.trim() === lastSpokenText && now - lastSpokenAt < REPLAY_WINDOW_MS;
}

export function speakMaker(text: string, locale = "zh-CN"): boolean {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") return false;
  const plan = planMakerSpeech(text, locale);
  if (!plan || typeof SpeechSynthesisUtterance === "undefined") return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(plan.text);
  utterance.lang = plan.lang;
  utterance.rate = plan.rate;
  lastSpokenText = plan.text;
  lastSpokenAt = Date.now();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopMakerSpeech(): void {
  if (typeof window === "undefined") return;
  window.speechSynthesis?.cancel();
  lastSpokenText = "";
  lastSpokenAt = 0;
}

/** Test hook. Production speech keeps its own short memory so a prompt is not said twice. */
export function resetMakerSpeechMemory(): void {
  lastSpokenText = "";
  lastSpokenAt = 0;
}
