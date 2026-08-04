import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { ApiError } from "../../lib/apiClient";
import { useAuth } from "./AuthContext";

const MIN_PASSWORD_LENGTH = 8;

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): string | null {
    if (!email.trim() || !password || !displayName.trim()) {
      return "All fields are required.";
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validationError = validate();
    setError(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      await signup(email.trim(), password, displayName.trim());
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-semibold text-slate-100">Sign up</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="displayName" className="block text-sm text-slate-300">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="nickname"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {isSubmitting ? "Signing up..." : "Sign up"}
        </button>
      </form>

      <p className="mt-4 text-sm text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="text-indigo-400 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
