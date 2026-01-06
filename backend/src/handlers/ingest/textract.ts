import type { S3Event } from "aws-lambda";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { extractTextWithTika } from "../../lib/tika.js";

type IngestMessage = {
  bucket: string;
  key: string;
  docId: string;
  title: string;
  contentType: string;
  text: string;
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT)
});

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.SQS_ENDPOINT || undefined,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "root",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "root"
  }
});

function decodeS3Key(key: string) {
  return decodeURIComponent(key.replace(/\+/g, " "));
}

function normalizePrefix(prefix: string) {
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function getDocIdFromKey(key: string) {
  const basename = key.split("/").pop() || "document";
  return basename.replace(/\.[^/.]+$/, "");
}

async function streamToBuffer(body: unknown) {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (typeof (body as { transformToByteArray?: () => Promise<Uint8Array> }).transformToByteArray === "function") {
    const array = await (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
    return Buffer.from(array);
  }

  const chunks: Buffer[] = [];
  const stream = body as NodeJS.ReadableStream;
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function handler(event: S3Event) {
  console.log('Textracting started')
  const queueUrl = process.env.SQS_QUEUE_URL;
  if (!queueUrl) {
    throw new Error("SQS_QUEUE_URL is not set.");
  }

  const rawPrefix = normalizePrefix(process.env.S3_RAW_PREFIX || "raw");

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeS3Key(record.s3.object.key);

    if (!key.startsWith(rawPrefix)) {
      console.log(`Skipping non-raw object ${bucket}/${key}.`);
      continue;
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );

    const buffer = await streamToBuffer(response.Body);
    if (buffer.length === 0) {
      throw new Error(`Empty object body for s3://${bucket}/${key}`);
    }

    const metadata = response.Metadata || {};
    const docId = (metadata["doc-id"] || metadata.docid || metadata.documentid || getDocIdFromKey(key)).trim();
    const title = (metadata.title || docId).trim();
    const contentType = response.ContentType || "application/octet-stream";

    const text = await extractTextWithTika(buffer, contentType);
    if (!text || text.trim().length === 0) {
      throw new Error(`Tika returned empty content for s3://${bucket}/${key}`);
    }

    const message: IngestMessage = {
      bucket,
      key,
      docId,
      title,
      contentType,
      text
    };

    console.log('Textracting successfully.');
    console.log(message);
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message)
      })
    );

    console.log(`Queued ingest for s3://${bucket}/${key}.`);
  }
}
