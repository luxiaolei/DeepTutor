/**
 * Read a maker prompt with Qwen TTS through `/api/voice/tts`.
 *
 * Ages 5–6 do not use the browser speech synthesizer. That voice is the stiff
 * one this path replaces. The DashScope key stays on the server.
 */

export interface MakerUtterancePlan {
  text: string;
  lang: string;
  rate: number;
}

export const MAKER_SPEECH_RETRY = "这次没听成，再点一次。";

const REPLAY_WINDOW_MS = 8000;
const FAILURE_EVENT = "zaowu-maker-speech";
let lastSpokenText = "";
let lastSpokenAt = 0;
let current: HTMLAudioElement | null = null;
const clipUrls = new Map<string, string>();

export function planMakerSpeech(text: string, locale = "zh-CN"): MakerUtterancePlan | null {
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken) return null;
  return { text: spoken, lang: locale, rate: 1 };
}

/** True when this exact line was just started, so a follow-up effect does not say it twice. */
export function recentlySpoken(text: string, now = Date.now()): boolean {
  return text.trim() === lastSpokenText && now - lastSpokenAt < REPLAY_WINDOW_MS;
}

function notifyFailure(failed: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(FAILURE_EVENT, { detail: { failed } }));
}

export function subscribeMakerSpeechFailure(listener: (failed: boolean) => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onEvent = (event: Event) => {
    listener(Boolean((event as CustomEvent<{ failed?: boolean }>).detail?.failed));
  };
  window.addEventListener(FAILURE_EVENT, onEvent);
  return () => window.removeEventListener(FAILURE_EVENT, onEvent);
}

function silentWavUrl(): string {
  const samples = 400;
  const dataBytes = samples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 8000, true);
  view.setUint32(28, 16000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataBytes, true);
  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

async function clipUrl(text: string): Promise<string> {
  const cached = clipUrls.get(text);
  if (cached) return cached;
  const { apiFetch, apiUrl } = await import("@/lib/api");
  const response = await apiFetch(apiUrl("/api/voice/tts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, maker: true }),
  });
  if (!response.ok) throw new Error("maker-tts");
  const blob = await response.blob();
  if (!blob.size) throw new Error("maker-tts");
  if (blob.type && !blob.type.startsWith("audio/")) throw new Error("maker-tts");
  const url = URL.createObjectURL(blob);
  clipUrls.set(text, url);
  return url;
}

export async function speakMaker(text: string): Promise<boolean> {
  const plan = planMakerSpeech(text);
  if (!plan || typeof Audio === "undefined") return false;
  notifyFailure(false);
  if (current) {
    current.pause();
    current = null;
  }
  lastSpokenText = plan.text;
  lastSpokenAt = Date.now();
  const unlockUrl = silentWavUrl();
  const audio = new Audio(unlockUrl);
  current = audio;
  void audio.play().catch(() => undefined);
  try {
    const url = await clipUrl(plan.text);
    if (current !== audio) return true;
    audio.src = url;
    audio.load();
    await audio.play();
    URL.revokeObjectURL(unlockUrl);
    return true;
  } catch {
    URL.revokeObjectURL(unlockUrl);
    if (current === audio) current = null;
    // A blocked autoplay is not a synthesis failure. The button can retry
    // inside a tap. A failed request must not fall back to the browser voice.
    if (!clipUrls.has(plan.text)) notifyFailure(true);
    return false;
  }
}

export function stopMakerSpeech(): void {
  if (current) {
    current.pause();
    current = null;
  }
  lastSpokenText = "";
  lastSpokenAt = 0;
}

/** Test hook. Production speech keeps its own short memory so a prompt is not said twice. */
export function resetMakerSpeechMemory(): void {
  stopMakerSpeech();
  notifyFailure(false);
}
