import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const spacesEndpoint = process.env.SPACES_ENDPOINT;
const spacesRegion = process.env.SPACES_REGION ?? "us-east-1";
const spacesBucket = process.env.SPACES_BUCKET;
const spacesAccessKeyId = process.env.SPACES_ACCESS_KEY_ID;
const spacesSecretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY;

let client: S3Client | null = null;

function ensureSpacesEnv() {
  if (!spacesEndpoint || !spacesBucket || !spacesAccessKeyId || !spacesSecretAccessKey) {
    throw new Error("DigitalOcean Spaces is not configured. Set SPACES_ENDPOINT, SPACES_BUCKET, SPACES_ACCESS_KEY_ID, SPACES_SECRET_ACCESS_KEY.");
  }
}

function normalizeEndpoint() {
  ensureSpacesEnv();

  const raw = (spacesEndpoint ?? "").trim().replace(/\/+$/, "");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  const host = parsed.host.toLowerCase();
  const bucket = (spacesBucket ?? "").toLowerCase();
  const bucketPrefix = `${bucket}.`;
  const endpointHost = host.startsWith(bucketPrefix) ? host.slice(bucketPrefix.length) : host;

  return {
    endpointUrl: `${parsed.protocol}//${endpointHost}`,
    publicBaseUrl: `https://${spacesBucket}.${endpointHost}`,
  };
}

function getClient() {
  ensureSpacesEnv();

  if (!client) {
    const normalized = normalizeEndpoint();
    client = new S3Client({
      region: spacesRegion,
      endpoint: normalized.endpointUrl,
      credentials: {
        accessKeyId: spacesAccessKeyId!,
        secretAccessKey: spacesSecretAccessKey!,
      },
    });
  }

  return client;
}

function sanitizeName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .toLowerCase();
}

export function getPublicObjectUrl(key: string) {
  ensureSpacesEnv();

  const cdn = process.env.SPACES_CDN_BASE_URL?.replace(/\/$/, "");
  if (cdn) {
    return `${cdn}/${key}`;
  }

  return `${normalizeEndpoint().publicBaseUrl}/${key}`;
}

export async function createUploadUrl({
  key,
  contentType,
  expiresIn = 900,
}: {
  key: string;
  contentType: string;
  expiresIn?: number;
}) {
  const command = new PutObjectCommand({
    Bucket: spacesBucket,
    Key: key,
    ContentType: contentType,
    ACL: "public-read",
  });

  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });

  return {
    uploadUrl,
    fileUrl: getPublicObjectUrl(key),
  };
}

export async function uploadObject({
  key,
  contentType,
  body,
}: {
  key: string;
  contentType: string;
  body: Buffer | Uint8Array;
}) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: spacesBucket,
      Key: key,
      ContentType: contentType,
      ACL: "public-read",
      Body: body,
    }),
  );

  return {
    fileUrl: getPublicObjectUrl(key),
  };
}

export async function deleteObjectByKey(key: string) {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: spacesBucket,
      Key: key,
    }),
  );
}

export function buildObjectKey({
  scope,
  userId,
  originalFileName,
  issueId,
}: {
  scope: "avatar" | "attachment";
  userId: string;
  originalFileName: string;
  issueId?: string;
}) {
  const safeName = sanitizeName(originalFileName) || "file";
  const id = randomUUID();

  if (scope === "avatar") {
    return `avatars/${userId}/${id}-${safeName}`;
  }

  return `attachments/${issueId ?? "misc"}/${userId}/${id}-${safeName}`;
}


