import fs from "node:fs/promises";
import path from "node:path";

import AWS from "aws-sdk";

const LOCAL_STORAGE_DIRECTORY = path.join(process.cwd(), ".backup-storage");

type StorageLoadResult =
  | {
      kind: "redirect";
      url: string;
    }
  | {
      kind: "buffer";
      buffer: Buffer;
    };

function isS3Configured() {
  return Boolean(
    process.env.AWS_S3_BUCKET &&
      process.env.AWS_S3_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
  );
}

function getS3Client() {
  if (!isS3Configured()) {
    throw new Error("S3 is not configured.");
  }

  return new AWS.S3({
    region: process.env.AWS_S3_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
    }
  });
}

async function ensureLocalStorageDirectory() {
  await fs.mkdir(LOCAL_STORAGE_DIRECTORY, { recursive: true });
}

export async function storeBackupArchive(params: {
  userId: string;
  backupId: string;
  archive: Buffer;
}) {
  const fileName = `stripe-backup-${params.userId}-${params.backupId}.zip`;
  const storageKey = `backups/${params.userId}/${params.backupId}/${fileName}`;

  if (isS3Configured()) {
    const s3 = getS3Client();
    await s3
      .putObject({
        Bucket: process.env.AWS_S3_BUCKET as string,
        Key: storageKey,
        Body: params.archive,
        ContentType: "application/zip"
      })
      .promise();

    return {
      storageKey,
      sizeBytes: params.archive.byteLength,
      fileName
    };
  }

  await ensureLocalStorageDirectory();
  const diskPath = path.join(LOCAL_STORAGE_DIRECTORY, storageKey);
  await fs.mkdir(path.dirname(diskPath), { recursive: true });
  await fs.writeFile(diskPath, params.archive);

  return {
    storageKey,
    sizeBytes: params.archive.byteLength,
    fileName
  };
}

export async function loadBackupArchive(storageKey: string): Promise<StorageLoadResult> {
  if (isS3Configured()) {
    const s3 = getS3Client();
    const url = await s3.getSignedUrlPromise("getObject", {
      Bucket: process.env.AWS_S3_BUCKET as string,
      Key: storageKey,
      Expires: 15 * 60
    });

    return {
      kind: "redirect",
      url
    };
  }

  const diskPath = path.join(LOCAL_STORAGE_DIRECTORY, storageKey);
  const buffer = await fs.readFile(diskPath);
  return {
    kind: "buffer",
    buffer
  };
}
