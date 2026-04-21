import type { BackupRecord } from "@/lib/database";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type BackupListProps = {
  backups: BackupRecord[];
};

function formatFileSize(bytes: number | null) {
  if (bytes === null) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function BackupList({ backups }: BackupListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup History</CardTitle>
        <CardDescription>
          Download complete ZIP archives containing JSON and CSV exports for each backup run.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {backups.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No backups yet. Create your first export to start protecting your records.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                  <th className="px-2 py-3 font-medium">Created</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Records</th>
                  <th className="px-2 py-3 font-medium">Size</th>
                  <th className="px-2 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => {
                  const recordCount = backup.summary
                    ? backup.summary.charges +
                      backup.summary.customers +
                      backup.summary.subscriptions +
                      backup.summary.payouts +
                      backup.summary.balanceTransactions +
                      backup.summary.invoices
                    : 0;

                  return (
                    <tr key={backup.id} className="border-b border-[var(--border)]/60">
                      <td className="px-2 py-3 text-[var(--foreground)]">
                        {new Date(backup.startedAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                            backup.status === "complete"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : backup.status === "failed"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-slate-500/20 text-slate-200"
                          }`}
                        >
                          {backup.status}
                        </span>
                        {backup.error ? (
                          <p className="mt-1 max-w-[260px] text-xs text-[var(--danger)]">{backup.error}</p>
                        ) : null}
                      </td>
                      <td className="px-2 py-3 text-[var(--foreground)]">{recordCount.toLocaleString()}</td>
                      <td className="px-2 py-3 text-[var(--foreground)]">{formatFileSize(backup.sizeBytes)}</td>
                      <td className="px-2 py-3">
                        {backup.status === "complete" ? (
                          <a
                            className="text-sm font-semibold text-emerald-300 underline-offset-4 hover:underline"
                            href={`/api/backup/download/${backup.id}`}
                          >
                            Download ZIP
                          </a>
                        ) : (
                          <span className="text-xs text-[var(--muted)]">Unavailable</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
