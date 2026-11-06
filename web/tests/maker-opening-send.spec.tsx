import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MakerChoiceRow } from "@/components/chat/home/MakerChoices";
import MakerOpening from "@/components/chat/home/MakerOpening";
import { resetMakerSpeechMemory } from "@/lib/maker-speech";

beforeEach(() => {
  resetMakerSpeechMemory();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function installSpeech() {
  const speak = vi.fn();
  const cancel = vi.fn();
  vi.stubGlobal("speechSynthesis", { speak, cancel });
  vi.stubGlobal(
    "SpeechSynthesisUtterance",
    class {
      lang = "";
      rate = 1;
      constructor(public text: string) {}
    },
  );
  return { speak, cancel };
}

it("sends the maker chip text when the child taps it", () => {
  installSpeech();
  const onPick = vi.fn();
  render(<MakerOpening density="early" onPick={onPick} />);
  const chip = screen.getByRole("button", { name: "会动的" });
  expect(chip.querySelector("[data-maker-picture='motion']")).toBeTruthy();
  expect(screen.getByRole("button", { name: "换一批" }).querySelector("[data-maker-picture='swap']")).toBeTruthy();
  fireEvent.click(chip);
  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onPick).toHaveBeenCalledWith("我想做一个会动的小东西。");
});

it("speaks the youngest opening and keeps a speaker the parent can tap", async () => {
  const { speak } = installSpeech();
  render(<MakerOpening density="early" onPick={vi.fn()} />);
  expect(screen.getByRole("button", { name: "会讲故事的" }).querySelector("[data-maker-picture='story']")).toBeTruthy();
  expect(screen.getByText("请坐在旁边，让孩子点图。")).toBeVisible();
  const speaker = screen.getByRole("button", { name: "再听一遍" });
  expect(speaker).toHaveTextContent("再听一遍");
  await waitFor(() => expect(speak).toHaveBeenCalled());
  const spoken = speak.mock.calls.at(-1)?.[0] as { text: string };
  expect(spoken.text).toContain("会动的");
  expect(spoken.text).toContain("会讲故事的");
  fireEvent.click(speaker);
  expect(speak.mock.calls.length).toBeGreaterThan(1);
});

it("shows a picture with short words for ages 7 to 9 and does not speak", async () => {
  const { speak } = installSpeech();
  render(<MakerOpening density="middle" onPick={vi.fn()} />);
  const chip = screen.getByRole("button", { name: "能玩的" });
  expect(chip.querySelector("[data-maker-picture='play']")).toBeTruthy();
  expect(chip).toHaveTextContent("能玩的");
  expect(screen.getByRole("button", { name: "换一批" }).querySelector("[data-maker-picture='swap']")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "再听一遍" })).toBeNull();
  await act(async () => {});
  expect(speak).not.toHaveBeenCalled();
});

it("keeps ages 10 to 12 as tappable words", async () => {
  const { speak } = installSpeech();
  render(<MakerOpening density="older" onPick={vi.fn()} />);
  const chip = screen.getByRole("button", { name: "我有点子" });
  expect(chip.querySelector("[data-maker-picture]")).toBeNull();
  expect(screen.getByRole("button", { name: "换一批" }).querySelector("[data-maker-picture]")).toBeNull();
  expect(chip).toHaveTextContent("我有点子");
  expect(screen.queryByRole("button", { name: "再听一遍" })).toBeNull();
  await act(async () => {});
  expect(speak).not.toHaveBeenCalled();
});

it("speaks and illustrates the next choices for the youngest band", async () => {
  const { speak } = installSpeech();
  const onPick = vi.fn();
  render(
    <MakerChoiceRow
      density="early"
      heading="你想做哪一种？"
      choices={["会跳的小球", "会摆尾的小鱼"]}
      onPick={onPick}
    />,
  );
  const ball = screen.getByRole("button", { name: "会跳的小球" });
  const fish = screen.getByRole("button", { name: "会摆尾的小鱼" });
  const speaker = screen.getByRole("button", { name: "再听一遍" });
  expect(ball.querySelector("[data-maker-picture='ball']")).toBeTruthy();
  expect(fish.querySelector("[data-maker-picture='fish']")).toBeTruthy();
  expect(ball.parentElement?.contains(fish)).toBe(true);
  expect(ball.parentElement?.contains(speaker)).toBe(false);
  await waitFor(() => expect(speak).toHaveBeenCalled());
  const spoken = speak.mock.calls.at(-1)?.[0] as { text: string };
  expect(spoken.text).toContain("你想做哪一种");
  expect(spoken.text).toContain("会跳的小球");
  fireEvent.click(screen.getByRole("button", { name: "会跳的小球" }));
  expect(onPick).toHaveBeenCalledWith("会跳的小球");
});

it("keeps later-age next choices as words and does not speak them", async () => {
  const { speak } = installSpeech();
  render(
    <MakerChoiceRow
      density="older"
      heading="你想做哪一种？"
      choices={["会跳的小球", "先写一个故事"]}
      onPick={vi.fn()}
    />,
  );
  expect(screen.getByRole("button", { name: "会跳的小球" }).querySelector("[data-maker-picture]")).toBeNull();
  expect(screen.queryByRole("button", { name: "再听一遍" })).toBeNull();
  await act(async () => {});
  expect(speak).not.toHaveBeenCalled();
});
