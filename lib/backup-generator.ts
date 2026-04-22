import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import cron from "node-cron";
import archiver from "archiver";
import { createObjectCsvWriter } from "csv-writer";
import AWS from "aws-sdk";
import type Stripe from "stripe";
import type { BackupKind, StripeBackupData } from "@/types/stripe-data";
import {
  completeBackupRecord,
  createBackupRecord,
  failBackupRecord,
  listBackupsByEmail,
  listPaidConnectedUsers,
  type BackupRecord
} from "@/lib/database";
import { getUserStripeClient } from "@/lib/stripe-client";
import {
  mapCustomersToCsvRows,
  mapPayoutsToCsvRows,
  mapSubscriptionsToCsvRows,
  mapTransactionsToCsvRows
} from "@/utils/data-formatter";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");

function slugifyEmail(email: string): string {
  return email.replace(/[^a-z0-9]/gi, "-").toLowerCase();
}

function buildBackupFileName(email: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  return `stripe-backup-${slugifyEmail(email)}-${stamp}.zip`;
}

async function getIncrementalSinceTimestamp(email: string): Promise<number | null> {
  const backups = await listBackupsByEmail(email);
  const completed = backups.find((backup) => backup.status === "completed");

  if (!completed) {
    return null;
  }

  return Math.floor(new Date(completed.createdAt).getTime() / 1000);
}

async function fetchStripeData(email: string, kind: BackupKind): Promise<StripeBackupData> {
  const stripe = await getUserStripeClient(email);
  const sinceTimestamp = kind === "incremental" ? await getIncrementalSinceTimestamp(email) : null;

  const createdFilter = sinceTimestamp
    ? ({
        created: {
          gte: sinceTimestamp
        }
      } as const)
    : {};

  const customers = await stripe.customers
    .list({
      limit: 100,
      ...createdFilter
    })
    .autoPagingToArray({ limit: 10000 });

  const subscriptions = await stripe.subscriptions
    .list({
      status: "all",
      limit: 100,
      ...createdFilter
    })
    .autoPagingToArray({ limit: 10000 });

  const payouts = await stripe.payouts
    .list({
      limit: 100,
      ...createdFilter
    })
    .autoPagingToArray({ limit: 10000 });

  const transactions = await stripe.charges
    .list({
      limit: 100,
      ...createdFilter
    })
    .autoPagingToArray({ limit: 10000 });

  return {
    customers,
    subscriptions,
    payouts,
    transactions
  };
}

async function writeJsonFile(filePath: string, payload: unknown): Promise<void> {
  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf-8");
}

async function writeCsvExports(exportDir: string, data: StripeBackupData): Promise<void> {
  const customers = mapCustomersToCsvRows(data.customers);
  const subscriptions = mapSubscriptionsToCsvRows(data.subscriptions);
  const payouts = mapPayoutsToCsvRows(data.payouts);
  const transactions = mapTransactionsToCsvRows(data.transactions);

  await createObjectCsvWriter({
    path: path.join(exportDir, "customers.csv"),
    header: [
      { id: "id", title: "ID" },
      { id: "email", title: "EMAIL" },
      { id: "name", title: "NAME" },
      { id: "createdAt", title: "CREATED_AT" },
      { id: "currency", title: "CURRENCY" },
      { id: "delinquent", title: "DELINQUENT" }
    ]
  }).writeRecords(customers);

  await createObjectCsvWriter({
    path: path.join(exportDir, "subscriptions.csv"),
    header: [
      { id: "id", title: "ID" },
      { id: "customerId", title: "CUSTOMER_ID" },
      { id: "status", title: "STATUS" },
      { id: "currentPeriodStart", title: "CURRENT_PERIOD_START" },
      { id: "currentPeriodEnd", title: "CURRENT_PERIOD_END" },
      { id: "cancelAtPeriodEnd", title: "CANCEL_AT_PERIOD_END" },
      { id: "amount", title: "AMOUNT" },
      { id: "currency", title: "CURRENCY" }
    ]
  }).writeRecords(subscriptions);

  await createObjectCsvWriter({
    path: path.join(exportDir, "payouts.csv"),
    header: [
      { id: "id", title: "ID" },
      { id: "amount", title: "AMOUNT" },
      { id: "currency", title: "CURRENCY" },
      { id: "status", title: "STATUS" },
      { id: "arrivalDate", title: "ARRIVAL_DATE" },
      { id: "createdAt", title: "CREATED_AT" },
      { id: "method", title: "METHOD" }
    ]
  }).writeRecords(payouts);

  await createObjectCsvWriter({
    path: path.join(exportDir, "transactions.csv"),
    header: [
      { id: "id", title: "ID" },
      { id: "amount", title: "AMOUNT" },
      { id: "currency", title: "CURRENCY" },
      { id: "status", title: "STATUS" },
      { id: "paid", title: "PAID" },
      { id: "customerId", title: "CUSTOMER_ID" },
      { id: "description", title: "DESCRIPTION" },
      { id: "createdAt", title: "CREATED_AT" }
    ]
  }).writeRecords(transactions);
}

