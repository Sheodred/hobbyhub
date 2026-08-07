import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { MusicPanel } from "./panels/MusicPanel";

const EASE = [0.32, 0.72, 0, 1] as const;

export function Hero() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-1.5 sm:p-2">
      <section className="relative overflow-hidden rounded-[calc(2.5rem-0.5rem)] bg-slate-900/60 px-6 py-24 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] sm:px-12 sm:py-32">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <motion.div
            className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl"
            animate={reduceMotion ? undefined : { x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-10 right-1/4 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl"
            animate={reduceMotion ? undefined : { x: [0, -30, 20, 0], y: [0, 20, -30, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.span
          initial={reduceMotion ? undefined : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-300"
        >
          No ads · No accounts · Just hobbies
        </motion.span>

        <motion.h1
          initial={reduceMotion ? undefined : { opacity: 0, y: 20, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.8, delay: 0.05, ease: EASE }}
          className="mt-5 text-5xl font-semibold tracking-tight text-slate-100 sm:text-6xl lg:text-7xl"
        >
          A corner of the internet for the things I actually enjoy
        </motion.h1>

        <motion.p
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
          className="mx-auto mt-5 max-w-xl text-lg text-slate-400"
        >
          Magic: The Gathering, and chess against an engine that doesn&apos;t go easy on you.
        </motion.p>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
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
            className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-medium text-slate-200 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 active:scale-[0.98]"
          >
            Play chess
          </Link>
        </motion.div>

        <motion.div
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: EASE }}
          className="mx-auto mt-12 max-w-md text-left"
        >
          <MusicPanel />
        </motion.div>
      </section>
    </div>
  );
}
