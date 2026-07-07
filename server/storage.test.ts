import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const awsMocks = vi.hoisted(() => {
  const send = vi.fn();
  return {
    send,
    putObjectCommand: vi.fn((input: unknown) => ({ input })),
    s3Client: vi.fn(() => ({ send })),
  };
});

vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: awsMocks.putObjectCommand,
  S3Client: awsMocks.s3Client,
}));

const originalAwsRegion = process.env.AWS_REGION;
const originalS3Bucket = process.env.S3_BUCKET;
const originalS3KeyPrefix = process.env.S3_KEY_PREFIX;
const originalS3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL;
const originalForgeApiUrl = process.env.BUILT_IN_FORGE_API_URL;
const originalForgeApiKey = process.env.BUILT_IN_FORGE_API_KEY;

describe("storage", () => {
  beforeEach(() => {
    vi.resetModules();
    awsMocks.send.mockReset();
    awsMocks.send.mockResolvedValue({});
    awsMocks.putObjectCommand.mockClear();
    awsMocks.s3Client.mockClear();

    process.env.AWS_REGION = "ap-northeast-2";
    process.env.S3_BUCKET = "pickleplay-dev-assets";
    process.env.S3_KEY_PREFIX = "dev";
    process.env.S3_PUBLIC_BASE_URL = "https://cdn.example.com/assets/";
    delete process.env.BUILT_IN_FORGE_API_URL;
    delete process.env.BUILT_IN_FORGE_API_KEY;
  });

  afterEach(() => {
    restoreEnv("AWS_REGION", originalAwsRegion);
    restoreEnv("S3_BUCKET", originalS3Bucket);
    restoreEnv("S3_KEY_PREFIX", originalS3KeyPrefix);
    restoreEnv("S3_PUBLIC_BASE_URL", originalS3PublicBaseUrl);
    restoreEnv("BUILT_IN_FORGE_API_URL", originalForgeApiUrl);
    restoreEnv("BUILT_IN_FORGE_API_KEY", originalForgeApiKey);
  });

  it("uploads to S3 and returns the public asset URL", async () => {
    const { storageGet, storagePut } = await import("./storage");

    const result = await storagePut(
      "/community/10/img test.webp",
      new Uint8Array([1, 2, 3]),
      "image/webp"
    );
    const lookup = await storageGet("/community/10/img test.webp");

    expect(awsMocks.s3Client).toHaveBeenCalledWith({
      region: "ap-northeast-2",
    });
    expect(awsMocks.putObjectCommand).toHaveBeenCalledWith({
      Bucket: "pickleplay-dev-assets",
      Key: "dev/community/10/img test.webp",
      Body: new Uint8Array([1, 2, 3]),
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    });
    expect(awsMocks.send).toHaveBeenCalledOnce();
    expect(result).toEqual({
      key: "dev/community/10/img test.webp",
      url: "https://cdn.example.com/assets/dev/community/10/img%20test.webp",
    });
    expect(lookup).toEqual(result);
  });

  it("does not apply the S3 environment prefix twice", async () => {
    const { storageGet } = await import("./storage");

    const lookup = await storageGet("dev/community/10/img test.webp");

    expect(lookup).toEqual({
      key: "dev/community/10/img test.webp",
      url: "https://cdn.example.com/assets/dev/community/10/img%20test.webp",
    });
  });

  it("uses the S3 bucket URL when a public base URL is not configured", async () => {
    delete process.env.S3_PUBLIC_BASE_URL;
    const { storageGet } = await import("./storage");

    const lookup = await storageGet("community/10/img test.webp");

    expect(lookup).toEqual({
      key: "dev/community/10/img test.webp",
      url: "https://pickleplay-dev-assets.s3.ap-northeast-2.amazonaws.com/dev/community/10/img%20test.webp",
    });
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
