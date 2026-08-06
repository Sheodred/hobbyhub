import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { QueryState } from "./QueryState";

describe("QueryState", () => {
  it("renders the loading fallback while loading, not the content", () => {
    render(
      <QueryState
        isLoading
        isError={false}
        isEmpty={false}
        loadingFallback={<p>Loading…</p>}
        errorFallback={<p>Error</p>}
        emptyFallback={<p>Empty</p>}
      >
        <p>Content</p>
      </QueryState>,
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders the error fallback when not loading and isError, not the content", () => {
    render(
      <QueryState
        isLoading={false}
        isError
        isEmpty={false}
        loadingFallback={<p>Loading…</p>}
        errorFallback={<p>Error</p>}
        emptyFallback={<p>Empty</p>}
      >
        <p>Content</p>
      </QueryState>,
    );

    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders the empty fallback when not loading/error and isEmpty, not the content", () => {
    render(
      <QueryState
        isLoading={false}
        isError={false}
        isEmpty
        loadingFallback={<p>Loading…</p>}
        errorFallback={<p>Error</p>}
        emptyFallback={<p>Empty</p>}
      >
        <p>Content</p>
      </QueryState>,
    );

    expect(screen.getByText("Empty")).toBeInTheDocument();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });

  it("renders the children when loading/error/empty are all false", () => {
    render(
      <QueryState
        isLoading={false}
        isError={false}
        isEmpty={false}
        loadingFallback={<p>Loading…</p>}
        errorFallback={<p>Error</p>}
        emptyFallback={<p>Empty</p>}
      >
        <p>Content</p>
      </QueryState>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
