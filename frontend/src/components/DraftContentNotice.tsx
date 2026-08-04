interface DraftContentNoticeProps {
  message: string;
}

// Dev-only reminder that a page still has placeholder content. Never
// renders in a production build (see docs/adr/0006) - the bracketed
// placeholders on the page itself are the loud, always-visible signal;
// this banner is the "don't forget" for whoever is editing in dev mode.
export function DraftContentNotice({ message }: DraftContentNoticeProps) {
  if (!import.meta.env.DEV) return null;

  return (
    <div
      role="note"
      className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300"
    >
      <span className="font-semibold">Draft content (dev only):</span> {message}
    </div>
  );
}
