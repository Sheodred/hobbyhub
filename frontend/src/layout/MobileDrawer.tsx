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
 * Nav overlay, triggered by the header's hamburger at every breakpoint
 * (there is no persistent sidebar - see docs/adr/0010). Anchored to the top
 * of the screen, directly under the header pill, and grows downward from
 * there (transform-origin: top) rather than fading in as a separate
 * screen-centered card - the previous centered layout let a tall link list
 * push its own close button off the top of the viewport, which is exactly
 * what made the menu hard to close on mobile. The header's hamburger (now
 * an X, see Header.tsx's z-50) stays visible above the drawer the whole
 * time, so the button that opened the menu also closes it. Respects
 * prefers-reduced-motion by swapping the grow transition for an instant
 * show/hide and skipping the staggered link entrance.
 */
export function MobileDrawer({ open, onClose }: MobileDrawerProps) {
  const reduceMotion = usePrefersReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : { type: "tween" as const, duration: 0.25 };
  const panelVariants = reduceMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : { hidden: { opacity: 0, scaleY: 0.85, y: -16 }, visible: { opacity: 1, scaleY: 1, y: 0 } };
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
          className="fixed inset-0 z-40 bg-black/35 backdrop-blur-3xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          {/* top-[5rem]: the header pill's exact rendered bottom edge (its
              sticky top-4 = 1rem, plus the header wrapper's own py-2 top
              padding = 0.5rem, plus the pill's h-14 = 3.5rem - 1+0.5+3.5 =
              5rem). rounded-t-none and border-t-0 below drop this panel's
              top edge entirely, so there is no border, no radius break and
              no gap where it meets the pill above - together they read as
              one shape, not two stacked cards. */}
          <motion.div
            className="fixed inset-x-4 top-[5rem] z-40 mx-auto flex max-h-[calc(100dvh-6.25rem)] w-full max-w-md flex-col overflow-hidden rounded-b-[2rem] rounded-t-none border border-t-0 border-white/10 bg-white/[0.03] p-1.5 pt-0"
            style={{ transformOrigin: "top center" }}
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={transition}
          >
            {/* The scroll container: both the close button above and the
                back-to-top/close arrow below are `sticky` *inside* this
                element, so either stays reachable regardless of how far the
                link list is scrolled - the bug this replaces was a close
                button that could scroll off the top of the viewport entirely
                on a long list on a short phone screen. rounded-t-none
                matches the outer panel's now-flat top (see its top-[5rem]
                comment) - the header pill above already carries the
                "Sheodred's Forge" title and its own close button, so this
                row is icon-only rather than repeating a second title bar
                that would read as a second, separate card. */}
            <div className="flex-1 overflow-y-auto rounded-b-[calc(2rem-0.375rem)] rounded-t-none bg-slate-900/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]">
              <div className="sticky top-0 z-10 flex justify-end bg-slate-900/95 px-4 pb-2 pt-3 backdrop-blur">
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

              <nav aria-label="Primary" className="flex flex-col gap-1 px-6 pb-4 sm:px-8">
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

              {/* Bottom-pinned close affordance: reachable without scrolling
                  back up, for exactly the case the header's button and the
                  top close button both miss - your thumb and your attention
                  are already at the bottom of a long list. */}
              <div className="sticky bottom-0 z-10 flex justify-center bg-gradient-to-t from-slate-900/95 to-transparent pb-4 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-800/90 px-4 py-2 text-xs font-medium text-slate-300 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/10 hover:text-white"
                  aria-label="Close menu"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
