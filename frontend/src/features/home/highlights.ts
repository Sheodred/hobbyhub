export interface Highlight {
  to: string;
  title: string;
  description: string;
  accent: string;
}

export const highlights: Highlight[] = [
  {
    to: "/mtg",
    title: "Magic: The Gathering",
    description: "Search and browse the full card catalog, powered by Scryfall.",
    accent: "from-violet-600/20 to-violet-600/0",
  },
  {
    to: "/marketplace",
    title: "Marketplace",
    description: "Board games and cards currently up for sale - inquire directly, no checkout needed.",
    accent: "from-amber-500/20 to-amber-500/0",
  },
  {
    to: "/chess",
    title: "Chess vs. AI",
    description: "Play against a client-side Stockfish engine at whatever difficulty you can handle.",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
];
