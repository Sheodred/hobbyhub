import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): JSX.Element {
  throw new TypeError("Cannot read properties of undefined (reading 'length')");
}

describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // React writes the caught error to console.error even when a boundary
  // handles it. Silenced so a passing test doesn't look like a failing one.
  function silenceReactErrorLog() {
    vi.spyOn(console, "error").mockImplementation(() => {});
  }

  it("renders its children when nothing goes wrong", () => {
    render(
      <ErrorBoundary>
        <p>the actual page</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("the actual page")).toBeInTheDocument();
  });

  it("shows a message instead of unmounting the tree when a child throws", () => {
    silenceReactErrorLog();

    // This is the real failure from 2026-08-17: /api/boardgames/local
    // omitted `ratings`, the renderer did undefined.length, and with no
    // boundary React unmounted everything and left a blank white page.
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/something on this page broke/i)).toBeInTheDocument();
  });

  it("keeps everything outside the boundary alive", () => {
    silenceReactErrorLog();

    render(
      <div>
        <nav>site navigation</nav>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      </div>
    );

    // The whole point: a broken page must not take the nav with it.
    expect(screen.getByText("site navigation")).toBeInTheDocument();
  });

  it("recovers when remounted under a new key", () => {
    silenceReactErrorLog();

    const { rerender } = render(
      <ErrorBoundary key="/boardgames">
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    // AppShell keys the boundary on the pathname. Without that, a caught
    // error would latch and every later navigation would keep showing the
    // fallback instead of the page the user asked for.
    rerender(
      <ErrorBoundary key="/chess">
        <p>a different page</p>
      </ErrorBoundary>
    );

    expect(screen.getByText("a different page")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
