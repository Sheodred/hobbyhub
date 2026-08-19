import { useDocumentTitle } from "../../hooks/useDocumentTitle";

// Voluntary, not mandated: the BFSG binds economic operators offering services
// against payment, and BITV 2.0 binds public bodies - this is neither. It
// deliberately avoids the terms of art that belong to those regimes ("Erklärung
// zur Barrierefreiheit nach Section 12b BGG", Durchsetzungsstelle,
// Schlichtungsstelle): naming a procedure that isn't available here would be a
// promise this site can't keep. It also claims partial conformance only, which
// is the honest and the safer claim.
export function AccessibilityPage() {
  useDocumentTitle("Accessibility");

  return (
    <div className="mx-auto max-w-2xl text-slate-300">
      <h1 className="text-3xl font-semibold text-slate-100">Accessibility</h1>
      <p className="mt-2 text-sm text-slate-400">Last reviewed: 16 August 2026.</p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">What this is</h2>
      <p className="mt-2">
        This is a private, non-commercial hobby site, so no accessibility law requires this page. It exists
        because the site is meant to be usable by everyone, and because saying plainly where it falls short is
        more useful than a compliance badge.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">How accessible this site is</h2>
      <p className="mt-2">
        <span className="font-medium text-slate-100">Partially conformant</span> with WCAG 2.2 level AA, by our
        own assessment. No external audit has been carried out, and no automated tool can confirm a claim like
        this on its own — so treat it as an honest self-report, not a certification.
      </p>
      <p className="mt-2 text-slate-400">What has been done deliberately:</p>
      <ul className="mt-2 flex flex-col gap-2">
        <li>A skip link as the first focusable element on every page, targeting a focusable main landmark.</li>
        <li>Every page sets its own document title.</li>
        <li>Keyboard operation throughout, including arrow-key movement on the chess board.</li>
        <li>Body text and controls checked against the 4.5:1 contrast minimum.</li>
        <li>Animation is suppressed when your system asks for reduced motion.</li>
        <li>German content inside these English pages is marked as German, so screen readers pronounce it.</li>
        <li>Search results and errors are announced, not just shown.</li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Known limitations</h2>
      <ul className="mt-2 flex flex-col gap-2">
        <li>
          <span className="font-medium text-slate-100">Text over the hero and background artwork.</span> Contrast
          there has not been measured, because the background is an image rather than a flat colour. It is on the
          list; until it is checked, it is not claimed as passing.
        </li>
        <li>
          <span className="font-medium text-slate-100">The chess board.</span> It is fully keyboard-operable via a
          single tab stop and the arrow keys, and each square announces its piece. That model works, but it has
          not been tested with an actual screen reader in a real game.
        </li>
        <li>
          <span className="font-medium text-slate-100">Third-party content.</span> Card images from Scryfall, news
          headlines and board game data come from other sites; their text is reproduced as published, and their
          images carry only the names we can derive.
        </li>
        <li>
          <span className="font-medium text-slate-100">Tab order is not covered by automated tests.</span> The
          browser automation used here cannot drive focus traversal, so tab order is verified by hand and can
          regress between checks.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Found a barrier?</h2>
      <p className="mt-2">
        Write to{" "}
        <a href="mailto:kluge@sheoforge.de" className="text-indigo-400 hover:text-indigo-300 hover:underline">
          kluge@sheoforge.de
        </a>{" "}
        — the same address as in the
        Impressum. Describing the page and what got in your way is enough; you do not need to name a WCAG
        criterion, and you do not need to tell us anything about yourself or any disability. Anything you do
        choose to write is handled as set out in the Privacy Policy.
      </p>
    </div>
  );
}
