import { DraftContentNotice } from "../../components/DraftContentNotice";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export function PrivacyPolicyPage() {
  useDocumentTitle("Privacy Policy");

  return (
    <div className="mx-auto max-w-2xl text-slate-300">
      <DraftContentNotice message="Operated as a private, non-commercial project (no postal address shown accordingly, see docs/adr/0006). Not legal advice." />

      <h1 className="text-3xl font-semibold text-slate-100">Privacy Policy</h1>
      <p className="mt-2 text-sm text-slate-400">Information pursuant to Article 13 GDPR.</p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Controller</h2>
      <p className="mt-2">
        Sheodred
        <br />
        Email: kluge@sheoforge.de
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Data protection officer</h2>
      <p className="mt-2">Not applicable — sole operator; no DPO is required under Art. 37 GDPR.</p>

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
          <span className="font-medium text-slate-100">Location, for the homepage weather and flea market panels.</span>{" "}
          If you allow it via your browser&apos;s own permission prompt, it is used for two on-page features: the
          weather panel sends your coordinates directly to Open-Meteo (open-meteo.com) to show local weather - this
          call does not go through our backend; the flea market panel uses your coordinates only inside your
          browser, to calculate and display each listed event&apos;s distance from you, and never sends them
          anywhere. We never see or store your location ourselves in either case. Declining the prompt (or ignoring
          it) just hides the weather panel and the per-event distance; nothing else on the site depends on it.
          Legal basis: your consent, given via that browser prompt (Art. 6(1)(a) GDPR); withdrawable at any time
          through your browser&apos;s site-permission settings.
        </li>
        <li>
          <span className="font-medium text-slate-100">Email you send us.</span> The Impressum and the
          accessibility page invite you to write to us. If you do, your email address and whatever you put in the
          message are processed to answer you, and kept only as long as the exchange needs. Legal basis:
          legitimate interest in answering correspondence (Art. 6(1)(f) GDPR). You decide what to put in that
          message — if you volunteer information about a disability while reporting a barrier, you are consenting
          to us processing it for that purpose (Art. 9(2)(a) GDPR), and it is used for nothing else.
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
        IONOS SE (Montabaur, Germany) hosts the application and database - based in the EU, so no third-country
        transfer applies to hosting itself. MTG card searches and card-image lookups are relayed to Scryfall
        (scryfall.com); the homepage weather panel sends your device&apos;s coordinates directly to Open-Meteo
        (open-meteo.com), not through our backend - see each provider&apos;s own privacy policy for how they
        handle that data. The homepage news panels and the MTG Meta &amp; Stats page are populated by a scheduled
        backend job that reads public content from tagesschau.de, magic.wizards.com, edhrec.com, and
        mtggoldfish.com - none of your data is sent to those sources, they are read-only content feeds. No other
        data is shared with third parties. Scryfall runs on Heroku behind Cloudflare, and Open-Meteo serves
        requests from servers in Europe and North America via GeoDNS - both may route a given request through
        infrastructure outside the EU/EEA, including the United States. Where that happens, it relies on the
        respective provider&apos;s own applicable safeguard (such as the EU-US Data Privacy Framework or Standard
        Contractual Clauses under Art. 46 GDPR) - see each provider&apos;s own privacy policy for specifics.
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
