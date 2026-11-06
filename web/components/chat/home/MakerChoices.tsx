"use client";

import { useEffect, useState } from "react";
import { Volume2 } from "lucide-react";
import {
  makerPicture,
  makerShowsPictures,
  makerSpeaks,
  spokenMakerPrompt,
  type MakerPicture,
  type ZaowuDensity,
} from "@/lib/zaowu-home";
import {
  MAKER_SPEECH_RETRY,
  recentlySpoken,
  speakMaker,
  stopMakerSpeech,
  subscribeMakerSpeechFailure,
} from "@/lib/maker-speech";

const DISC: Record<MakerPicture, string> = {
  ball: "#ffb020",
  star: "#f2c14e",
  story: "#f0a07a",
  classmates: "#9bb7f5",
  family: "#f3a6b8",
  web: "#8ecae6",
  game: "#c4b5fd",
  play: "#8fd0a4",
  music: "#e7a0d0",
  draw: "#f0b429",
  animal: "#e8b089",
  fish: "#6eb5d0",
  idea: "#f6d36b",
  direction: "#86c5a6",
  pinwheel: "#f08b6a",
  motion: "#7eb6ff",
  swap: "#b7b0f0",
  glow: "#ffe08a",
  spark: "#f6c945",
};

function PictureShape({ name }: { name: MakerPicture }) {
  const ink = "#3f3428";
  switch (name) {
    case "ball":
      return (
        <>
          <circle cx="24" cy="25" r="14" fill={ink} />
          <path d="M12 22c4-7 12-8 18-2" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="31" cy="18" r="2.4" fill="#fff" />
        </>
      );
    case "star":
      return (
        <polygon
          fill={ink}
          points="24,8 28,18 39,19 31,26 33,37 24,31 15,37 17,26 9,19 20,18"
        />
      );
    case "story":
      return (
        <path
          fill={ink}
          d="M10 12h12c2 0 4 1 6 2 2-1 4-2 6-2h4v24h-4c-2 0-4 1-6 2-2-1-4-2-6-2H10V12z"
        />
      );
    case "classmates":
      return (
        <>
          <circle cx="17" cy="20" r="6" fill={ink} />
          <circle cx="31" cy="20" r="6" fill={ink} />
          <path fill={ink} d="M8 36c1-6 5-8 9-8s8 2 9 8H8zm14 0c1-6 5-8 9-8s8 2 9 8H22z" />
        </>
      );
    case "family":
      return (
        <path fill={ink} d="M8 22 L24 10 L40 22 V38 H30 V28 H18 V38 H8 Z" />
      );
    case "web":
      return (
        <>
          <rect x="8" y="10" width="32" height="24" rx="3" fill={ink} />
          <rect x="12" y="16" width="24" height="3" fill="#fff" />
          <rect x="12" y="22" width="16" height="3" fill="#fff" />
        </>
      );
    case "game":
      return <polygon fill={ink} points="18,12 36,24 18,36" />;
    case "play":
      return <rect x="12" y="14" width="24" height="20" rx="4" fill={ink} />;
    case "music":
      return (
        <path
          fill={ink}
          d="M20 34V16l16-4v16c0 3-2 5-5 5s-5-2-5-5 2-5 5-5V16"
        />
      );
    case "draw":
      return (
        <>
          <ellipse cx="20" cy="28" rx="12" ry="8" fill={ink} />
          <circle cx="14" cy="26" r="2" fill="#fff" />
          <circle cx="20" cy="24" r="2" fill="#fff" />
          <circle cx="26" cy="27" r="2" fill="#fff" />
          <path d="M28 20l12-12" fill="none" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
          <path d="M36 6l6 2-2 6-4-2z" fill={ink} />
        </>
      );
    case "animal":
      return (
        <>
          <polygon points="14,18 10,8 20,14" fill={ink} />
          <polygon points="34,18 38,8 28,14" fill={ink} />
          <circle cx="24" cy="26" r="10" fill={ink} />
        </>
      );
    case "fish":
      return (
        <>
          <polygon points="12,24 4,14 4,34" fill={ink} />
          <ellipse cx="28" cy="24" rx="14" ry="9" fill={ink} />
          <circle cx="36" cy="21" r="1.8" fill="#fff" />
          <path d="M22 16c2 3 2 13 0 16" fill="none" stroke="#fff" strokeWidth="1.6" />
        </>
      );
    case "glow":
      return (
        <>
          <circle cx="24" cy="24" r="7" fill={ink} />
          <path
            d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5L37 37M37 11l-3.5 3.5M14.5 33.5L11 37"
            fill="none"
            stroke={ink}
            strokeWidth="3"
            strokeLinecap="round"
          />
        </>
      );
    case "swap":
      return (
        <>
          <path
            d="M16 14h16l-4-5"
            fill="none"
            stroke={ink}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M32 34H16l4 5"
            fill="none"
            stroke={ink}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );
    case "idea":
      return (
        <>
          <circle cx="24" cy="20" r="10" fill={ink} />
          <rect x="20" y="30" width="8" height="8" rx="1" fill={ink} />
        </>
      );
    case "direction":
      return <polygon fill={ink} points="24,8 40,36 24,30 8,36" />;
    case "pinwheel":
      return (
        <>
          <path d="M23 20c0-12 11-14 15-7-7 1-11 5-15 7z" fill={ink} />
          <path d="M25 20c12 0 14 11 7 15-1-7-5-11-7-15z" fill="#fff" />
          <path d="M25 22c0 12-11 14-15 7 7-1 11-5 15-7z" fill={ink} />
          <path d="M23 22c-12 0-14-11-7-15 1 7 5 11 7 15z" fill="#fff" />
          <circle cx="24" cy="21" r="3" fill={ink} />
          <path d="M24 28v14" fill="none" stroke={ink} strokeWidth="3.4" strokeLinecap="round" />
        </>
      );
    case "motion":
      return (
        <>
          <circle cx="30" cy="28" r="8" fill={ink} />
          <path d="M8 18c6-6 12-6 16 0" fill="none" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        </>
      );
    default:
      return (
        <polygon
          fill={ink}
          points="24,6 28,18 40,18 30,26 34,40 24,32 14,40 18,26 8,18 20,18"
        />
      );
  }
}

