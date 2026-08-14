// Flat solid-silhouette chess piece icons, drawn as plain SVG shapes rather
// than the Unicode chess symbol block - browser/font rendering of those
// codepoints turned out to be unreliable (color-emoji override on some
// glyphs, near-invisible outline-only rendering on the "white" set).
// currentColor throughout so the caller controls fill via text/className;
// pair with the piece-outline-dark/piece-outline-light classes (index.css)
// for a contrast outline that reads correctly regardless of square color -
// see ChessBoard.tsx for why a stroke on individual paths doesn't work here
// (overlapping sub-shapes leave stray seam lines; a multi-directional
// drop-shadow filter treats the whole icon as one merged silhouette).
import type { SVGProps } from "react";

type PieceType = "k" | "q" | "r" | "b" | "n" | "p";

function Pawn(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="7" r="3.4" />
      <path d="M8.8 11.5c-1.6 2-2.3 4.4-1.7 6.8h9.8c.6-2.4-.1-4.8-1.7-6.8z" />
      <rect x="5.5" y="18.3" width="13" height="2.4" rx="1" />
    </svg>
  );
}

function Rook(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6 3h2.6v2.2H6zM10.7 3h2.6v2.2h-2.6zM15.4 3H18v2.2h-2.6z" />
      <rect x="6" y="3" width="12" height="4" />
      <path d="M7.2 7h9.6l1.4 4.5-2 1.7v5.1H8.4v-5.1l-2-1.7z" />
      <rect x="5.5" y="18.3" width="13" height="2.4" rx="1" />
    </svg>
  );
}

function Bishop(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="4.3" r="1.4" />
      <path d="M12 6.2c-2.6 2-4.2 4.6-4.2 8 0 2 .8 3.4 1.8 4.4H14.4c1-1 1.8-2.4 1.8-4.4 0-3.4-1.6-6-4.2-8z" />
      <rect x="6" y="18.3" width="12" height="1.4" rx="0.6" />
      <rect x="5.5" y="19.9" width="13" height="1.8" rx="0.8" />
    </svg>
  );
}

function Knight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M15.8 3.2c-2.6-.4-4.9.5-6.4 2.2-1.3 1.4-1.9 2.6-3 3.1-.9.4-1.6.2-1.9.9-.3.7.4 1.3 1.3 1.3.8 0 1.4-.3 2-.1.5.2.6.8.3 1.6-.9 2.1-1.9 3.9-1.9 6.1h11V16c1-.3 1.8-1 1.8-2.3 0-1.6-.9-2.2-.9-3.7 0-2.8-.7-5.9-2.3-6.8z" />
      <circle cx="14.3" cy="7.6" r="0.6" fill="#00000055" />
      <rect x="5.5" y="18.3" width="13" height="2.4" rx="1" />
    </svg>
  );
}

function Queen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="5.5" cy="5" r="1.3" />
      <circle cx="12" cy="3.6" r="1.3" />
      <circle cx="18.5" cy="5" r="1.3" />
      <path d="M5.5 6.3 8 15h8l2.5-8.7-4 3.2-2.5-5-2.5 5z" />
      <path d="M8 15c-1 1.6-1.5 3-1.5 4.7h11c0-1.7-.5-3.1-1.5-4.7z" />
      <rect x="5.5" y="19.7" width="13" height="2" rx="0.9" />
    </svg>
  );
}

function King(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="11.1" y="1.8" width="1.8" height="4.6" />
      <rect x="9.4" y="3.4" width="5.2" height="1.8" />
      <path d="M7 8.2c1-1 3-1.6 5-1.6s4 .6 5 1.6L15.8 16H8.2z" />
      <path d="M8.2 16c-1.2 1.5-1.9 2.9-1.9 4.7h11.4c0-1.8-.7-3.2-1.9-4.7z" />
      <rect x="5.5" y="20" width="13" height="1.7" rx="0.8" />
    </svg>
  );
}

const ICONS: Record<PieceType, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  p: Pawn,
  r: Rook,
  b: Bishop,
  n: Knight,
  q: Queen,
  k: King,
};

export function PieceIcon({ type, ...props }: { type: PieceType } & SVGProps<SVGSVGElement>) {
  const Icon = ICONS[type];
  return <Icon {...props} />;
}
