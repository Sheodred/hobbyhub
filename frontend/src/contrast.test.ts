import { describe, expect, it } from "vitest";

// Guard for WCAG 1.4.3 (AA). On this app's dark background (#0c091c) the
// darker slate text ramps measure: slate-500 ~4.1:1, slate-600 ~2.6:1 - both
// under the 4.5:1 minimum for body text. slate-400 is ~7.7:1 and is the
// established secondary-text colour here. eslint can't see inside Tailwind
// class strings, so the check lives as a test instead.
const BANNED = /\btext-slate-(500|600|700|800|900)\b/;

const sources = import.meta.glob("./**/*.tsx", { query: "?raw", import: "default", eager: true }) as Record<
  string,
  string
>;

describe("text contrast", () => {
  it("uses no slate text darker than slate-400 on the dark background", () => {
    // A glob that silently matches nothing would make this test pass forever.
    expect(Object.keys(sources).length).toBeGreaterThan(20);

    const offenders = Object.entries(sources)
      .filter(([path]) => !path.endsWith(".test.tsx"))
      .filter(([, source]) => BANNED.test(source))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });
});
