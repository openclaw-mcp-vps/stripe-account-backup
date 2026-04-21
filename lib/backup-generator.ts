import { PassThrough } from "node:stream";

import archiver from "archiver";
import { CronJob } from "cron";
import { createObjectCsvStringifier } from "csv-writer";

import {
  completeBackupRecord,
  createBackupRecord,
  failBackupRecord,
  listConnectedPaidUsers,
  type BackupSummary,
  type StripeConnectionRecord
} from "@/lib/database";
import { storeBackupArchive } from "@/lib/storage";
import { createConnectedStripeClient } from "@/lib/stripe-client";

type StripeRecord = {
  id?: string;
};

type BackupDataSet = {
  charges: StripeRecord[];
  customers: StripeRecord[];
  subscriptions: StripeRecord[];
  payouts: StripeRecord[];
  balanceTransactions: StripeRecord[];
  invoices: StripeRecord[];
};

let scheduler: CronJob | null = null;
let scheduledRun: Promise<number> | null = null;

function safeString(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function toCsv(data: StripeRecord[]) {
  if (data.length === 0) {
    return "id\n";
  }

  const rows = data.map((entry) => {
    const raw = entry as Record<string, unknown>;
    const row: Record<string, string> = {};
    Object.entries(raw).forEach(([key, value]) => {
      row[key] = safeString(value);
    });
    return row;
  });

  const headers = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row)))
  );

  const csvStringifier = createObjectCsvStringifier({
    header: headers.map((column) => ({ id: column, title: column }))
  });

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);
}

function serializeRecords<T>(records: T[]) {
  return JSON.parse(JSON.stringify(records)) as T[];
}

async function buildZipArchive(files: {
  name: string;
  content: string | Buffer;
}[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const output = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    output.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    output.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    archive.on("error", (error) => {
      reject(error);
    });

    archive.pipe(output);

    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }

    const finalizeResult = archive.finalize();
    if (finalizeResult && typeof (finalizeResult as Promise<void>).catch === "function") {
      (finalizeResult as Promise<void>).catch((error) => reject(error));
    }
  });
}

async function listAllPages<T extends StripeRecord>(
  fetchPage: (startingAfter?: string) => Promise<{
    data: T[];
    has_more: boolean;
  }>
) {
  const items: T[] = [];
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const page = await fetchPage(cursor);
    items.push(...page.data);
    hasMore = page.has_more;
    cursor = page.data[page.data.length - 1]?.id;

    if (!cursor && hasMore) {
      hasMore = false;
    }
  }

  return items;
}

async function collectStripeData(accessToken: string): Promise<BackupDataSet> {
  const stripe = createConnectedStripeClient(accessToken);

  async function safeCollect<T extends StripeRecord>(
    collector: () => Promise<T[]>
  ): Promise<T[]> {
    try {
      return await collector();
    } catch {
      return [];
    }
  }

  const [charges, customers, subscriptions, payouts, balanceTransactions, invoices] =
    await Promise.all([
      safeCollect(() =>
        listAllPages((startingAfter) =>
          stripe.charges.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {})
          })
        )
      ),
      safeCollect(() =>
        listAllPages((startingAfter) =>
          stripe.customers.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {})
          })
        )
      ),
      safeCollect(() =>
        listAllPages((startingAfter) =>
          stripe.subscriptions.list({
            status: "all",
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {})
          })
        )
      ),
      safeCollect(() =>
        listAllPages((startingAfter) =>
          stripe.payouts.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {})
          })
        )
      ),
      safeCollect(() =>
        listAllPages((startingAfter) =>
          stripe.balanceTransactions.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {})
          })
        )
      ),
      safeCollect(() =>
        listAllPages((startingAfter) =>
          stripe.invoices.list({
            limit: 100,
            ...(startingAfter ? { starting_after: startingAfter } : {})
          })
        )
      )
    ]);

  return {
    charges: serializeRecords(charges),
    customers: serializeRecords(customers),
    subscriptions: serializeRecords(subscriptions),
    payouts: serializeRecords(payouts),
    balanceTransactions: serializeRecords(balanceTransactions),
    invoices: serializeRecords(invoices)
  };
}

function getSummary(data: BackupDataSet): BackupSummary {
  return {
    charges: data.charges.length,
    customers: data.customers.length,
    subscriptions: data.subscriptions.length,
    payouts: data.payouts.length,
    balanceTransactions: data.balanceTransactions.length,
    invoices: data.invoices.length
  };
}

function buildArchiveFiles(params: {
  stripeUserId: string;
  generatedAt: string;
  data: BackupDataSet;
}) {
  const summary = getSummary(params.data);

  const files: { name: string; content: string }[] = [
    {
      name: "manifest.json",
      content: JSON.stringify(
        {
          generatedAt: params.generatedAt,
          stripeUserId: params.stripeUserId,
          datasets: summary
        },
        null,
        2
      )
    }
  ];

  const entries: [keyof BackupDataSet, string][] = [
    ["charges", "charges"],
    ["customers", "customers"],
    ["subscriptions", "subscriptions"],
    ["payouts", "payouts"],
    ["balanceTransactions", "balance-transactions"],
    ["invoices", "invoices"]
  ];

  for (const [key, folderName] of entries) {
    const records = params.data[key];
    files.push({
      name: `json/${folderName}.json`,
      content: JSON.stringify(records, null, 2)
    });
    files.push({
      name: `csv/${folderName}.csv`,
      content: toCsv(records)
    });
  }

  return {
    files,
    summary
  };
}

export async function createStripeBackup(params: {
  userId: string;
  stripeConnection: StripeConnectionRecord;
}) {
  const backup = await createBackupRecord(params.userId);

  try {
    const generatedAt = new Date().toISOString();
    const data = await collectStripeData(params.stripeConnection.accessToken);
    const archive = buildArchiveFiles({
      stripeUserId: params.stripeConnection.stripeUserId,
      generatedAt,
      data
    });

    const zipBuffer = await buildZipArchive(archive.files);
    const storage = await storeBackupArchive({
      userId: params.userId,
      backupId: backup.id,
      archive: zipBuffer
    });

    const completed = await completeBackupRecord(backup.id, {
      fileName: storage.fileName,
      storageKey: storage.storageKey,
      sizeBytes: storage.sizeBytes,
      summary: archive.summary
    });

    if (!completed) {
      throw new Error("Backup metadata could not be finalized.");
    }

    return completed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected backup failure";
    await failBackupRecord(backup.id, message);
    throw error;
  }
}

export function ensureBackupSchedulerRunning() {
  if (scheduler || process.env.ENABLE_INTERNAL_CRON !== "true") {
    return;
  }

  const expression = process.env.BACKUP_CRON_SCHEDULE ?? "0 3 * * *";

  scheduler = new CronJob(expression, async () => {
    await runScheduledBackupsNow();
  });

  scheduler.start();
}

export async function runScheduledBackupsNow() {
  if (scheduledRun) {
    return scheduledRun;
  }

  scheduledRun = (async () => {
    const connectedUsers = await listConnectedPaidUsers();
    let completed = 0;

    for (const entry of connectedUsers) {
      try {
        await createStripeBackup({
          userId: entry.user.id,
          stripeConnection: entry.connection
        });
        completed += 1;
      } catch {
        // Individual backup failures should not cancel the entire scheduled batch.
      }
    }

    return completed;
  })();

  scheduledRun.finally(() => {
    scheduledRun = null;
  });

  return scheduledRun;
}
