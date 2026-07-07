import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { ENV } from "./_core/env";

type StorageConfig =
  | {
      kind: "s3";
      bucket: string;
      region: string;
      keyPrefix: string;
      publicBaseUrl: string;
    }
  | { kind: "forge"; baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig {
  if (ENV.s3Bucket) {
    return {
      kind: "s3",
      bucket: ENV.s3Bucket,
      region: ENV.awsRegion,
      keyPrefix: normalizeKey(ENV.s3KeyPrefix).replace(/\/+$/, ""),
      publicBaseUrl: ENV.s3PublicBaseUrl.replace(/\/+$/, ""),
    };
  }

  if (ENV.forgeApiUrl && ENV.forgeApiKey) {
    return {
      kind: "forge",
      baseUrl: ENV.forgeApiUrl.replace(/\/+$/, ""),
      apiKey: ENV.forgeApiKey,
    };
  }

  throw new Error(
    "Storage credentials missing: set S3_BUCKET or BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
  );
}

let s3Client: S3Client | null = null;

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function applyKeyPrefix(key: string, prefix: string): string {
  if (!prefix || key === prefix || key.startsWith(`${prefix}/`)) return key;
  return `${prefix}/${key}`;
}

function encodeKeyPath(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function buildS3Url(
  config: Extract<StorageConfig, { kind: "s3" }>,
  key: string
): string {
  const encodedKey = encodeKeyPath(key);
  if (config.publicBaseUrl) return `${config.publicBaseUrl}/${encodedKey}`;
  return `https://${config.bucket}.s3.${config.region}.amazonaws.com/${encodedKey}`;
}

function getS3Client(region: string): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region });
  }
  return s3Client;
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob = new Blob([toBlobPart(data)], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function toBlobPart(data: Buffer | Uint8Array | string): BlobPart {
  if (typeof data === "string") return data;
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  return bytes;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);

  if (config.kind === "s3") {
    const s3Key = applyKeyPrefix(key, config.keyPrefix);
    await getS3Client(config.region).send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: s3Key,
        Body: data,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    return { key: s3Key, url: buildS3Url(config, s3Key) };
  }

  const { baseUrl, apiKey } = config;
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);
  if (config.kind === "s3") {
    const s3Key = applyKeyPrefix(key, config.keyPrefix);
    return { key: s3Key, url: buildS3Url(config, s3Key) };
  }
  const { baseUrl, apiKey } = config;
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
