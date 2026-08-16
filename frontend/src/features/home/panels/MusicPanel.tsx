import { InfoPanelCard } from "./InfoPanelCard";
import { WORTH_THE_FIGHT_LYRICS } from "./worthTheFightLyrics";

const LYRIC_LINES = WORTH_THE_FIGHT_LYRICS.split("\n");

export function MusicPanel() {
  return (
    <InfoPanelCard title="Worth the Fight">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption -- WCAG 1.2.1 is
          met by the full lyrics transcript below, on the same page. A <track>
          would need timing data that doesn't exist for this song (see below). */}
      <audio controls className="w-full" src="/music/worth-the-fight.mp3">
        Your browser doesn&apos;t support the audio element.
      </audio>
      <p lang="de" className="mt-2 text-[11px] text-slate-600">© &amp; ℗ 2026 Amelie Kluge. Alle Rechte vorbehalten.</p>
      {/* No timing/transcription data exists for this track, so the lyrics
          can't be synced to playback without drifting - shown as plain,
          on-demand text instead of a karaoke-style highlight. */}
      <details className="group mt-3">
        <summary className="cursor-pointer select-none text-sm font-medium text-slate-400 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-slate-200">
          Lyrics
        </summary>
        <div className="mt-2 max-h-64 overflow-y-auto rounded-md bg-slate-950/40 p-3 text-sm leading-relaxed text-slate-400">
          {LYRIC_LINES.map((line, index) => (
            <p key={index} className={line.startsWith("[") ? "mt-3 text-xs uppercase tracking-wide text-slate-600 first:mt-0" : ""}>
              {line}
            </p>
          ))}
        </div>
      </details>
    </InfoPanelCard>
  );
}
