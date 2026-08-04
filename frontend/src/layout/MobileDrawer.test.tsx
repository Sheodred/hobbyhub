import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { MobileDrawer } from "./MobileDrawer";

describe("MobileDrawer", () => {
  it("renders nothing when closed", () => {
    render(
      <MemoryRouter>
        <MobileDrawer open={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the nav and calls onClose from the close button when open", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <MobileDrawer open onClose={onClose} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("dialog", { name: "Navigation menu" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close navigation menu" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when a nav link is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <MobileDrawer open onClose={onClose} />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: "Home" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
