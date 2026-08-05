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
  `block rounded-md px-3 py-2 text-base transition-colors ${
    isActive ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
  }`;

/**
 * Slide-out nav for < md screens - the resizable Sidebar panel is hidden
 * there entirely, this replaces it. Respects prefers-reduced-motion by
 * swapping the slide transition for an instant show/hide.
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
        <>
          <motion.div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto bg-slate-900 p-4 shadow-xl md:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={transition}
          >
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">HobbyHub</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="rounded-md p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Close navigation menu"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                  <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <nav aria-label="Primary" className="mt-4 flex flex-col gap-1">
              {primaryNavLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={drawerLinkClass} end={link.to === "/"} onClick={onClose}>
                  {link.label}
                </NavLink>
              ))}
              <hr className="my-2 border-slate-800" />
              {legalNavLinks.map((link) => (
                <NavLink key={link.to} to={link.to} className={drawerLinkClass} onClick={onClose}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
