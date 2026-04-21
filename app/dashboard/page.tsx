import { redirect } from "next/navigation";

import { BackupList } from "@/components/backup-list";
import { BackupProgress } from "@/components/backup-progress";
import { StripeConnectButton } from "@/components/stripe-connect-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPaidSessionFromCookies } from "@/lib/auth";
import {
  findPaidUserById,
  getBackupCountForUser,
  getStripeConnectionByUserId,
  listBackupsForUser
} from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function singleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await getPaidSessionFromCookies();
  if (!session) {
    redirect("/?paywallError=Dashboard%20access%20requires%20a%20paid%20session");
  }

  const params = await searchParams;
  const stripeError = singleParam(params.stripeError);
  const stripeConnected = singleParam(params.stripeConnected);

  const [user, connection, backups, backupCount] = await Promise.all([
    findPaidUserById(session.userId),
    getStripeConnectionByUserId(session.userId),
    listBackupsForUser(session.userId),
    getBackupCountForUser(session.userId)
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 sm:px-8">
      <header className="mb-8 flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-[var(--muted)]">Paid account</p>
          <h1 className="text-3xl font-bold tracking-tight">Backup Dashboard</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Logged in as <span className="font-medium text-[var(--foreground)]">{user?.email ?? session.email}</span>
          </p>
        </div>

        <form action="/api/paywall/logout" method="post">
          <Button variant="outline" type="submit">
            Sign Out
          </Button>
        </form>
      </header>

      {(stripeError || stripeConnected) && (
        <div
          className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
            stripeError
              ? "border-red-500/40 bg-red-500/10 text-red-200"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {stripeError || "Stripe account connected successfully."}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Account Setup</CardTitle>
            <CardDescription>
              Connect Stripe in read-only mode so backups can export your account activity automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[var(--border)]/70 bg-[var(--card-strong)] p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Stripe Account</p>
              <p className="mt-2 text-sm text-[var(--foreground)]">
                {connection
                  ? `${connection.accountDisplayName ?? "Connected account"}${
                      connection.accountEmail ? ` (${connection.accountEmail})` : ""
                    }`
                  : "No connected account"}
              </p>
              {connection ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Connected on {new Date(connection.connectedAt).toLocaleDateString()}
                </p>
              ) : null}
            </div>

            <StripeConnectButton connected={Boolean(connection)} />

            <p className="text-xs text-[var(--muted)]">
              Backups include charges, customers, subscriptions, payouts, invoices, and balance transactions in both CSV and JSON.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <BackupProgress hasConnection={Boolean(connection)} />

          <Card>
            <CardHeader>
              <CardTitle>Coverage Snapshot</CardTitle>
              <CardDescription>
                Keep at least one recent export before tax filing, migration work, or any policy-risk period.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--card-strong)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Backups Created</p>
                <p className="mt-2 text-2xl font-semibold">{backupCount}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--card-strong)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Latest Export</p>
                <p className="mt-2 text-sm font-semibold">
                  {backups[0] ? new Date(backups[0].startedAt).toLocaleDateString() : "Not started"}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)]/80 bg-[var(--card-strong)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Auto Schedule</p>
                <p className="mt-2 text-sm font-semibold">
                  {process.env.ENABLE_INTERNAL_CRON === "true" ? "Enabled" : "Manual only"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-8">
        <BackupList backups={backups} />
      </section>
    </main>
  );
}
