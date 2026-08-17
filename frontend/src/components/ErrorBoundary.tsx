import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * Keeps one broken component from taking the whole site with it.
 *
 * React unmounts the entire tree when a render throws and nothing catches
 * it, which shows up as a blank white page - no message, nothing to report.
 * That is not hypothetical here: on 2026-08-17 an endpoint omitted one
 * field, the renderer did `undefined.length`, and every board game search
 * blanked the site until it was fixed.
 *
 * Nearly every page renders data fetched from somewhere else (Scryfall,
 * BGG, EDHREC, four rating sources, weather, news), and a field going
 * missing at runtime is a documented recurring class here - see
 * docs/agents/pitfalls.md on caches outliving the shape you parse into.
 * Each of those is otherwise a whole-app outage waiting to happen.
 *
 * A class is not a style choice: componentDidCatch/getDerivedStateFromError
 * have no hook equivalent, and react-error-boundary would be a dependency
 * for what fits in this file.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console only. Nothing is sent anywhere: this is a personal site with
    // no analytics and a privacy policy that says so, and an error message
    // can carry whatever the user was looking at.
    console.error("Caught by ErrorBoundary:", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <div role="alert" className="mx-auto max-w-xl py-12 text-center">
        <h1 className="text-2xl font-semibold text-slate-100">Something on this page broke</h1>
        <p className="mt-3 text-slate-300">
          Sorry — that is a bug on my side, not anything you did. The rest of the site still works, so
          you can carry on from the navigation above.
        </p>
        <p className="mt-3 text-slate-400">Reloading the page usually clears it.</p>
      </div>
    );
  }
}
