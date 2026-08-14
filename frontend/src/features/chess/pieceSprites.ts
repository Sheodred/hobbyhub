// AI-generated (Higgsfield/Recraft) illustrated piece sprites, replacing the
// old hand-drawn flat currentColor icons - each file already carries its own
// color (warm gold for white, dark indigo for black), so callers no longer
// need to tint them; the circular badge behind each piece (see ChessBoard.tsx)
// still does the contrast work against the board.
export type PieceType = "k" | "q" | "r" | "b" | "n" | "p";
export type PieceColor = "w" | "b";

const FILE_NAMES: Record<PieceType, string> = {
  p: "pawn",
  r: "rook",
  n: "knight",
  b: "bishop",
  q: "queen",
  k: "king",
};

export function pieceSpriteSrc(type: PieceType, color: PieceColor): string {
  return `/chess-pieces/${color}_${FILE_NAMES[type]}.svg`;
}
