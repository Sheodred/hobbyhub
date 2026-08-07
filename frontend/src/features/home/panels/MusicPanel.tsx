import { InfoPanelCard } from "./InfoPanelCard";
import { WORTH_THE_FIGHT_LYRICS } from "./worthTheFightLyrics";

const LYRIC_LINES = WORTH_THE_FIGHT_LYRICS.split("\n");

export function MusicPanel() {
  return (
    <InfoPanelCard title="Worth the Fight">
      <div className="overflow-hidden rounded-[calc(1.5rem-0.75rem)] border border-white/10 bg-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
        <video
          controls
          preload="metadata"
          poster="/music/worth-the-fight-poster.jpg"
          className="aspect-video w-full"
          src="/music/worth_the_fight_storyboard_preview.mp4"
        >
          Your browser doesn&apos;t support the video element.
        </video>
      </div>
      <p className="mt-2 text-xs text-slate-500">Vocals start at 0:11.</p>
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
