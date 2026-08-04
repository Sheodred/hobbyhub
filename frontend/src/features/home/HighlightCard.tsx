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
      initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: reduceMotion ? 0 : index * 0.08 }}
    >
      <Link
        to={highlight.to}
        className="group relative block overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-6 transition-colors hover:border-slate-700"
      >
        <div
          aria-hidden="true"
          className={`absolute inset-0 bg-gradient-to-br ${highlight.accent} opacity-0 transition-opacity group-hover:opacity-100`}
        />
        <div className="relative">
          <h3 className="text-lg font-semibold text-slate-100">{highlight.title}</h3>
          <p className="mt-2 text-sm text-slate-400">{highlight.description}</p>
          <span className="mt-4 inline-block text-sm font-medium text-indigo-400 group-hover:underline">
            Explore &rarr;
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
