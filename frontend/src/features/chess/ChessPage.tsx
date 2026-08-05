import type { Chess, Square } from "chess.js";
import { useEffect, useRef, useState } from "react";

import { FadeIn } from "../../components/FadeIn";
import { ChessBoard } from "./ChessBoard";
import { DIFFICULTY_DEPTH, DIFFICULTY_LABELS, type Difficulty } from "./difficulty";
import { createStockfishEngine, type StockfishEngine } from "./stockfishEngine";
import { useChessGame } from "./useChessGame";

function parseUciMove(uci: string): { from: Square; to: Square; promotion?: string } {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  };
}

function statusText(chess: Chess): string {
  if (chess.isCheckmate()) return `Checkmate - ${chess.turn() === "w" ? "Black" : "White"} wins.`;
  if (chess.isStalemate()) return "Stalemate - draw.";
  if (chess.isDraw()) return "Draw.";
  if (chess.isCheck()) return `${chess.turn() === "w" ? "White" : "Black"} is in check.`;
  return `${chess.turn() === "w" ? "White" : "Black"} to move.`;
}

// Player is always White; the engine (Black) responds automatically
// whenever it becomes its turn, including right after restoring a saved
// mid-game position (see docs/adr/0004).
export function ChessPage() {
  const { chess, fen, difficulty, setDifficulty, applyMove, newGame } = useChessGame();
  const engineRef = useRef<StockfishEngine | null>(null);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    engineRef.current = createStockfishEngine();
    return () => engineRef.current?.terminate();
  }, []);

  useEffect(() => {
    if (chess.isGameOver() || chess.turn() !== "b") {
      return;
    }

    let cancelled = false;
    setThinking(true);
    engineRef
      .current!.getBestMove(fen, DIFFICULTY_DEPTH[difficulty])
      .then((uci) => {
        if (cancelled) return;
        // Applying the move updates `fen`, which re-runs this effect and
        // flips `cancelled` via the cleanup below - setThinking(false) has
        // to happen in this same callback (not a separate .finally(), which
        // runs as its own later microtask) or that cleanup would already
        // have fired by the time it runs, and the guard would skip it,
        // leaving the UI stuck on "Engine is thinking…" forever.
        applyMove(parseUciMove(uci));
        setThinking(false);
      })
      .catch(() => {
        if (!cancelled) setThinking(false);
      });

    return () => {
      cancelled = true;
    };
    // fen captures the full game state this effect needs to react to;
    // chess/applyMove are stable across renders (see useChessGame).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, difficulty]);

  function handlePlayerMove(from: Square, to: Square) {
    // No promotion picker in v1 - always promote to a queen. chess.js
    // ignores this field for non-promoting moves.
    applyMove({ from, to, promotion: "q" });
  }

  const gameOver = chess.isGameOver();

  return (
    <FadeIn>
      <h1 className="text-3xl font-semibold text-slate-100">Chess vs. AI</h1>
      <p className="mt-2 text-slate-400">
        You play White. The engine (Stockfish, running fully in your browser) plays Black.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Difficulty
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100"
          >
            {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABELS[d]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={newGame}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          New game
        </button>
      </div>

      <p role="status" className="mt-4 text-sm font-medium text-slate-300">
        {thinking ? "Engine is thinking…" : statusText(chess)}
      </p>

      <div className="mt-4">
        <ChessBoard chess={chess} disabled={gameOver || thinking || chess.turn() !== "w"} onMove={handlePlayerMove} />
      </div>
    </FadeIn>
  );
}
