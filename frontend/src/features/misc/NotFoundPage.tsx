import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";

const EASE = [0.32, 0.72, 0, 1] as const;

export function NotFoundPage() {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div className="mx-auto flex w-3/4 max-w-2xl flex-col items-center py-20">
      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 24, filter: "blur(6px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: EASE }}
        className="w-full rounded-[2.5rem] border border-white/10 bg-white/[0.03] p-1.5"
      >
        <div className="flex flex-col items-center gap-3 rounded-[calc(2.5rem-0.375rem)] bg-slate-900/60 px-6 py-20 text-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-indigo-300">
            404
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl">
            Page not found
          </h1>
          <p className="max-w-xs text-slate-400">
            That page doesn&apos;t exist, or the link is out of date.
          </p>
          <Link
            to="/"
            className="group relative mt-6 inline-flex items-center gap-3 rounded-full bg-indigo-600 py-2.5 pl-6 pr-2.5 text-sm font-medium text-white transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-indigo-700 active:scale-[0.98]"
          >
            Back to home
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
        </div>
      </motion.div>
    </div>
  );
}