export function MakerPicture({ name, large }: { name: MakerPicture; large?: boolean }) {
  const size = large ? 76 : 32;
  return (
    <span
      data-maker-picture={name}
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: DISC[name] }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 48 48" aria-hidden>
        <PictureShape name={name} />
      </svg>
    </span>
  );
}

export function MakerChoiceButton({
  label,
  density,
  picture: pictureOverride,
  disabled = false,
  onClick,
}: {
  label: string;
  density: ZaowuDensity;
  /** Force a mark, such as the refresh card, instead of guessing from the words. */
  picture?: MakerPicture;
  disabled?: boolean;
  onClick: () => void;
}) {
  const early = density === "early";
  const picture = makerShowsPictures(density)
    ? pictureOverride ?? makerPicture(label)
    : null;
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onClick={() => {
        stopMakerSpeech();
        onClick();
      }}
      className={
        "rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[var(--foreground)]/30 disabled:opacity-50 " +
        (early
          ? "flex h-full min-h-36 w-full flex-col items-center justify-center gap-3 px-4 py-4"
          : picture
            ? "inline-flex min-h-12 items-center gap-2 px-4 py-3 text-base"
            : "min-h-12 px-4 py-3 text-base")
      }
    >
      {picture ? <MakerPicture name={picture} large={early} /> : null}
      <span className={early ? "text-sm text-[var(--muted-foreground)]" : ""}>{label}</span>
    </button>
  );
}

export function MakerSpeakerButton({ text }: { text: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => subscribeMakerSpeechFailure(setFailed), []);
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        data-maker-speak="true"
        aria-label={"再听一遍"}
        onClick={() => {
          void speakMaker(text);
        }}
        className="inline-flex h-14 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-5 text-base text-[var(--foreground)] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <Volume2 size={26} strokeWidth={1.7} aria-hidden />
        <span>{"再听一遍"}</span>
      </button>
      {failed ? (
        <p className="text-sm text-[var(--muted-foreground)]">{MAKER_SPEECH_RETRY}</p>
      ) : null}
    </div>
  );
}

/** Speak once when a youngest-band prompt appears. A tap on the speaker says it again. */
export function useSpokenMakerPrompt(enabled: boolean, text: string) {
  useEffect(() => {
    if (!enabled || !text.trim() || recentlySpoken(text)) return;
    void speakMaker(text);
    return () => stopMakerSpeech();
  }, [enabled, text]);
}

export function MakerChoiceRow({
  density,
  heading,
  choices,
  onPick,
}: {
  density: ZaowuDensity;
  heading: string;
  choices: readonly string[];
  onPick: (choice: string) => void;
}) {
  const spoken = spokenMakerPrompt(heading, choices);
  const speak = makerSpeaks(density);
  useSpokenMakerPrompt(speak, spoken);
  const early = density === "early";
  return (
    <div data-maker-choice-row="true" className="mt-3 flex w-full flex-col items-center gap-3">
      {speak ? <MakerSpeakerButton text={spoken} /> : null}
      <div
        className={
          early
            ? "grid w-full max-w-[640px] grid-cols-2 gap-3"
            : "flex w-full flex-wrap gap-2"
        }
      >
        {choices.map((choice) => (
          <MakerChoiceButton
            key={choice}
            label={choice}
            density={density}
            onClick={() => onPick(choice)}
          />
        ))}
      </div>
    </div>
  );
}
