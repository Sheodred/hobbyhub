import { motion } from "framer-motion";
import { Link } from "react-router-dom";

import { usePrefersReducedMotion } from "../../hooks/usePrefersReducedMotion";
import { useAuth } from "../auth/AuthContext";

export function Hero() {
  const { user, isLoading } = useAuth();
  const reduceMotion = usePrefersReducedMotion();

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-20 text-center sm:px-12">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-10 right-1/4 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl"
          animate={reduceMotion ? undefined : { x: [0, -30, 20, 0], y: [0, 20, -30, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <motion.h1
        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl"
      >
        A corner of the internet for the things I actually enjoy
      </motion.h1>

      <motion.p
        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mx-auto mt-4 max-w-xl text-lg text-slate-400"
      >
        Magic: The Gathering, chess against an engine that doesn't go easy on you, and the odd
        board game up for sale. No algorithm, no ads - just hobbies.
      </motion.p>

      <motion.div
        initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        {!isLoading && user ? (
          <span className="text-slate-300">
            Welcome back, <span className="font-medium text-slate-100">{user.displayName}</span> -
            jump into a{" "}
            <Link to="/chess" className="text-indigo-400 hover:underline">
              game of chess
            </Link>{" "}
            or browse{" "}
            <Link to="/mtg" className="text-indigo-400 hover:underline">
              some cards
            </Link>
            .
          </span>
        ) : (
          <>
            <Link
              to="/signup"
              className="rounded-md bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
            >
              Sign up
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Log in
            </Link>
          </>
        )}
      </motion.div>
    </section>
  );
}
