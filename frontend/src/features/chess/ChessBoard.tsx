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
    <div
      role="grid"
      aria-label="Chess board"
      className="grid aspect-square w-full max-w-xl grid-cols-8 overflow-hidden border border-[#7a5230]"
    >
      {ranks.map((rank) =>
        files.map((file) => {
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
              className={`relative flex aspect-square items-center justify-center transition-colors ${
                isDark ? "bg-[#b58863]" : "bg-[#f0d9b5]"
              } ${isSelected ? "ring-4 ring-inset ring-sky-500" : ""} ${disabled ? "cursor-default" : "cursor-pointer hover:brightness-105"}`}
            >
              {isTarget && !piece && <span className="absolute h-3 w-3 rounded-full bg-sky-600/70" aria-hidden="true" />}
              {isTarget && piece && <span className="absolute inset-0 ring-4 ring-inset ring-sky-600/70" aria-hidden="true" />}
              {piece && (
                <PieceIcon
                  type={piece.type as "k" | "q" | "r" | "b" | "n" | "p"}
                  aria-hidden="true"
                  className={`h-[70%] w-[70%] drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] ${
                    piece.color === "w" ? "text-white" : "text-[#2b1810]"
                  }`}
                />
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}
