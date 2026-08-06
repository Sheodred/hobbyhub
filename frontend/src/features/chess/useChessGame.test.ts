import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useChessGame } from "./useChessGame";

describe("useChessGame", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("accepts a legal move and updates the fen", () => {
    const { result } = renderHook(() => useChessGame());

    let accepted = false;
    act(() => {
      accepted = result.current.applyMove({ from: "e2", to: "e4" });
    });

    expect(accepted).toBe(true);
    expect(result.current.fen).toContain(" b "); // black to move next
  });

  it("rejects an illegal move without changing the game state", () => {
    const { result } = renderHook(() => useChessGame());
    const initialFen = result.current.fen;

    let accepted = true;
    act(() => {
      // Pawns can't jump three squares.
      accepted = result.current.applyMove({ from: "e2", to: "e5" });
    });

    expect(accepted).toBe(false);
    expect(result.current.fen).toBe(initialFen);
  });

  it("newGame resets to the starting position", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.applyMove({ from: "e2", to: "e4" });
    });
    act(() => {
      result.current.newGame();
    });

    expect(result.current.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  });

  it("persists the game to localStorage and restores it in a fresh hook instance", () => {
    const { result: first } = renderHook(() => useChessGame());
    act(() => {
      first.current.applyMove({ from: "e2", to: "e4" });
    });

    const { result: second } = renderHook(() => useChessGame());

    expect(second.current.fen).toBe(first.current.fen);
  });

  it("undo reverts the last move", () => {
    const { result } = renderHook(() => useChessGame());

    act(() => {
      result.current.applyMove({ from: "e2", to: "e4" });
    });
    expect(result.current.fen).toContain(" b "); // black to move next

    act(() => {
      result.current.undo();
    });

    expect(result.current.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  });

  it("defaults playerColor to white", () => {
    const { result } = renderHook(() => useChessGame());

    expect(result.current.playerColor).toBe("white");
  });

  it("newGame can set the player's color, and it persists", () => {
    const { result: first } = renderHook(() => useChessGame());

    act(() => {
      first.current.newGame("black");
    });
    expect(first.current.playerColor).toBe("black");

    const { result: second } = renderHook(() => useChessGame());
    expect(second.current.playerColor).toBe("black");
  });

  it("persists the selected difficulty too", () => {
    const { result: first } = renderHook(() => useChessGame());
    act(() => {
      first.current.setDifficulty("hard");
    });

    const { result: second } = renderHook(() => useChessGame());

    expect(second.current.difficulty).toBe("hard");
  });
});
