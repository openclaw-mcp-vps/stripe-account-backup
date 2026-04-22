"use client";

import { useMemo, useState } from "react";
import { Archive, CircleAlert, Download, Loader2 } from "lucide-react";
import { StripeConnectButton } from "@/components/stripe-connect-button";

interface BackupItem {
  id: string;
  kind: "full" | "incremental";
  status: "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  fileName: string;
  sizeBytes: number;
  error: string | null;
}

interface BackupDashboardProps {
  email: string;
  stripeConnected: boolean;
  initialBackups: BackupItem[];
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function toFriendlyDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function BackupDashboard({ email, stripeConnected, initialBackups }: BackupDashboardProps) {
  const [backups, setBackups] = useState<BackupItem[]>(initialBackups);
  const [isCreating, setIsCreating] = useState<"full" | "incremental" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const completedCount = useMemo(
    () => backups.filter((backup) => backup.status === "completed").length,
    [backups]
  );

  async function createBackup(kind: "full" | "incremental") {
    setIsCreating(kind);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/backup/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ kind })
      });

      const payload = (await response.json()) as {
        backup?: BackupItem;
        error?: string;
      };

      if (!response.ok || !payload.backup) {
        throw new Error(payload.error || "Backup creation failed.");
      }

      setBackups((previous) => [payload.backup as BackupItem, ...previous]);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create backup right now.");
    } finally {
      setIsCreating(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Backup Dashboard</h1>
            <p className="mt-2 text-sm text-slate-300">Signed in as {email}. Generate and download complete Stripe account backups.</p>
          </div>
          <StripeConnectButton connected={stripeConnected} />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-700 bg-[#121825] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Stripe status</p>
            <p className="mt-2 text-lg font-semibold text-white">{stripeConnected ? "Connected" : "Not connected"}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-[#121825] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Completed backups</p>
            <p className="mt-2 text-lg font-semibold text-white">{completedCount}</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-[#121825] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Coverage</p>
            <p className="mt-2 text-lg font-semibold text-white">Transactions, customers, subscriptions, payouts</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void createBackup("full")}
            disabled={isCreating !== null || !stripeConnected}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-[#0d1117] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating === "full" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Create Full Backup
          </button>
          <button
            type="button"
            onClick={() => void createBackup("incremental")}
            disabled={isCreating !== null || !stripeConnected}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating === "incremental" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            Create Incremental Backup
          </button>
        </div>

        {!stripeConnected ? (
          <p className="mt-4 text-sm text-amber-300">
            Connect Stripe first to allow secure read-only export access.
          </p>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            <CircleAlert className="mt-0.5 h-4 w-4" />
            <p>{errorMessage}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h2 className="text-xl font-semibold text-white">Backup History</h2>
        <p className="mt-2 text-sm text-slate-300">
          Download any completed archive for compliance, tax filings, dispute evidence, or migration records.
        </p>

        {backups.length === 0 ? (
          <p className="mt-5 rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-4 text-sm text-slate-400">
            No backups yet. Create your first full backup to establish your baseline snapshot.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-3 pr-4 font-medium">Created</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Archive</th>
                  <th className="py-3 pr-4 font-medium">Size</th>
                  <th className="py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => (
                  <tr key={backup.id} className="border-b border-slate-800 text-slate-200">
                    <td className="py-3 pr-4">{toFriendlyDate(backup.createdAt)}</td>
                    <td className="py-3 pr-4 capitalize">{backup.kind}</td>
                    <td className="py-3 pr-4 capitalize">{backup.status}</td>
                    <td className="truncate py-3 pr-4 text-slate-300">{backup.fileName}</td>
                    <td className="py-3 pr-4 text-slate-300">{formatBytes(backup.sizeBytes)}</td>
                    <td className="py-3">
                      {backup.status === "completed" ? (
                        <a
                          href={`/api/backup/download?id=${backup.id}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </a>
                      ) : backup.status === "failed" ? (
                        <span className="text-xs text-rose-300">{backup.error || "Failed"}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processing
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
