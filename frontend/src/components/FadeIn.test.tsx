import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FadeIn } from "./FadeIn";

describe("FadeIn", () => {
  it("renders its children", () => {
    render(
      <FadeIn>
        <p>Content</p>
      </FadeIn>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
