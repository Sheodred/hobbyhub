import { InfoPanelCard } from "./InfoPanelCard";
import { WORTH_THE_FIGHT_LYRICS } from "./worthTheFightLyrics";

export function MusicPanel() {
  return (
    <InfoPanelCard title="Worth the Fight">
      <audio controls className="w-full" src="/music/worth-the-fight.mp3">
        Your browser doesn&apos;t support the audio element.
      </audio>
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-indigo-400 hover:underline">Show lyrics</summary>
        <pre className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-300">
          {WORTH_THE_FIGHT_LYRICS}
        </pre>
      </details>
    </InfoPanelCard>
  );
}
