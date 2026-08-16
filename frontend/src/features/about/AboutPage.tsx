import { FadeIn } from "../../components/FadeIn";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const AVATAR_URL = "/Gemini_Generated_Image_nqv19dnqv19dnqv1.jpg";

export function AboutPage() {
  useDocumentTitle("About Me");

  return (
    <div className="mx-auto max-w-2xl">
      <FadeIn className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <img
          src={AVATAR_URL}
          alt="Illustrated avatar"
          className="h-32 w-32 shrink-0 rounded-full border border-slate-700 bg-slate-900"
        />

        <div>
          <h1 className="text-3xl font-semibold text-slate-100">About Me</h1>
          <p className="mt-3 text-slate-300">
            Hi, I&apos;m Adrian. By day I build backend systems and search infrastructure - Java, Spring, and
            Elasticsearch are where I spend most of my time. This site is where the rest of it lives.
          </p>
          <p className="mt-3 text-slate-300">
            I built HobbyHub as a place to put the things I actually enjoy outside of work: browsing Magic: The
            Gathering cards, playing chess against an engine that will not go easy on me, and keeping track of
            board games and cards I&apos;m looking to pass on. It&apos;s also just an excuse to build something
            end-to-end with a stack I like.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-slate-100">Elsewhere</h2>
          <ul className="mt-2 flex flex-col gap-1 text-slate-300">
            <li>
              <a
                href="https://github.com/Sheodred"
                target="_blank"
                rel="noreferrer"
                className="text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                GitHub - github.com/Sheodred
              </a>
            </li>
          </ul>
        </div>
      </FadeIn>
    </div>
  );
}
