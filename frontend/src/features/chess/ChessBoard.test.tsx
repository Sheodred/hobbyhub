import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Chess } from "chess.js";
import { describe, expect, it, vi } from "vitest";

import { ChessBoard } from "./ChessBoard";

describe("ChessBoard", () => {
  it("renders all 32 starting pieces", () => {
    render(<ChessBoard chess={new Chess()} disabled={false} onMove={vi.fn()} />);

    expect(screen.getByRole("gridcell", { name: "e2, white p" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "e7, black p" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "e1, white k" })).toBeInTheDocument();
    expect(screen.getAllByRole("gridcell")).toHaveLength(64);
  });

  it("calls onMove when a legal destination is clicked after selecting a piece", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<ChessBoard chess={new Chess()} disabled={false} onMove={onMove} />);

    await user.click(screen.getByRole("gridcell", { name: "e2, white p" }));
    await user.click(screen.getByRole("gridcell", { name: "e4" }));

    expect(onMove).toHaveBeenCalledWith("e2", "e4");
  });

  it("does not call onMove when clicking a square that isn't a legal target", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<ChessBoard chess={new Chess()} disabled={false} onMove={onMove} />);

    await user.click(screen.getByRole("gridcell", { name: "e2, white p" }));
    // e5 is two squares further than a pawn can move on its first push.
    await user.click(screen.getByRole("gridcell", { name: "e5" }));

    expect(onMove).not.toHaveBeenCalled();
  });

  it("flips the square order when orientation is black", () => {
    render(<ChessBoard chess={new Chess()} disabled={false} onMove={vi.fn()} orientation="black" />);

    const cells = screen.getAllByRole("gridcell");
    // White's view (default) starts at a8, ends at h1. Black's view mirrors
    // that: the board is rotated 180°, so it starts at h1 and ends at a8.
    expect(cells[0]).toHaveAccessibleName("h1, white r");
    expect(cells[cells.length - 1]).toHaveAccessibleName("a8, black r");
  });

  // role="grid" promises the composite-widget keyboard pattern: the grid is a
  // single tab stop and arrow keys move within it. Every square used to be a
  // tab stop, so reaching h1 cost ~64 presses (#51).
  it("exposes the board as a single tab stop", () => {
    render(<ChessBoard chess={new Chess()} disabled={false} onMove={vi.fn()} />);

    const cells = screen.getAllByRole("gridcell");
    const tabbable = cells.filter((cell) => cell.getAttribute("tabindex") === "0");

    expect(tabbable).toHaveLength(1);
    expect(cells.filter((cell) => cell.getAttribute("tabindex") === "-1")).toHaveLength(63);
  });

  it("moves focus with the arrow keys and carries the tab stop along", async () => {
    const user = userEvent.setup();
    render(<ChessBoard chess={new Chess()} disabled={false} onMove={vi.fn()} />);

    const a8 = screen.getByRole("gridcell", { name: "a8, black r" });
    act(() => a8.focus());
    expect(a8).toHaveAttribute("tabindex", "0");

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("gridcell", { name: "b8, black n" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("gridcell", { name: "b7, black p" })).toHaveFocus();

    // The roving tab stop follows focus, so Tab re-entry lands where the user left.
    expect(screen.getByRole("gridcell", { name: "b7, black p" })).toHaveAttribute("tabindex", "0");
    expect(a8).toHaveAttribute("tabindex", "-1");
  });

  it("stops at the board edge instead of wrapping to the far side", async () => {
    const user = userEvent.setup();
    render(<ChessBoard chess={new Chess()} disabled={false} onMove={vi.fn()} />);

    const a8 = screen.getByRole("gridcell", { name: "a8, black r" });
    act(() => a8.focus());

    await user.keyboard("{ArrowLeft}{ArrowUp}");

    expect(a8).toHaveFocus();
  });

  // A gridcell must live inside a row, or the grid's structure is malformed
  // and screen readers cannot announce "row 3, column 5".
  it("groups the squares into eight rows", () => {
    render(<ChessBoard chess={new Chess()} disabled={false} onMove={vi.fn()} />);

    const rows = screen.getAllByRole("row");

    expect(rows).toHaveLength(8);
    rows.forEach((row) => {
      expect(row.querySelectorAll('[role="gridcell"]')).toHaveLength(8);
    });
  });

  it("ignores clicks entirely when disabled", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<ChessBoard chess={new Chess()} disabled onMove={onMove} />);

    await user.click(screen.getByRole("gridcell", { name: "e2, white p" }));
    await user.click(screen.getByRole("gridcell", { name: "e4" }));

    expect(onMove).not.toHaveBeenCalled();
  });
});
