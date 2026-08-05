import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface FadeInProps {
  children: ReactNode;
  className?: string;
}

// Shared entrance animation for page-level content - same fade+slide-up
// used on the homepage Hero, now reused everywhere else instead of each
// page re-declaring the same initial/animate/transition props.
export function FadeIn({ children, className }: FadeInProps) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      // Strong ease-out, under 300ms - entrances should start fast and feel
      // responsive rather than linger (see emilkowalski/skills' emil-design-eng).
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
