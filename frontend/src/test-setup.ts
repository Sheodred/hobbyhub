import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom implements neither of these - both are used by real components
// (useMediaQuery / react-resizable-panels) that need to run in tests. This
// file only runs under the test environment, so unconditionally providing
// them here is safe (no risk of overriding a real browser implementation).

window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

// Used by Framer Motion's `whileInView` (see HighlightCard).
class IntersectionObserverMock {
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
window.IntersectionObserver = IntersectionObserverMock as unknown as typeof IntersectionObserver;
