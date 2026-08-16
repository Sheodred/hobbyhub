import { useEffect, useState } from "react";

const STORAGE_KEY = "hobbyhub-cookie-consent";

// Not mounted anywhere yet (see docs/adr/0006's consequences) - the site
// currently sets no non-essential cookies and runs no analytics, so there
// is nothing to ask consent for. The strictly-necessary refresh-token
// cookie is exempt from consent requirements under the ePrivacy rules.
// This exists ready-to-mount for whenever that changes, per the original
// build plan.
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(localStorage.getItem(STORAGE_KEY) === null);
  }, []);

  function respond(choice: "accepted" | "declined") {
    localStorage.setItem(STORAGE_KEY, choice);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-xl sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <p className="text-sm text-slate-300">
        We use only strictly necessary cookies to keep you signed in. If that ever changes, this is where
        you&apos;d choose whether to allow anything beyond that.
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => respond("declined")}
          className="rounded-md px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={() => respond("accepted")}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
