import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch, ApiError } from "../../lib/apiClient";
import { useAuth } from "./AuthContext";
import type { UserResponse } from "./types";

export function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    // ProtectedRoute guarantees this in practice, but keeps the component
    // safe to render standalone (e.g. in tests) without a non-null user.
    return null;
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setStatus("saving");
    setError(null);
    try {
      await apiFetch<UserResponse>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      setStatus("saved");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "Could not save changes.");
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-3xl font-semibold text-slate-100">Profile</h1>

      <div className="mt-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-lg font-semibold text-white">
          {user.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-slate-100">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-4">
        <div>
          <label htmlFor="displayName" className="block text-sm text-slate-300">
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setStatus("idle");
            }}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
          />
        </div>

        {status === "saved" && <p className="text-sm text-emerald-400">Saved.</p>}
        {status === "error" && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {status === "saving" ? "Saving..." : "Save changes"}
        </button>
      </form>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-6 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
      >
        Log out
      </button>
    </div>
  );
}
