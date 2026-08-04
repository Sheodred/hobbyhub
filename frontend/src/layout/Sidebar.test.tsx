import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { Sidebar } from "./Sidebar";

function renderSidebar() {
  return render(
    <MemoryRouter>
      <Sidebar>
        <div>main content</div>
      </Sidebar>
    </MemoryRouter>,
  );
}

// The collapse/expand/resize/persistence behavior itself relies on
// react-resizable-panels reading real layout (ResizeObserver-reported
// dimensions) that jsdom doesn't provide - calling the imperative
// collapse API in jsdom throws "Panel size not found" regardless of
// application correctness. That interactive behavior is verified manually
// against the running app instead; these tests cover what jsdom can
// actually exercise: structure and content.
describe("Sidebar", () => {
  it("shows the section nav by default", () => {
    renderSidebar();
    expect(screen.getByRole("navigation", { name: "Sections" })).toBeInTheDocument();
  });

  it("renders a collapse toggle button", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
  });

  it("always renders the passed-in main content", () => {
    renderSidebar();
    expect(screen.getByText("main content")).toBeInTheDocument();
  });
});
