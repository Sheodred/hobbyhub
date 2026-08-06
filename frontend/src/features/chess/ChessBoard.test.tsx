import { render, screen } from "@testing-library/react";
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

  it("ignores clicks entirely when disabled", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<ChessBoard chess={new Chess()} disabled onMove={onMove} />);

    await user.click(screen.getByRole("gridcell", { name: "e2, white p" }));
    await user.click(screen.getByRole("gridcell", { name: "e4" }));

    expect(onMove).not.toHaveBeenCalled();
  });
});
