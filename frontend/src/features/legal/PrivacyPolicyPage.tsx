import { DraftContentNotice } from "../../components/DraftContentNotice";

export function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl text-slate-300">
      <DraftContentNotice message="Template only - fill in the bracketed placeholders and confirm the hosting details before this goes live (see docs/adr/0006). Not legal advice." />

      <h1 className="text-3xl font-semibold text-slate-100">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-500">Information pursuant to Article 13 GDPR.</p>

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
      <ul className="mt-2 flex flex-col gap-3">
        <li>
          <span className="font-medium text-slate-100">Account data.</span> Email address, display name, and a
          hashed password when you sign up. Used to operate your account and log you in. Legal basis: performance
          of a contract (Art. 6(1)(b) GDPR).
        </li>
        <li>
          <span className="font-medium text-slate-100">Session cookie.</span> A refresh token stored in an
          httpOnly, Secure cookie, used only to keep you signed in. It is not readable by JavaScript and is not
          used for tracking. Legal basis: necessary for the service you requested (Art. 6(1)(b) GDPR); as a
          strictly necessary cookie it does not require consent under the ePrivacy rules.
        </li>
        <li>
          <span className="font-medium text-slate-100">Marketplace listings.</span> Title, description, price,
          and condition you submit for an item are stored and shown publicly on the marketplace page so others
          can reach out about it. Legal basis: performance of a contract / your explicit action (Art. 6(1)(b)
          GDPR).
        </li>
        <li>
          <span className="font-medium text-slate-100">MTG card search.</span> Search terms you enter are
          forwarded to the Scryfall API through our backend to return card results. We do not attach your account
          identity to these requests. Legal basis: legitimate interest in providing the feature (Art. 6(1)(f)
          GDPR).
        </li>
        <li>
          <span className="font-medium text-slate-100">Server logs.</span> Standard web server logs (IP address,
          timestamp, requested URL) generated automatically by the hosting infrastructure for security and abuse
          prevention. Legal basis: legitimate interest (Art. 6(1)(f) GDPR).
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">What we do not do</h2>
      <p className="mt-2">
        No analytics, advertising, or third-party tracking scripts run on this site. No non-essential cookies are
        set. Password-reset tokens are only ever logged in a local development environment - never in production
        - and are never emailed by a third-party provider at this time.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Recipients and international transfers</h2>
      <p className="mt-2">
        [Hosting Provider Name & Address] hosts the application and database. MTG card searches are relayed to
        Scryfall (scryfall.com); see their own privacy policy for how they handle request data. No other data is
        shared with third parties, and no data is transferred outside the EU/EEA. [Update if the hosting provider
        or infrastructure changes.]
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Retention</h2>
      <p className="mt-2">
        Account data is kept until you delete your account or request removal. Marketplace listings are kept
        until you remove them or your account is deleted. Server logs are rotated on a routine schedule by the
        hosting infrastructure.
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
