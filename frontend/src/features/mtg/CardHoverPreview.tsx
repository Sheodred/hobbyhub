import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { getCardByName } from "./api";

interface CardHoverPreviewProps {
  name: string;
  children: ReactNode;
}

const PREVIEW_WIDTH = 256; // w-64; a Magic card is 5:7, so ~358px tall
const PREVIEW_HEIGHT = 358;
const GAP = 8;

// Where the preview goes in viewport coordinates: above the name when there
// is room, below it otherwise, and never past either edge.
function previewPosition(rect: DOMRect): { left: number; top: number } {
  const left = Math.min(
    Math.max(GAP, rect.left + rect.width / 2 - PREVIEW_WIDTH / 2),
    window.innerWidth - PREVIEW_WIDTH - GAP,
  );
  const fitsAbove = rect.top >= PREVIEW_HEIGHT + GAP;

  return { left, top: fitsAbove ? rect.top - PREVIEW_HEIGHT - GAP : rect.bottom + GAP };
}

/**
 * Wraps a card/commander name with a hover-triggered Scryfall image preview -
 * only fetches once actually hovered, then reuses the cached result.
 *
 * The preview is portalled to document.body rather than positioned inside the
 * name. Every MetaWidget is a FadeIn, which animates `y` and therefore carries
 * a transform - and a transformed ancestor becomes both the containing block
 * and a stacking context for anything absolute inside it. Positioned in place,
 * the preview was clipped by its own widget and painted under the next one, no
 * matter how high its z-index went (#36).
 */
export function CardHoverPreview({ name, children }: CardHoverPreviewProps) {
  const [origin, setOrigin] = useState<DOMRect | null>(null);

  const { data } = useQuery({
    queryKey: ["card-by-name", name],
    queryFn: () => getCardByName(name),
    enabled: origin !== null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const show = (event: { currentTarget: HTMLElement }) =>
    setOrigin(event.currentTarget.getBoundingClientRect());

  return (
    <span
      className="inline-block"
      onMouseEnter={show}
      onFocus={show}
      onMouseLeave={() => setOrigin(null)}
      onBlur={() => setOrigin(null)}
    >
      {children}
      {origin &&
        data?.imageUrl &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-50"
            style={{ ...previewPosition(origin), width: PREVIEW_WIDTH }}
          >
            <img
              src={data.imageUrl}
              alt={data.name}
              className="w-full rounded-lg border border-slate-700 shadow-2xl"
            />
          </span>,
          document.body,
        )}
    </span>
  );
}
