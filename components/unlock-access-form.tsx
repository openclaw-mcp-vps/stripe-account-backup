"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle2, CircleAlert, Loader2 } from "lucide-react";

export function UnlockAccessForm() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/access/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Could not verify payment for this email.");
      }

      setSuccessMessage("Access granted. Redirecting to your dashboard...");
      window.location.href = "/dashboard";
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Verification failed. Confirm you used the same email address from Stripe checkout."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleUnlock} className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
      <h3 className="text-lg font-semibold text-white">Already purchased?</h3>
      <p className="mt-2 text-sm text-slate-300">
        Enter the email used during Stripe checkout to unlock your backup dashboard.
      </p>

      <label htmlFor="unlock-email" className="mt-4 block text-xs uppercase tracking-[0.16em] text-slate-400">
        Purchase Email
      </label>
      <input
        id="unlock-email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
        placeholder="founder@yourcompany.com"
        className="mt-2 w-full rounded-lg border border-slate-600 bg-[#0d1117] px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400"
      />

      <button
        type="submit"
        disabled={isLoading}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Unlock Dashboard
      </button>

      {errorMessage ? (
        <p className="mt-3 inline-flex items-center gap-2 text-sm text-rose-300">
          <CircleAlert className="h-4 w-4" />
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-3 text-sm text-emerald-300">{successMessage}</p>
      ) : null}
    </form>
  );
}
