import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  /** Trigger once the element scrolls into view instead of immediately - use for content below the fold (e.g. grid items). */
  onScroll?: boolean;
}

/** Shared fade+slide-up entrance animation. Respects prefers-reduced-motion by skipping the animation entirely. */
export function FadeIn({ children, delay = 0, className, onScroll = false }: FadeInProps) {
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const trigger = onScroll
    ? { whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-40px" } }
    : { animate: { opacity: 1, y: 0 } };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.35, delay }}
      {...trigger}
    >
      {children}
    </motion.div>
  );
}
