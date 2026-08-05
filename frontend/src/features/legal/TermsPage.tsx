import { DraftContentNotice } from "../../components/DraftContentNotice";

export function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl text-slate-300">
      <DraftContentNotice message="Template only - fill in the bracketed placeholders and have this reviewed before this goes live (see docs/adr/0006). Not legal advice." />

      <h1 className="text-3xl font-semibold text-slate-100">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-400">Last updated: [Date]</p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">1. Scope</h2>
      <p className="mt-2">
        These terms govern your use of HobbyHub (&quot;the site&quot;), operated by [Your Full Legal Name] (see
        the Impressum for contact details). By creating an account or using the site, you agree to these terms.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">2. No online shop</h2>
      <p className="mt-2">
        The marketplace section lists board games and cards for informational purposes only. Listings are not
        offers to enter a sale contract through the site, there is no checkout, and no payment is processed here.
        Any sale is negotiated and concluded directly between the listing owner and the interested party, outside
        this platform, and is subject to whatever terms they agree between themselves. Consumer distance-selling
        rules (e.g. statutory withdrawal rights) that apply to online shops do not apply to this site itself,
        since no contract is concluded here.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">3. Accounts</h2>
      <p className="mt-2">
        You must provide accurate information when creating an account and are responsible for keeping your
        credentials confidential and for activity under your account. You may request deletion of your account
        at any time by contacting us.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">4. User-submitted content</h2>
      <p className="mt-2">
        You retain ownership of the marketplace listings and other content you submit. By posting content, you
        grant us a non-exclusive license to display it on the site. You are responsible for ensuring your content
        is accurate, lawful, and does not infringe anyone else&apos;s rights. We may remove content that violates
        these terms.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">5. Acceptable use</h2>
      <p className="mt-2">
        Don&apos;t use the site to post unlawful, fraudulent, or infringing content, attempt to disrupt or gain
        unauthorized access to it, or scrape it at a scale that degrades the service for others.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">6. Third-party data (Magic: The Gathering)</h2>
      <p className="mt-2">
        Card data and images shown in the MTG section are sourced from the Scryfall API and remain the property
        of their respective rights holders. This site is unofficial Fan Content, not endorsed by Wizards of the
        Coast.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">7. Availability and warranty</h2>
      <p className="mt-2">
        This is a hobby project provided on a best-effort basis, without any warranty of availability,
        accuracy, or fitness for a particular purpose. Features (including the chess engine and MTG search) rely
        on third-party services that may occasionally be unavailable.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">8. Liability</h2>
      <p className="mt-2">
        Liability is limited to intent and gross negligence, except where mandatory statutory liability applies
        (e.g. injury to life, body, or health). [Have this reviewed against applicable law before relying on it.]
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">9. Changes to these terms</h2>
      <p className="mt-2">
        We may update these terms from time to time. Continued use of the site after a change constitutes
        acceptance of the updated terms.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">10. Governing law</h2>
      <p className="mt-2">These terms are governed by the laws of Germany, without regard to conflict-of-law rules.</p>
    </div>
  );
}
