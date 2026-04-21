"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type BackupProgressProps = {
  hasConnection: boolean;
};

export function BackupProgress({ hasConnection }: BackupProgressProps) {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function triggerBackup() {
    setStatusMessage("Collecting Stripe data and packaging archive...");

    const response = await fetch("/api/backup/create", {
      method: "POST"
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatusMessage(payload.error ?? "Backup failed. Please retry.");
      return;
    }

    setStatusMessage("Backup finished. Refreshing dashboard...");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <h3 className="text-lg font-semibold">Generate Backup</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Export charges, customers, subscriptions, payouts, invoices, and balance transactions into a single archive.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Button onClick={() => void triggerBackup()} disabled={!hasConnection || isPending}>
          {isPending ? "Working..." : "Create Backup Now"}
        </Button>
        {!hasConnection ? (
          <span className="text-sm text-[var(--warning)]">Connect Stripe first to enable exports.</span>
        ) : null}
      </div>
      {statusMessage ? <p className="mt-3 text-sm text-[var(--muted)]">{statusMessage}</p> : null}
    </div>
  );
}
