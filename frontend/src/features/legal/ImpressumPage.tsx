import { DraftContentNotice } from "../../components/DraftContentNotice";

export function ImpressumPage() {
  return (
    <div className="mx-auto max-w-2xl text-slate-300">
      <DraftContentNotice message="Operated as a private, non-commercial project (no postal address shown accordingly, see docs/adr/0006). Not legal advice: have this reviewed, especially the private/non-commercial classification itself, before relying on it." />

      <h1 className="text-3xl font-semibold text-slate-100">Impressum</h1>
      <p className="mt-2 text-sm text-slate-400">Legal notice pursuant to Section 5 TMG and Section 18(2) MStV.</p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Service provider</h2>
      <p className="mt-2">
        Sheodred
        <br />
        Operated as a private, non-commercial hobby project - reachable via the contact details below.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Contact</h2>
      <p className="mt-2">Email: kluge@sheoforge.de</p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Commercial register</h2>
      <p className="mt-2">
        Not applicable — private, non-commercial hobby project; no register court, registration number, or VAT ID
        (Section 27a UStG) exists for it.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Responsible for content (Section 18(2) MStV)</h2>
      <p className="mt-2">Sheodred (contact details above)</p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Dispute resolution</h2>
      <p className="mt-2">
        The European Commission provides a platform for online dispute resolution (OS):{" "}
        <a
          href="https://ec.europa.eu/consumers/odr/"
          target="_blank"
          rel="noreferrer"
          className="text-indigo-400 hover:text-indigo-300 hover:underline"
        >
          ec.europa.eu/consumers/odr
        </a>
        . We are not obligated and not willing to participate in dispute resolution proceedings before a consumer
        arbitration board.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Liability for content</h2>
      <p className="mt-2">
        As a service provider, we are responsible for our own content on these pages under general law. However,
        we are not obligated to monitor transmitted or stored third-party information or to investigate
        circumstances indicating illegal activity. Obligations to remove or block the use of information under
        general law remain unaffected.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Liability for links</h2>
      <p className="mt-2">
        This site may contain links to external third-party websites over whose content we have no control. We
        therefore cannot accept any liability for this external content. The respective provider or operator of
        the linked pages is always responsible for their content.
      </p>

      <h2 className="mt-6 text-lg font-semibold text-slate-100">Copyright</h2>
      <p className="mt-2">
        Content and works created by the site operator are subject to copyright. Magic: The Gathering card data
        and images are provided via the Scryfall API and remain the property of their respective rights holders
        (Wizards of the Coast); this site is unofficial and not endorsed by Wizards of the Coast.
      </p>
    </div>
  );
}
