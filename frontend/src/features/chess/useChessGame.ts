import { Chess, type Square } from "chess.js";
import { useRef, useState } from "react";

import type { Difficulty } from "./difficulty";

const STORAGE_KEY = "hobbyhub-chess-game";

interface StoredGame {
  fen: string;
  difficulty: Difficulty;
}

function loadStoredGame(): StoredGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredGame) : null;
  } catch {
    return null;
  }
}

function persist(fen: string, difficulty: Difficulty) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ fen, difficulty }));
}

export function useChessGame() {
  const chessRef = useRef<Chess | null>(null);
  const storedRef = useRef<StoredGame | null>();
  if (storedRef.current === undefined) {
    storedRef.current = loadStoredGame();
  }
  if (!chessRef.current) {
    chessRef.current = new Chess();
    if (storedRef.current) {
      try {
        chessRef.current.load(storedRef.current.fen);
      } catch {
        // Corrupt/incompatible saved state - fall back to a fresh game.
        chessRef.current = new Chess();
      }
    }
  }

  const [fen, setFen] = useState(chessRef.current.fen());
  const [difficulty, setDifficultyState] = useState<Difficulty>(storedRef.current?.difficulty ?? "medium");

  function applyMove(move: { from: Square; to: Square; promotion?: string }): boolean {
    try {
      chessRef.current!.move(move);
    } catch {
      return false;
    }
    const nextFen = chessRef.current!.fen();
    setFen(nextFen);
    persist(nextFen, difficulty);
    return true;
  }

  function undo(): boolean {
    const move = chessRef.current!.undo();
    if (!move) {
      return false;
    }
    const nextFen = chessRef.current!.fen();
    setFen(nextFen);
    persist(nextFen, difficulty);
    return true;
  }

  function newGame() {
    chessRef.current = new Chess();
    const nextFen = chessRef.current.fen();
    setFen(nextFen);
    persist(nextFen, difficulty);
  }

  function setDifficulty(next: Difficulty) {
    setDifficultyState(next);
    persist(fen, next);
  }

  return { chess: chessRef.current, fen, difficulty, setDifficulty, applyMove, undo, newGame };
}
