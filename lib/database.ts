import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIRECTORY = path.join(process.cwd(), ".local-data");
const DATABASE_PATH = path.join(DATA_DIRECTORY, "database.json");

export type BackupStatus = "running" | "complete" | "failed";

export type UserRecord = {
  id: string;
  email: string;
  createdAt: string;
  paidAt: string;
};

export type PaymentRecord = {
  id: string;
  email: string;
  stripeSessionId: string;
  amountTotal: number;
  currency: string;
  createdAt: string;
};

export type StripeConnectionRecord = {
  userId: string;
  stripeUserId: string;
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  livemode: boolean;
  accountDisplayName: string | null;
  accountEmail: string | null;
  autoBackupEnabled: boolean;
  connectedAt: string;
  updatedAt: string;
};

export type BackupSummary = {
  charges: number;
  customers: number;
  subscriptions: number;
  payouts: number;
  balanceTransactions: number;
  invoices: number;
};

export type BackupRecord = {
  id: string;
  userId: string;
  status: BackupStatus;
  fileName: string;
  storageKey: string | null;
  sizeBytes: number | null;
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  summary: BackupSummary | null;
};

type DatabaseSchema = {
  users: UserRecord[];
  payments: PaymentRecord[];
  stripeConnections: StripeConnectionRecord[];
  backups: BackupRecord[];
};

const EMPTY_DATABASE: DatabaseSchema = {
  users: [],
  payments: [],
  stripeConnections: [],
  backups: []
};

let queue: Promise<unknown> = Promise.resolve();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function withDatabaseLock<T>(operation: () => Promise<T>) {
  const run = queue.then(operation, operation);
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

async function ensureDatabaseExists() {
  await fs.mkdir(DATA_DIRECTORY, { recursive: true });

  try {
    await fs.access(DATABASE_PATH);
  } catch {
    await fs.writeFile(DATABASE_PATH, JSON.stringify(EMPTY_DATABASE, null, 2), "utf8");
  }
}

async function readDatabase() {
  await ensureDatabaseExists();
  const content = await fs.readFile(DATABASE_PATH, "utf8");

  try {
    const parsed = JSON.parse(content) as Partial<DatabaseSchema>;
    return {
      users: parsed.users ?? [],
      payments: parsed.payments ?? [],
      stripeConnections: parsed.stripeConnections ?? [],
      backups: parsed.backups ?? []
    } satisfies DatabaseSchema;
  } catch {
    return { ...EMPTY_DATABASE };
  }
}

async function writeDatabase(database: DatabaseSchema) {
  await fs.writeFile(DATABASE_PATH, JSON.stringify(database, null, 2), "utf8");
}

export async function findPaidUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const database = await readDatabase();
  return database.users.find((user) => user.email === normalized) ?? null;
}

export async function findPaidUserById(id: string) {
  const database = await readDatabase();
  return database.users.find((user) => user.id === id) ?? null;
}

export async function grantPaidAccessByEmail(email: string) {
  return withDatabaseLock(async () => {
    const normalized = normalizeEmail(email);
    const database = await readDatabase();

    const existing = database.users.find((user) => user.email === normalized);
    if (existing) {
      if (!existing.paidAt) {
        existing.paidAt = new Date().toISOString();
      }
      await writeDatabase(database);
      return existing;
    }

    const user: UserRecord = {
      id: crypto.randomUUID(),
      email: normalized,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString()
    };

    database.users.push(user);
    await writeDatabase(database);
    return user;
  });
}

export async function recordStripePayment(params: {
  email: string;
  stripeSessionId: string;
  amountTotal: number;
  currency: string;
}) {
  return withDatabaseLock(async () => {
    const normalized = normalizeEmail(params.email);
    const database = await readDatabase();

    const existingPayment = database.payments.find(
      (payment) => payment.stripeSessionId === params.stripeSessionId
    );

    if (!existingPayment) {
      const payment: PaymentRecord = {
        id: crypto.randomUUID(),
        email: normalized,
        stripeSessionId: params.stripeSessionId,
        amountTotal: params.amountTotal,
        currency: params.currency,
        createdAt: new Date().toISOString()
      };
      database.payments.push(payment);
    }

    let user = database.users.find((entry) => entry.email === normalized);
    if (!user) {
      user = {
        id: crypto.randomUUID(),
        email: normalized,
        createdAt: new Date().toISOString(),
        paidAt: new Date().toISOString()
      };
      database.users.push(user);
    }

    if (!user.paidAt) {
      user.paidAt = new Date().toISOString();
    }

    await writeDatabase(database);
    return user;
  });
}

