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
        className="group relative block h-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700"
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
        <div className="relative">
          <h3 className="text-lg font-semibold text-white drop-shadow-sm">{highlight.title}</h3>
          <p className="mt-2 text-sm text-slate-200 drop-shadow-sm">{highlight.description}</p>
          <span className="mt-4 inline-block text-sm font-medium text-white group-hover:underline">
            Explore &rarr;
          </span>
        </div>
      </Link>
    </motion.div>
  );
}
