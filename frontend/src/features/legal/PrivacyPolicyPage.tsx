import { DraftContentNotice } from "../../components/DraftContentNotice";

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl text-slate-300">
      <DraftContentNotice message="Template only - fill in the bracketed placeholders and confirm the hosting details before this goes live (see docs/adr/0006). Not legal advice." />

      <h1 className="text-3xl font-semibold text-slate-100">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Information pursuant to Article 13 GDPR.</p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Controller</h2>
      <p className="mt-2">
        [Your Full Legal Name]
        <br />
        [Street, Postal Code, City, Country]
        <br />
        Email: [your-email@example.com]
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Data protection officer</h2>
      <p className="mt-2">
        [Not applicable - sole operator, no DPO required under Art. 37 GDPR. Update if this changes.]
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">What we collect and why</h2>
      <p className="mt-2 text-slate-400">
        This site has no accounts and requires no sign-up - everything below is what happens when you simply
        browse it.
      </p>
      <ul className="mt-2 flex flex-col gap-3">
        <li>
          <span className="font-medium text-slate-100">MTG card search.</span> Search terms you enter are
          forwarded to the Scryfall API through our backend to return card results. We do not attach any
          identifying information to these requests. Legal basis: legitimate interest in providing the feature
          (Art. 6(1)(f) GDPR).
        </li>
        <li>
          <span className="font-medium text-slate-100">Location, for the homepage weather panel.</span> If you
          allow it via your browser&apos;s own permission prompt, your device sends its coordinates directly to
          Open-Meteo (open-meteo.com) to show local weather - this call does not go through our backend, and we
          never see or store your location ourselves. Declining the prompt (or ignoring it) just hides the panel;
          nothing else on the site depends on it. Legal basis: your consent, given via that browser prompt (Art.
          6(1)(a) GDPR); withdrawable at any time through your browser&apos;s site-permission settings.
        </li>
        <li>
          <span className="font-medium text-slate-100">Server logs.</span> Standard web server logs (IP address,
          timestamp, requested URL) generated automatically by the hosting infrastructure for security and abuse
          prevention. Legal basis: legitimate interest (Art. 6(1)(f) GDPR).
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">What we do not do</h2>
      <p className="mt-2">
        No analytics, advertising, or third-party tracking scripts run on this site. No accounts, no accounts
        data, no non-essential cookies are set.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Recipients and international transfers</h2>
      <p className="mt-2">
        [Hosting Provider Name & Address] hosts the application and database. MTG card searches and card-image
        lookups are relayed to Scryfall (scryfall.com); the homepage weather panel sends your device&apos;s
        coordinates directly to Open-Meteo (open-meteo.com), not through our backend - see each provider&apos;s
        own privacy policy for how they handle that data. The homepage news panels and the MTG Meta &amp; Stats
        page are populated by a scheduled backend job that reads public content from tagesschau.de,
        magic.wizards.com, edhrec.com, and mtggoldfish.com - none of your data is sent to those sources, they are
        read-only content feeds. No other data is shared with third parties. [Confirm whether any of the above
        involves a transfer outside the EU/EEA once the hosting provider and these third parties&apos; own
        infrastructure locations are confirmed, and update this section accordingly - e.g. via an Art. 46 GDPR
        safeguard (such as Standard Contractual Clauses) if a non-adequate third country is involved.]
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Retention</h2>
      <p className="mt-2">
        Server logs are rotated on a routine schedule by the hosting infrastructure. Cached third-party data
        (card search results, news, MTG meta stats) is refreshed periodically and holds no personal data.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Your rights</h2>
      <p className="mt-2">
        Under the GDPR you have the right to access, rectify, or erase your personal data, restrict or object to
        its processing, request data portability, and withdraw consent where processing is based on it. To
        exercise any of these, contact us at the email address above. You also have the right to lodge a
        complaint with your local data protection supervisory authority.
      </p>
    </div>
  );
}
