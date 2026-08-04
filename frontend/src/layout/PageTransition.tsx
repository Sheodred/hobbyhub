import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps route content in a subtle fade/rise on navigation. Keyed on
 * pathname so React remounts (and Framer Motion re-animates) per route.
 * Respects prefers-reduced-motion by skipping the animation entirely
 * rather than just shortening it.
 */
export function PageTransition({ children }: PageTransitionProps) {
  const { pathname } = useLocation();
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
    return <div key={pathname}>{children}</div>;
  }

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
