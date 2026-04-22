import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { BackupKind, BackupStatus } from "@/types/stripe-data";

const DATABASE_PATH = path.join(process.cwd(), "data", "database.json");

export interface UserRecord {
  email: string;
  stripeAccountId: string;
  stripeAccessToken: string;
  stripeRefreshToken: string;
  stripeScope: string;
  stripeLivemode: boolean;
  connectedAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  email: string;
  source: "stripe" | "lemonsqueezy";
  status: "paid" | "refunded" | "active";
  eventId: string;
  amount: number | null;
  currency: string | null;
  paidAt: string;
}

export interface BackupRecord {
  id: string;
  email: string;
  kind: BackupKind;
  status: BackupStatus;
  createdAt: string;
  updatedAt: string;
  fileName: string;
  storageProvider: "local" | "s3";
  storagePath: string;
  sizeBytes: number;
  error: string | null;
}

interface DatabaseShape {
  users: UserRecord[];
  payments: PaymentRecord[];
  backups: BackupRecord[];
}

const EMPTY_DATABASE: DatabaseShape = {
  users: [],
  payments: [],
  backups: []
};

let writeQueue = Promise.resolve();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function ensureDatabaseFile(): Promise<void> {
  await mkdir(path.dirname(DATABASE_PATH), { recursive: true });

  try {
    await readFile(DATABASE_PATH, "utf-8");
  } catch {
    await writeFile(DATABASE_PATH, JSON.stringify(EMPTY_DATABASE, null, 2), "utf-8");
  }
}

async function readDatabase(): Promise<DatabaseShape> {
  await ensureDatabaseFile();
  const raw = await readFile(DATABASE_PATH, "utf-8");

  try {
    const parsed = JSON.parse(raw) as DatabaseShape;

    return {
      users: parsed.users ?? [],
      payments: parsed.payments ?? [],
      backups: parsed.backups ?? []
    };
  } catch {
    return EMPTY_DATABASE;
  }
}

async function writeDatabase(database: DatabaseShape): Promise<void> {
  await writeFile(DATABASE_PATH, JSON.stringify(database, null, 2), "utf-8");
}

async function withWriteLock<T>(operation: (database: DatabaseShape) => Promise<T> | T): Promise<T> {
  let resolveNext: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    resolveNext = resolve;
  });

  const previous = writeQueue;
  writeQueue = previous.then(() => gate);
  await previous;

  try {
    const database = await readDatabase();
    const result = await operation(database);
    await writeDatabase(database);

    return result;
  } finally {
    resolveNext?.();
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const target = normalizeEmail(email);
  const database = await readDatabase();

  return database.users.find((user) => user.email === target) ?? null;
}

export async function upsertStripeConnection(input: {
  email: string;
  stripeAccountId: string;
  stripeAccessToken: string;
  stripeRefreshToken: string;
  stripeScope: string;
  stripeLivemode: boolean;
}): Promise<UserRecord> {
  const email = normalizeEmail(input.email);

  return withWriteLock((database) => {
    const now = new Date().toISOString();
    const existing = database.users.find((user) => user.email === email);

    if (existing) {
      existing.stripeAccountId = input.stripeAccountId;
      existing.stripeAccessToken = input.stripeAccessToken;
      existing.stripeRefreshToken = input.stripeRefreshToken;
      existing.stripeScope = input.stripeScope;
      existing.stripeLivemode = input.stripeLivemode;
      existing.updatedAt = now;

      return existing;
    }

    const created: UserRecord = {
      email,
      stripeAccountId: input.stripeAccountId,
      stripeAccessToken: input.stripeAccessToken,
      stripeRefreshToken: input.stripeRefreshToken,
      stripeScope: input.stripeScope,
      stripeLivemode: input.stripeLivemode,
      connectedAt: now,
      updatedAt: now
    };

    database.users.push(created);

    return created;
  });
}

export async function recordPayment(input: {
  email: string;
  source: "stripe" | "lemonsqueezy";
  status: "paid" | "refunded" | "active";
  eventId: string;
  amount: number | null;
  currency: string | null;
  paidAt?: string;
}): Promise<PaymentRecord> {
  const email = normalizeEmail(input.email);

  return withWriteLock((database) => {
    const existing = database.payments.find((payment) => payment.eventId === input.eventId);

    if (existing) {
      return existing;
    }

    const payment: PaymentRecord = {
      id: randomUUID(),
      email,
      source: input.source,
      status: input.status,
      eventId: input.eventId,
      amount: input.amount,
      currency: input.currency,
      paidAt: input.paidAt ?? new Date().toISOString()
    };

    database.payments.push(payment);

    return payment;
  });
}

export async function hasPaidAccess(email: string): Promise<boolean> {
  const target = normalizeEmail(email);
  const database = await readDatabase();

  return database.payments.some(
    (payment) => payment.email === target && (payment.status === "paid" || payment.status === "active")
  );
}

export async function createBackupRecord(input: {
  email: string;
  kind: BackupKind;
  fileName: string;
}): Promise<BackupRecord> {
  const email = normalizeEmail(input.email);

  return withWriteLock((database) => {
    const now = new Date().toISOString();
    const record: BackupRecord = {
      id: randomUUID(),
      email,
      kind: input.kind,
      status: "running",
      createdAt: now,
      updatedAt: now,
      fileName: input.fileName,
      storageProvider: "local",
      storagePath: "",
      sizeBytes: 0,
      error: null
    };

    database.backups.push(record);

    return record;
  });
}

export async function completeBackupRecord(input: {
  backupId: string;
  email: string;
  storageProvider: "local" | "s3";
  storagePath: string;
  sizeBytes: number;
}): Promise<BackupRecord | null> {
  const email = normalizeEmail(input.email);

  return withWriteLock((database) => {
    const record = database.backups.find((backup) => backup.id === input.backupId && backup.email === email);

    if (!record) {
      return null;
    }

    record.status = "completed";
    record.updatedAt = new Date().toISOString();
    record.storageProvider = input.storageProvider;
    record.storagePath = input.storagePath;
    record.sizeBytes = input.sizeBytes;
    record.error = null;

    return record;
  });
}

export async function failBackupRecord(input: {
  backupId: string;
  email: string;
  error: string;
}): Promise<BackupRecord | null> {
  const email = normalizeEmail(input.email);

  return withWriteLock((database) => {
    const record = database.backups.find((backup) => backup.id === input.backupId && backup.email === email);

    if (!record) {
      return null;
    }

    record.status = "failed";
    record.updatedAt = new Date().toISOString();
    record.error = input.error;

    return record;
  });
}

export async function listBackupsByEmail(email: string): Promise<BackupRecord[]> {
  const target = normalizeEmail(email);
  const database = await readDatabase();

  return database.backups
    .filter((backup) => backup.email === target)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getBackupById(email: string, backupId: string): Promise<BackupRecord | null> {
  const target = normalizeEmail(email);
  const database = await readDatabase();

  return database.backups.find((backup) => backup.email === target && backup.id === backupId) ?? null;
}

export async function listPaidConnectedUsers(): Promise<UserRecord[]> {
  const database = await readDatabase();
  const eligibleEmails = new Set(
    database.payments
      .filter((payment) => payment.status === "paid" || payment.status === "active")
      .map((payment) => payment.email)
  );

  return database.users.filter((user) => eligibleEmails.has(user.email));
}
