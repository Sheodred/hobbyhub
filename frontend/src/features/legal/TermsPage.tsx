import { DraftContentNotice } from "../../components/DraftContentNotice";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function TermsPage() {
  useDocumentTitle("Terms of Service");

  return (
    <div className="mx-auto max-w-2xl text-slate-300">
      <DraftContentNotice message="Have this reviewed before this goes live (see docs/adr/0006). Not legal advice." />

      <h1 className="text-3xl font-semibold text-slate-100">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: August 6, 2026</p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">1. Scope</h2>
      <p className="mt-2">
        These terms govern your use of HobbyHub (&quot;the site&quot;), operated by Sheodred as a private,
        non-commercial hobby project (see the Impressum for contact details). By using the site, you agree to
        these terms. There are no user accounts and nothing to sign up for.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">2. Acceptable use</h2>
      <p className="mt-2">
        Don&apos;t attempt to disrupt or gain unauthorized access to the site, or scrape it at a scale that
        degrades the service for others.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">3. Third-party data (Magic: The Gathering)</h2>
      <p className="mt-2">
        Card data and images shown in the MTG section are sourced from the Scryfall API; the Meta &amp; Stats
        page additionally shows popularity and metagame data sourced from EDHREC and MTGGoldfish. All of it
        remains the property of their respective rights holders. This site is unofficial Fan Content, not
        endorsed by Wizards of the Coast.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">4. Availability and warranty</h2>
      <p className="mt-2">
        This is a hobby project provided on a best-effort basis, without any warranty of availability,
        accuracy, or fitness for a particular purpose. Features (including the chess engine and MTG search) rely
        on third-party services that may occasionally be unavailable.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">5. Liability</h2>
      <p className="mt-2">
        Liability is limited to intent and gross negligence, except where mandatory statutory liability applies
        (e.g. injury to life, body, or health). This clause has not been reviewed by a lawyer.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">6. Changes to these terms</h2>
      <p className="mt-2">
        We may update these terms from time to time. Continued use of the site after a change constitutes
        acceptance of the updated terms.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">7. Governing law</h2>
      <p className="mt-2">These terms are governed by the laws of Germany, without regard to conflict-of-law rules.</p>
    </div>
  );
}
