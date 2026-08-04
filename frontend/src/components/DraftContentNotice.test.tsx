import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DraftContentNotice } from "./DraftContentNotice";

describe("DraftContentNotice", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("shows the message in dev mode", () => {
    vi.stubEnv("DEV", true);
    render(<DraftContentNotice message="Fill in the placeholders." />);
    expect(screen.getByRole("note")).toHaveTextContent("Fill in the placeholders.");
  });

  it("renders nothing outside dev mode", () => {
    vi.stubEnv("DEV", false);
    const { container } = render(<DraftContentNotice message="Fill in the placeholders." />);
    expect(container).toBeEmptyDOMElement();
  });
});
