"use client";

import { useState } from "react";
import {
  MakerChoiceButton,
  MakerSpeakerButton,
  useSpokenMakerPrompt,
} from "@/components/chat/home/MakerChoices";
import { makerOpening, makerSpeaks, spokenMakerPrompt, type ZaowuDensity } from "@/lib/zaowu-home";

/**
 * Active first screen for a learner sitting with a parent.
 * The assistant offers a few bounded choices instead of waiting for a prompt.
 */
export function ParentStartConfirm({
  busy,
  onConfirm,
}: {
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col items-center gap-4 text-center">
      <h1 className="font-serif text-[32px] font-medium leading-[1.25] text-[var(--foreground)]">
        {"家长在旁边吗？"}
      </h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        {"确认之后，我们再开始这一次。设备请放在家长手里。"}
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={onConfirm}
        className="min-h-14 rounded-2xl bg-[var(--foreground)] px-8 text-lg font-medium text-[var(--background)] disabled:opacity-50"
      >
        {"我在旁边，开始这一次"}
      </button>
    </div>
  );
}

export default function MakerOpening({
  density,
  onPick,
  disabled = false,
}: {
  density: ZaowuDensity;
  onPick: (prompt: string) => void;
  disabled?: boolean;
}) {
  const [page, setPage] = useState(0);
  const opening = makerOpening(density, page);
  const labels = opening.choices.map((choice) => choice.label);
  const spoken = spokenMakerPrompt(opening.heading, labels);
  const speak = makerSpeaks(density);
  useSpokenMakerPrompt(speak, spoken);

  return (
    <div className="flex w-full flex-col items-center gap-6" data-maker-density={density}>
      <h1 className="max-w-[18em] text-center font-serif text-[32px] font-medium leading-[1.25] tracking-[-0.015em] text-[var(--foreground)] sm:text-[40px]">
        {opening.heading}
      </h1>
      {speak ? <MakerSpeakerButton text={spoken} /> : null}
      <div
        className={
          "flex w-full max-w-[640px] flex-wrap items-stretch justify-center " +
          (density === "early" ? "gap-3" : "gap-2")
        }
      >
        {opening.choices.map((choice) => (
          <MakerChoiceButton
            key={choice.prompt}
            label={choice.label}
            density={density}
            disabled={disabled}
            onClick={() => onPick(choice.prompt)}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setPage((current) => current + 1)}
        className="text-sm text-[var(--muted-foreground)] underline-offset-2 hover:underline disabled:opacity-50"
      >
        {opening.swapLabel}
      </button>
    </div>
  );
}
