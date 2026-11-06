import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { WorkspaceMenu } from "@/components/sidebar/WorkspaceMenu";

const fixture = vi.hoisted(() => ({ learner: false }));

vi.mock("@/hooks/useAuthStatus", () => ({
  useAuthStatus: () => ({
    learningPolicy: fixture.learner
      ? { lockedPersona: "zaowu", allowedSurfaces: ["chat"], allowedCapabilities: [], ageBand: "6-8" }
      : null,
  }),
}));

vi.mock("@/components/workspaces/useWorkspaceChoices", () => ({
  useWorkspaceChoices: () => ({
    active: "",
    currentName: "General workspace",
    choices: [{ workspace_id: "", display_name: "General workspace" }],
    choose: () => undefined,
  }),
}));

vi.mock("@/components/sidebar/VersionBadge", () => ({ VersionBadge: () => null }));
vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => (key === "Zaowu" ? "造物" : key),
  }),
}));

it("keeps the workspace name for an ordinary account", () => {
  fixture.learner = false;
  render(<WorkspaceMenu />);
  expect(screen.getByRole("button", { name: /General workspace/ })).toBeInTheDocument();
});

it("shows 造物 as the learner sidebar header", () => {
  fixture.learner = true;
  render(<WorkspaceMenu />);
  expect(screen.getByText("造物")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /General workspace/ })).not.toBeInTheDocument();
});
