import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import MakerOpening from "@/components/chat/home/MakerOpening";

it("sends the maker chip text when the child taps it", () => {
  const onPick = vi.fn();
  render(<MakerOpening density="early" onPick={onPick} />);
  fireEvent.click(screen.getByRole("button", { name: "会动的" }));
  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onPick).toHaveBeenCalledWith("我想做一个会动的小东西。");
});
