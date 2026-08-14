import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const EASE = [0.32, 0.72, 0, 1] as const;

interface HeroHotspotProps {
  to: string;
  label: string;
  className: string;
}

// Invisible click regions over matching parts of the hero artwork (chess
// board, sky, MTG table) - a soft ring/glow on hover or keyboard focus is
// the only visual cue, so the scene stays uncluttered at rest. Percentages
// are hand-tuned against /hero-background.png's fixed 4:3 composition, so
// they'll drift a little on extreme viewport aspect ratios - acceptable for
// a decorative shortcut that duplicates the real nav/buttons below. Hidden
// below sm: at narrow widths the three regions sit too close together and
// just overlap each other, so it reads as one confusing hit area instead of
// three distinct ones.
function HeroHotspot({ to, label, className }: HeroHotspotProps) {
  const sharedClassName = `group absolute hidden rounded-[2rem] outline-none transition-shadow duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35),0_0_40px_rgba(255,255,255,0.12)] focus-visible:shadow-[inset_0_0_0_2px_rgba(129,140,248,0.85)] sm:block ${className}`;

  if (to.startsWith("#")) {
    return <a href={to} className={sharedClassName} aria-label={label} />;
  }
  return <Link to={to} className={sharedClassName} aria-label={label} />;
}

export function Hero() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-1.5 sm:p-2">
      {/* flex on mobile (CTA stacks below the image, so more of it stays
          visible), grid on sm+ (both children share the same cell, so the
          CTA overlays the image's bottom-right corner like before). */}
      <div className="flex flex-col gap-6 sm:grid">
        <section className="relative isolate flex min-h-[calc(100dvh-10rem)] flex-col justify-end overflow-hidden rounded-[calc(2.5rem-0.5rem)] p-6 sm:col-start-1 sm:row-start-1 sm:p-10">
          {/* Background on its own layer (not the section itself) so it can
              drift independently of the text/buttons above it - a slow,
              barely-perceptible breathe (same technique as the AppShell
              nebula drift). background-size:cover always overflows its box,
              so any scale >= 1 never reveals an edge, however far the drift
              goes. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-20 bg-cover bg-center motion-safe:animate-[drift-hero_50s_ease-in-out_infinite]"
            style={{ backgroundImage: "url(/hero-background.png)" }}
          />
          {/* Dark gradient anchored to the bottom edge, not covering the image -
              keeps the center/top of the scene fully visible while the hero
              title stays legible. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
          />

          <HeroHotspot to="/chess" label="Chess pieces in the hero scene" className="left-[18%] top-[8%] h-[52%] w-[37%]" />
          <HeroHotspot to="#weather" label="Sky in the hero scene" className="left-0 top-0 h-[16%] w-full" />
          <HeroHotspot to="/mtg" label="Trading cards in the hero scene" className="left-[58%] top-[42%] h-[22%] w-[20%]" />

          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 20, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, delay: 0.05, ease: EASE }}
          >
            <span className="text-xs font-medium uppercase tracking-[0.25em] text-indigo-300">Sheodred&apos;s Forge</span>
            <h1 className="mt-2 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Where I drop my hyperfixations
            </h1>
          </motion.div>
        </section>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          className="rounded-2xl bg-black/20 p-4 text-left shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] sm:col-start-1 sm:row-start-1 sm:m-10 sm:max-w-xs sm:self-end sm:justify-self-end sm:bg-transparent sm:p-0 sm:text-right sm:backdrop-blur-none"
        >
          <p className="text-sm text-slate-200">No ads, no accounts - just MTG, chess, and whatever else I'm into this week.</p>
          <div className="mt-4 flex flex-wrap gap-2 sm:justify-end">
            <Link
              to="/mtg"
              className="group relative inline-flex items-center gap-3 rounded-full bg-indigo-500 py-2.5 pl-6 pr-2.5 text-sm font-medium text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-indigo-400 active:scale-[0.98]"
            >
              Browse cards
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/15 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-[1px] group-hover:translate-x-1 group-hover:scale-105">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M4 10 10 4M10 4H5M10 4v5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
            <Link
              to="/chess"
              className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-slate-200 backdrop-blur-md transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 active:scale-[0.98]"
            >
              Play chess
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
