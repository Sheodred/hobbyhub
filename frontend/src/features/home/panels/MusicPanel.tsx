import { useEffect, useRef, useState } from "react";

import { InfoPanelCard } from "./InfoPanelCard";
import { WORTH_THE_FIGHT_LYRICS } from "./worthTheFightLyrics";

// Section labels like "[Chorus]" aren't sung lines, so they're excluded from
// the karaoke display and from the timing distribution below.
const LYRIC_LINES = WORTH_THE_FIGHT_LYRICS.split("\n").filter((line) => !line.startsWith("["));

export function MusicPanel() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeLine, setActiveLine] = useState(-1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // No transcription/timing data is available, so each line gets an equal
    // share of the track's real duration rather than an exact vocal cue.
    const handleTimeUpdate = () => {
      if (!audio.duration) return;
      const secondsPerLine = audio.duration / LYRIC_LINES.length;
      setActiveLine(Math.min(LYRIC_LINES.length - 1, Math.floor(audio.currentTime / secondsPerLine)));
    };
    const handleEnded = () => setActiveLine(-1);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  return (
    <InfoPanelCard title="Worth the Fight">
      <audio ref={audioRef} controls className="w-full" src="/music/worth-the-fight.mp3">
        Your browser doesn&apos;t support the audio element.
      </audio>
      <div className="mt-3 max-h-64 overflow-y-auto rounded-md bg-slate-950/40 p-3 text-sm leading-relaxed">
        {LYRIC_LINES.map((line, index) => (
          <p
            key={index}
            className={index === activeLine ? "font-semibold text-indigo-300" : "text-slate-500"}
          >
            {line}
          </p>
        ))}
      </div>
    </InfoPanelCard>
  );
}
