export interface Highlight {
  to: string;
  title: string;
  description: string;
  accent: string;
  /** Background art for the card. Currently only the MTG tile has one (a
   * Scryfall art_crop, hotlinking is explicitly fine per Scryfall's
   * guidelines - see docs/adr/0003). Optional so the other tiles keep their
   * plain gradient treatment. */
  imageUrl?: string;
}

export const highlights: Highlight[] = [
  {
    to: "/mtg",
    title: "Magic: The Gathering",
    description: "Search and browse the full card catalog, powered by Scryfall.",
    accent: "from-indigo-600/75 via-indigo-500/35 to-slate-950/10",
    // Omnath, Locus of Creation - art by Chris Rahn, via Scryfall.
    imageUrl: "https://cards.scryfall.io/art_crop/front/4/e/4e4fb50c-a81f-44d3-93c5-fa9a0b37f617.jpg",
  },
  {
    to: "/chess",
    title: "Chess vs. AI",
    description: "Play against a client-side Stockfish engine at whatever difficulty you can handle.",
    accent: "from-indigo-500/60 via-indigo-400/25 to-slate-950/10",
  },
];
