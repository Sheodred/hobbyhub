import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { getCardByName } from "./api";

interface CardHoverPreviewProps {
  name: string;
  children: ReactNode;
}

/** Wraps a card/commander name with a hover-triggered Scryfall image preview - only fetches once actually hovered, then reuses the cached result. */
export function CardHoverPreview({ name, children }: CardHoverPreviewProps) {
  const [hovered, setHovered] = useState(false);

  const { data } = useQuery({
    queryKey: ["card-by-name", name],
    queryFn: () => getCardByName(name),
    enabled: hovered,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onFocus={() => setHovered(true)}
    >
      {children}
      {hovered && data?.imageUrl && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2"
        >
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-40 rounded-lg border border-slate-700 shadow-xl sm:w-48"
          />
        </span>
      )}
    </span>
  );
}
