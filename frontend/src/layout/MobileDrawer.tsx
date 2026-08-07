import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { legalNavLinks, primaryNavLinks } from "./navigation";

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
}

const drawerLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-full px-4 py-2.5 text-lg transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
    isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
  }`;

const linkReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.1 + index * 0.05, ease: [0.32, 0.72, 0, 1] as const },
  }),
};

/**
 * Full-screen nav overlay for < md screens - the resizable Sidebar panel is
 * hidden there entirely, this replaces it. Respects prefers-reduced-motion
 * by swapping the fade transition for an instant show/hide and skipping the
 * staggered link entrance.
 */
export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const reduceMotion = usePrefersReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { type: "tween" as const, duration: 0.25 };
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Standard modal-dialog keyboard behavior: move focus in on open, trap Tab
  // within the dialog while it's open, close on Escape, and restore focus to
  // whatever triggered the drawer (the header's hamburger button) on close.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-40 overflow-y-auto bg-black/80 p-6 backdrop-blur-3xl md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-white">Sheodred's Forge</span>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white"
              aria-label="Close navigation menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <nav aria-label="Primary" className="mt-10 flex flex-col gap-1">
            {primaryNavLinks.map((link, index) => (
              <motion.div
                key={link.to}
                custom={index}
                variants={linkReveal}
                initial={reduceMotion ? undefined : "hidden"}
                animate="visible"
              >
                <NavLink to={link.to} className={drawerLinkClass} end={link.to === "/"} onClick={onClose}>
                  {link.label}
                </NavLink>
              </motion.div>
            ))}
            <hr className="my-4 border-white/10" />
            {legalNavLinks.map((link, index) => (
              <motion.div
                key={link.to}
                custom={primaryNavLinks.length + index}
                variants={linkReveal}
                initial={reduceMotion ? undefined : "hidden"}
                animate="visible"
              >
                <NavLink to={link.to} className={drawerLinkClass} onClick={onClose}>
                  {link.label}
                </NavLink>
              </motion.div>
            ))}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
