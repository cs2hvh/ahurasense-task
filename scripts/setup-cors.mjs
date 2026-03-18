import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { config } from "dotenv";

config();

const endpoint = process.env.SPACES_ENDPOINT?.trim().replace(/\/+$/, "");
const bucket = process.env.SPACES_BUCKET;
const region = process.env.SPACES_REGION ?? "us-east-1";
const accessKeyId = process.env.SPACES_ACCESS_KEY_ID;
const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY;

if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
  console.error("Missing SPACES env vars");
  process.exit(1);
}

// Normalize endpoint: remove bucket prefix if present
const url = new URL(/^https?:\/\//i.test(endpoint) ? endpoint : `https://${endpoint}`);
const host = url.host.toLowerCase();
const bucketPrefix = `${bucket.toLowerCase()}.`;
const endpointHost = host.startsWith(bucketPrefix) ? host.slice(bucketPrefix.length) : host;
const endpointUrl = `${url.protocol}//${endpointHost}`;

const client = new S3Client({
  region,
  endpoint: endpointUrl,
  credentials: { accessKeyId, secretAccessKey },
});

const corsConfig = {
  CORSRules: [
    {
      AllowedOrigins: ["*"],
      AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    },
  ],
};

try {
  await client.send(new PutBucketCorsCommand({ Bucket: bucket, CORSConfiguration: corsConfig }));
  console.log(`CORS configured on bucket "${bucket}" successfully.`);
} catch (err) {
  console.error("Failed to set CORS:", err.message);
  process.exit(1);
}
