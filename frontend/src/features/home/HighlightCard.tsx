import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import type { Highlight } from "./highlights";

interface HighlightCardProps {
  highlight: Highlight;
  index: number;
}

export function HighlightCard({ highlight, index }: HighlightCardProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 24, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay: reduceMotion ? 0 : index * 0.08, ease: [0.32, 0.72, 0, 1] }}
      className="h-full rounded-[2rem] border border-white/10 bg-white/[0.03] p-1.5"
    >
      <Link
        to={highlight.to}
        className="group relative block h-full min-h-[16rem] overflow-hidden rounded-[calc(2rem-0.375rem)] bg-slate-900/80 p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)] transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.99]"
      >
        {highlight.imageUrl && (
          <img
            src={highlight.imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 transition-opacity duration-300 group-hover:opacity-55"
          />
        )}
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-tr ${highlight.accent} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}
        />
        <div className="relative flex h-full flex-col justify-end">
          <h3 className="text-lg font-semibold text-white drop-shadow-sm">{highlight.title}</h3>
          <p className="mt-2 text-sm text-slate-200 drop-shadow-sm">{highlight.description}</p>
          <span className="mt-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-white">
            Explore
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black/20 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-[1px] group-hover:translate-x-1">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M4 10 10 4M10 4H5M10 4v5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