export async function listPaymentsByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const database = await readDatabase();
  return database.payments.filter((payment) => payment.email === normalized);
}

export async function upsertStripeConnection(connection: {
  userId: string;
  stripeUserId: string;
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  livemode: boolean;
  accountDisplayName: string | null;
  accountEmail: string | null;
  autoBackupEnabled?: boolean;
}) {
  return withDatabaseLock(async () => {
    const database = await readDatabase();

    const existing = database.stripeConnections.find(
      (entry) => entry.userId === connection.userId
    );

    const now = new Date().toISOString();

    if (existing) {
      existing.stripeUserId = connection.stripeUserId;
      existing.accessToken = connection.accessToken;
      existing.refreshToken = connection.refreshToken;
      existing.scope = connection.scope;
      existing.livemode = connection.livemode;
      existing.accountDisplayName = connection.accountDisplayName;
      existing.accountEmail = connection.accountEmail;
      existing.autoBackupEnabled = connection.autoBackupEnabled ?? existing.autoBackupEnabled;
      existing.updatedAt = now;
      await writeDatabase(database);
      return existing;
    }

    const created: StripeConnectionRecord = {
      userId: connection.userId,
      stripeUserId: connection.stripeUserId,
      accessToken: connection.accessToken,
      refreshToken: connection.refreshToken,
      scope: connection.scope,
      livemode: connection.livemode,
      accountDisplayName: connection.accountDisplayName,
      accountEmail: connection.accountEmail,
      autoBackupEnabled: connection.autoBackupEnabled ?? true,
      connectedAt: now,
      updatedAt: now
    };

    database.stripeConnections.push(created);
    await writeDatabase(database);
    return created;
  });
}

export async function getStripeConnectionByUserId(userId: string) {
  const database = await readDatabase();
  return database.stripeConnections.find((entry) => entry.userId === userId) ?? null;
}

export async function removeStripeConnectionByStripeUserId(stripeUserId: string) {
  return withDatabaseLock(async () => {
    const database = await readDatabase();
    database.stripeConnections = database.stripeConnections.filter(
      (entry) => entry.stripeUserId !== stripeUserId
    );
    await writeDatabase(database);
  });
}

export async function createBackupRecord(userId: string) {
  return withDatabaseLock(async () => {
    const database = await readDatabase();
    const now = new Date().toISOString();
    const record: BackupRecord = {
      id: crypto.randomUUID(),
      userId,
      status: "running",
      fileName: "",
      storageKey: null,
      sizeBytes: null,
      startedAt: now,
      completedAt: null,
      error: null,
      summary: null
    };

    database.backups.push(record);
    await writeDatabase(database);
    return record;
  });
}

export async function completeBackupRecord(
  backupId: string,
  values: {
    fileName: string;
    storageKey: string;
    sizeBytes: number;
    summary: BackupSummary;
  }
) {
  return withDatabaseLock(async () => {
    const database = await readDatabase();
    const backup = database.backups.find((entry) => entry.id === backupId);
    if (!backup) {
      return null;
    }

    backup.status = "complete";
    backup.fileName = values.fileName;
    backup.storageKey = values.storageKey;
    backup.sizeBytes = values.sizeBytes;
    backup.summary = values.summary;
    backup.completedAt = new Date().toISOString();
    backup.error = null;

    await writeDatabase(database);
    return backup;
  });
}

export async function failBackupRecord(backupId: string, error: string) {
  return withDatabaseLock(async () => {
    const database = await readDatabase();
    const backup = database.backups.find((entry) => entry.id === backupId);
    if (!backup) {
      return null;
    }

    backup.status = "failed";
    backup.error = error;
    backup.completedAt = new Date().toISOString();

    await writeDatabase(database);
    return backup;
  });
}

export async function listBackupsForUser(userId: string) {
  const database = await readDatabase();
  return database.backups
    .filter((backup) => backup.userId === userId)
    .sort((a, b) => (a.startedAt > b.startedAt ? -1 : 1));
}

export async function getBackupByIdForUser(backupId: string, userId: string) {
  const database = await readDatabase();
  return (
    database.backups.find((backup) => backup.id === backupId && backup.userId === userId) ?? null
  );
}

export async function listConnectedPaidUsers() {
  const database = await readDatabase();
  const paidUserIds = new Set(database.users.map((user) => user.id));

  return database.stripeConnections
    .filter((connection) => paidUserIds.has(connection.userId) && connection.autoBackupEnabled)
    .map((connection) => ({
      user: database.users.find((user) => user.id === connection.userId)!,
      connection
    }));
}

export async function getBackupCountForUser(userId: string) {
  const backups = await listBackupsForUser(userId);
  return backups.length;
}
