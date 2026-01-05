import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { jsonResponse } from "../lib/response.js";

type PresignRequest = {
  key?: string;
  contentType?: string;
  expiresInSeconds?: number;
};

const bucket = process.env.S3_BUCKET;
const endpoint = process.env.S3_ENDPOINT;

if (!bucket) {
  throw new Error("Missing S3_BUCKET.");
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: endpoint || undefined,
  forcePathStyle: Boolean(endpoint)
});

export async function handler(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return jsonResponse(400, { error: "Missing request body." });
  }

  let payload: PresignRequest;
  try {
    payload = JSON.parse(event.body) as PresignRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const key = payload.key?.trim();
  const contentType = payload.contentType?.trim() || "application/octet-stream";
  const expiresIn = payload.expiresInSeconds ?? 900;

  if (!key) {
    return jsonResponse(400, { error: "key is required." });
  }

  if (!key.startsWith("raw/")) {
    return jsonResponse(400, { error: "key must start with raw/." });
  }

  if (expiresIn <= 0 || expiresIn > 3600) {
    return jsonResponse(400, { error: "expiresInSeconds must be between 1 and 3600." });
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    return jsonResponse(200, {
      url,
      method: "PUT",
      bucket,
      key,
      expiresInSeconds: expiresIn
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse(500, { error: message });
  }
}
