export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 2,
  medium: 8,
  hard: 15,
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
