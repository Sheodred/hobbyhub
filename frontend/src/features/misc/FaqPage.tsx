import { Link } from "react-router-dom";

import { FadeIn } from "../../components/FadeIn";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

interface QuestionProps {
  question: string;
  children: React.ReactNode;
}

function Question({ question, children }: QuestionProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-slate-100">{question}</h2>
      <p className="mt-2 text-slate-300">{children}</p>
    </section>
  );
}

// The answers here restate things the Privacy Policy and Terms already say in
// their own (legal-register) words, so both have to move together - a claim
// softened here but not there, or vice versa, is worse than not having this
// page. Each answer links to the page that carries the full version.
export function FaqPage() {
  useDocumentTitle("FAQ");

  return (
    <FadeIn>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold text-slate-100">FAQ</h1>
        <p className="mt-2 text-slate-400">
          The five things people ask most often about this site, answered plainly.
        </p>

        <div className="mt-8 flex flex-col gap-8">
          <Question question="Do I need an account?">
            No. There is no sign-up, no login, and nothing to create. Every feature works the moment the page
            loads, and closing the tab leaves nothing behind on our side.
          </Question>

          <Question question="What data do you collect about me?">
            As close to none as a website can manage. No accounts, no analytics, no advertising, no tracking
            scripts, and no cookies at all. What you type into a search is passed to the relevant data source to
            fetch a result, with nothing identifying attached to it. Two features remember a choice in your own
            browser — your saved chess game and the board game page&apos;s DE/EN language preference — and neither
            ever leaves your device. The{" "}
            <Link to="/legal/privacy" className="text-indigo-400 underline hover:text-indigo-300">
              Privacy Policy
            </Link>{" "}
            spells all of it out, including the one case where a browser prompt asks for your location.
          </Question>

          <Question question="Where does the data come from, and is it live?">
            Magic card data comes from Scryfall and is cached for only a few minutes, so it is effectively live.
            Board game data comes from BoardGameGeek, topped up with review scores from Board Game Quest,
            H@LL9000 and brettspiele-report.de and a retail price from amazon.de; that is cached for about two
            weeks, because ratings and rankings move slowly and the alternative is hammering other people&apos;s
            servers. So a rating that changed on BoardGameGeek yesterday may take a couple of weeks to catch up
            here.
          </Question>

          <Question question="Are you affiliated with Wizards of the Coast or BoardGameGeek?">
            No, not with either, nor with any of the other sources. This is unofficial fan content and an
            independent hobby project. All card data, board game data, and images remain the property of their
            respective rights holders — see the{" "}
            <Link to="/legal/terms" className="text-indigo-400 underline hover:text-indigo-300">
              Terms of Service
            </Link>{" "}
            for the full attribution.
          </Question>

          <Question question="Why are there no ads, and is anything for sale?">
            Nothing here is monetised. It is a private, non-commercial hobby project — no ads, no affiliate
            links, no sponsored placements, nothing to buy. The links out to eBay and Kleinanzeigen on the board
            game page are plain search links, not referrals, and earn nothing.
          </Question>
        </div>

        <p className="mt-10 text-sm text-slate-400">
          Something missing here? The address in the{" "}
          <Link to="/legal/impressum" className="text-indigo-400 underline hover:text-indigo-300">
            Impressum
          </Link>{" "}
          reaches a real person.
        </p>
      </div>
    </FadeIn>
  );
}
