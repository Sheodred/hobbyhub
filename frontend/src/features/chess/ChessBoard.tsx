import type { Chess, Square } from "chess.js";
import { useState } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

const PIECE_GLYPHS: Record<string, string> = {
  k: "♚",
  q: "♛",
  r: "♜",
  b: "♝",
  n: "♞",
  p: "♟",
};

interface ChessBoardProps {
  chess: Chess;
  disabled: boolean;
  onMove: (from: Square, to: Square) => void;
}

export function ChessBoard({ chess, disabled, onMove }: ChessBoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);

  const legalTargets = selected
    ? new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to))
    : new Set<string>();

  function handleSquareClick(square: Square) {
    if (disabled) return;

    if (selected && legalTargets.has(square)) {
      onMove(selected, square);
      setSelected(null);
      return;
    }

    const piece = chess.get(square);
    if (piece && piece.color === chess.turn()) {
      setSelected(square === selected ? null : square);
    } else {
      setSelected(null);
    }
  }

  return (
    <div
      role="grid"
      aria-label="Chess board"
      className="grid aspect-square w-full max-w-xl grid-cols-8 overflow-hidden rounded-lg border border-slate-700"
    >
      {RANKS.map((rank) =>
        FILES.map((file) => {
          const square = `${file}${rank}` as Square;
          const piece = chess.get(square);
          const isDark = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 1;
          const isSelected = selected === square;
          const isTarget = legalTargets.has(square);

          return (
            <button
              key={square}
              type="button"
              role="gridcell"
              aria-label={piece ? `${square}, ${piece.color === "w" ? "white" : "black"} ${piece.type}` : square}
              onClick={() => handleSquareClick(square)}
              disabled={disabled}
              className={`relative flex aspect-square items-center justify-center p-[8%] transition-colors ${
                isDark ? "bg-slate-600" : "bg-slate-300"
              } ${isSelected ? "ring-4 ring-inset ring-indigo-500" : ""} ${disabled ? "cursor-default" : "cursor-pointer hover:brightness-110"}`}
            >
              {isTarget && !piece && <span className="absolute h-3 w-3 rounded-full bg-indigo-500/70" aria-hidden="true" />}
              {isTarget && piece && <span className="absolute inset-0 ring-4 ring-inset ring-indigo-500/70" aria-hidden="true" />}
              {piece && (
                // A solid-color "coin" behind each piece, rather than relying
                // on glyph color/stroke alone - guarantees strong white/black
                // contrast no matter what the square color is (the previous
                // near-white-with-thin-stroke approach made pawns especially
                // hard to tell apart). The gradient + shadow also reads as a
                // subtle 3D token instead of a flat glyph.
                <span
                  aria-hidden="true"
                  className={`flex h-full w-full items-center justify-center rounded-full text-2xl leading-none shadow-[0_2px_3px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] sm:text-4xl ${
                    piece.color === "w"
                      ? "border border-slate-400 bg-gradient-to-b from-white to-slate-200 text-slate-900"
                      : "border border-black/70 bg-gradient-to-b from-slate-700 to-slate-950 text-slate-50"
                  }`}
                >
                  {PIECE_GLYPHS[piece.type]}
                </span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
