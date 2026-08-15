import type { Chess, Square } from "chess.js";
import { useState } from "react";

import { PieceIcon } from "./pieceIcons";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface ChessBoardProps {
  chess: Chess;
  disabled: boolean;
  onMove: (from: Square, to: Square) => void;
  orientation?: "white" | "black";
}

export function ChessBoard({ chess, disabled, onMove, orientation = "white" }: ChessBoardProps) {
  const [selected, setSelected] = useState<Square | null>(null);

  const legalTargets = selected
    ? new Set(chess.moves({ square: selected, verbose: true }).map((m) => m.to))
    : new Set<string>();

  const ranks = orientation === "black" ? [...RANKS].reverse() : RANKS;
  const files = orientation === "black" ? [...FILES].reverse() : FILES;

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
    <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-white/[0.03] p-1.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] sm:p-2">
      <div
        role="grid"
        aria-label="Chess board"
        className="grid aspect-square grid-cols-8 overflow-hidden rounded-[calc(2rem-0.5rem)] ring-1 ring-inset ring-white/10"
      >
        {ranks.map((rank) =>
          files.map((file) => {
            const square = `${file}${rank}` as Square;
            const piece = chess.get(square);
            const isDark = (FILES.indexOf(file) + RANKS.indexOf(rank)) % 2 === 1;
            const isSelected = selected === square;
            const isTarget = legalTargets.has(square);
            const isEdgeFile = file === files[0];
            const isEdgeRank = rank === ranks[ranks.length - 1];

            return (
              <button
                key={square}
                type="button"
                role="gridcell"
                aria-label={piece ? `${square}, ${piece.color === "w" ? "white" : "black"} ${piece.type}` : square}
                onClick={() => handleSquareClick(square)}
                disabled={disabled}
                className={`relative flex aspect-square items-center justify-center transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                  isDark ? "bg-[#1c1633]" : "bg-[#332a5c]"
                } ${isSelected ? "ring-2 ring-inset ring-amber-400 shadow-[inset_0_0_20px_rgba(251,191,36,0.35)]" : ""} ${
                  disabled ? "cursor-default" : "cursor-pointer hover:brightness-125"
                }`}
              >
                {isEdgeRank && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0.5 right-1 text-[9px] font-medium tracking-wide text-white/25"
                  >
                    {file}
                  </span>
                )}
                {isEdgeFile && (
                  <span
                    aria-hidden="true"
                    className="absolute left-1 top-0.5 text-[9px] font-medium tracking-wide text-white/25"
                  >
                    {rank}
                  </span>
                )}
                {isTarget && !piece && (
                  <span className="absolute h-3 w-3 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(251,191,36,0.6)]" aria-hidden="true" />
                )}
                {isTarget && piece && <span className="absolute inset-0 ring-4 ring-inset ring-amber-400/70" aria-hidden="true" />}
                {/* Invisible click/selection footprint - the piece itself
                    (not this circle) carries the contrast now, via the
                    piece-outline-* filter below, so it reads against either
                    square color without needing a colored badge behind it. */}
                {piece && (
                  <span aria-hidden="true" className="flex h-[78%] w-[78%] items-center justify-center rounded-full">
                    <PieceIcon
                      type={piece.type as "k" | "q" | "r" | "b" | "n" | "p"}
                      className={`h-[82%] w-[82%] ${
                        piece.color === "w" ? "text-amber-50 piece-outline-dark" : "text-[#150f28] piece-outline-light"
                      }`}
                    />
                  </span>
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
