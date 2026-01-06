import type { APIGatewayProxyEvent } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { jsonResponse } from "../../lib/response.js";

type IngestRequest = {
  bucket?: string;
  key?: string;
  docId?: string;
  title?: string;
  contentType?: string;
};

const sqs = new SQSClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.SQS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "root",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "root"
  }
});

export async function handler(event: APIGatewayProxyEvent) {
  if (!event.body) {
    return jsonResponse(400, { error: "Missing request body." });
  }

  let payload: IngestRequest;
  try {
    payload = JSON.parse(event.body) as IngestRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const bucket = payload.bucket?.trim() || process.env.S3_BUCKET;
  const key = payload.key?.trim();
  const docId = payload.docId?.trim();
  const title = payload.title?.trim();
  const contentType = payload.contentType?.trim();

  if (!bucket) {
    return jsonResponse(400, { error: "bucket is required." });
  }
  if (!key) {
    return jsonResponse(400, { error: "key is required." });
  }
  if (!docId) {
    return jsonResponse(400, { error: "docId is required." });
  }
  if (!title) {
    return jsonResponse(400, { error: "title is required." });
  }

  const queueUrl = process.env.SQS_QUEUE_URL;
  if (!queueUrl) {
    return jsonResponse(500, { error: "SQS_QUEUE_URL is not set." });
  }

  const message = {
    bucket,
    key,
    docId,
    title,
    contentType
  };

  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message)
      })
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse(500, { error: message });
  }

  return jsonResponse(202, {
    ok: true,
    queued: true,
    message
  });
}