async function createZipArchive(sourceDir: string, zipPath: string): Promise<void> {
  await mkdir(path.dirname(zipPath), { recursive: true });

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    output.on("error", (error) => reject(error));
    archive.on("error", (error) => reject(error));

    archive.pipe(output);
    archive.directory(sourceDir, false);
    void archive.finalize();
  });
}

async function storeArchive(zipPath: string, fileName: string): Promise<{
  storageProvider: "local" | "s3";
  storagePath: string;
  sizeBytes: number;
}> {
  const stats = await stat(zipPath);
  const bucket = process.env.AWS_S3_BUCKET;

  if (bucket && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    const region = process.env.AWS_REGION || "us-east-1";
    const s3 = new AWS.S3({ region });
    const key = `stripe-account-backup/${fileName}`;

    await s3
      .putObject({
        Bucket: bucket,
        Key: key,
        Body: await readFile(zipPath),
        ContentType: "application/zip"
      })
      .promise();

    return {
      storageProvider: "s3",
      storagePath: key,
      sizeBytes: stats.size
    };
  }

  await mkdir(BACKUP_DIR, { recursive: true });
  const localPath = path.join(BACKUP_DIR, fileName);
  await writeFile(localPath, await readFile(zipPath));

  return {
    storageProvider: "local",
    storagePath: localPath,
    sizeBytes: stats.size
  };
}

async function exportBackupData(tempExportDir: string, data: StripeBackupData): Promise<void> {
  await writeJsonFile(path.join(tempExportDir, "customers.json"), data.customers);
  await writeJsonFile(path.join(tempExportDir, "subscriptions.json"), data.subscriptions);
  await writeJsonFile(path.join(tempExportDir, "payouts.json"), data.payouts);
  await writeJsonFile(path.join(tempExportDir, "transactions.json"), data.transactions);
  await writeCsvExports(tempExportDir, data);
}

export async function createBackupForEmail(email: string, kind: BackupKind): Promise<BackupRecord> {
  const fileName = buildBackupFileName(email);
  const record = await createBackupRecord({ email, kind, fileName });

  const tempRoot = await mkdir(path.join(os.tmpdir(), `stripe-backup-${record.id}`), {
    recursive: true
  }).then(() => path.join(os.tmpdir(), `stripe-backup-${record.id}`));

  const exportDir = path.join(tempRoot, "export");
  const zipPath = path.join(tempRoot, fileName);

  try {
    await mkdir(exportDir, { recursive: true });
    const data = await fetchStripeData(email, kind);

    await exportBackupData(exportDir, data);
    await createZipArchive(exportDir, zipPath);

    const storage = await storeArchive(zipPath, fileName);
    const completed = await completeBackupRecord({
      backupId: record.id,
      email,
      storageProvider: storage.storageProvider,
      storagePath: storage.storagePath,
      sizeBytes: storage.sizeBytes
    });

    if (!completed) {
      throw new Error("Backup metadata disappeared before completion.");
    }

    return completed;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown backup error";
    await failBackupRecord({
      backupId: record.id,
      email,
      error: message
    });
    throw error;
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export function initBackupScheduler(): void {
  const globalState = globalThis as typeof globalThis & {
    __stripeBackupSchedulerStarted?: boolean;
  };

  if (globalState.__stripeBackupSchedulerStarted) {
    return;
  }

  globalState.__stripeBackupSchedulerStarted = true;

  cron.schedule(
    "17 2 * * *",
    async () => {
      const users = await listPaidConnectedUsers();

      for (const user of users) {
        try {
          await createBackupForEmail(user.email, "incremental");
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown scheduler error";
          console.error(`Scheduled backup failed for ${user.email}: ${message}`);
        }
      }
    },
    {
      timezone: "UTC"
    }
  );
}
