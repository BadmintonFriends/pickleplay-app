export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  awsRegion:
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION ??
    "ap-northeast-2",
  s3Bucket: process.env.S3_BUCKET ?? "",
  s3KeyPrefix: process.env.S3_KEY_PREFIX ?? "",
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? "",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioVerifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  twilioMessagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID ?? "",
};
