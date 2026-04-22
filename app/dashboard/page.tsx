import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BackupDashboard } from "@/components/backup-dashboard";
import { getAuthenticatedEmailFromCookieStore } from "@/lib/access-control";
import { getUserByEmail, hasPaidAccess, listBackupsByEmail } from "@/lib/database";
import { initBackupScheduler } from "@/lib/backup-generator";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const email = getAuthenticatedEmailFromCookieStore(cookieStore);

  if (!email) {
    redirect("/");
  }

  const paid = await hasPaidAccess(email);

  if (!paid) {
    redirect("/");
  }

  initBackupScheduler();

  const [user, backups] = await Promise.all([getUserByEmail(email), listBackupsByEmail(email)]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <BackupDashboard
        email={email}
        stripeConnected={Boolean(user?.stripeAccountId)}
        initialBackups={backups.map((backup) => ({
          id: backup.id,
          kind: backup.kind,
          status: backup.status,
          createdAt: backup.createdAt,
          updatedAt: backup.updatedAt,
          fileName: backup.fileName,
          sizeBytes: backup.sizeBytes,
          error: backup.error
        }))}
      />
    </main>
  );
}
