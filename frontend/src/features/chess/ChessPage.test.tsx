import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChessPage } from "./ChessPage";

const getBestMove = vi.fn();
const terminate = vi.fn();

vi.mock("./stockfishEngine", () => ({
  createStockfishEngine: () => ({ getBestMove, terminate }),
}));

describe("ChessPage", () => {
  beforeEach(() => {
    localStorage.clear();
    getBestMove.mockReset();
    terminate.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders a fresh board with White to move", () => {
    render(<ChessPage />);

    expect(screen.getByRole("status")).toHaveTextContent("White to move.");
    expect(screen.getByRole("gridcell", { name: "e2, white p" })).toBeInTheDocument();
  });

  it("sends the player's move to the engine and applies its reply", async () => {
    const user = userEvent.setup();
    getBestMove.mockResolvedValue("e7e5");
    render(<ChessPage />);

    await user.click(screen.getByRole("gridcell", { name: "e2, white p" }));
    await user.click(screen.getByRole("gridcell", { name: "e4" }));

    expect(getBestMove).toHaveBeenCalledWith(expect.stringContaining(" b "), 8); // medium depth by default

    expect(await screen.findByRole("gridcell", { name: "e5, black p" })).toBeInTheDocument();
    // The board update (applyMove) and the "thinking" flag clear in separate
    // state updates a tick apart - wait for the status text specifically
    // rather than assuming it's settled the instant the board has.
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("White to move."));
  });

  it("uses the depth for the selected difficulty", async () => {
    const user = userEvent.setup();
    getBestMove.mockResolvedValue("e7e5");
    render(<ChessPage />);

    await user.selectOptions(screen.getByLabelText("Difficulty"), "hard");
    await user.click(screen.getByRole("gridcell", { name: "e2, white p" }));
    await user.click(screen.getByRole("gridcell", { name: "e4" }));

    expect(getBestMove).toHaveBeenCalledWith(expect.any(String), 15);
  });

  it("starting a new game resets the board", async () => {
    const user = userEvent.setup();
    getBestMove.mockResolvedValue("e7e5");
    render(<ChessPage />);

    await user.click(screen.getByRole("gridcell", { name: "e2, white p" }));
    await user.click(screen.getByRole("gridcell", { name: "e4" }));
    await screen.findByRole("gridcell", { name: "e5, black p" });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("White to move."));

    await user.click(screen.getByRole("button", { name: /new game/i }));

    expect(screen.getByRole("gridcell", { name: "e2, white p" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("White to move.");
  });
});
