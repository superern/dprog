import type { SQSEvent } from "aws-lambda";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { chunkText } from "../../lib/chunk";
import { embedTexts } from "../../lib/openai";
import { pineconeIndex, pineconeNamespace } from "../../lib/pinecone";

type IngestMessage = {
  bucket?: string;
  key: string;
  docId: string;
  title: string;
  contentType?: string;
  text?: string;
};

const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT)
});

async function streamToString(body: unknown) {
  if (!body) return "";
  if (typeof body === "string") return body;
  if (Buffer.isBuffer(body)) return body.toString("utf8");
  if (typeof (body as { transformToString?: () => Promise<string> }).transformToString === "function") {
    return (body as { transformToString: () => Promise<string> }).transformToString();
  }

  const chunks: Buffer[] = [];
  const stream = body as NodeJS.ReadableStream;
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function handler(event: SQSEvent) {
  console.log('Ingest started')
  console.log('Starting to chunk and embed the file')
  const rawPrefix = process.env.S3_RAW_PREFIX || "raw/";
  const donePrefix = process.env.S3_DONE_PREFIX || "done/";

  for (const record of event.Records) {
    let message: IngestMessage;
    try {
      message = JSON.parse(record.body) as IngestMessage;
    } catch (error) {
      console.error("Invalid SQS message body:", record.body);
      throw error;
    }

    const bucket = message.bucket || process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error("Missing S3 bucket for ingest.");
    }

    const key = message.key?.trim();
    const docId = message.docId?.trim();
    const title = message.title?.trim();

    if (!key || !docId || !title) {
      throw new Error("SQS message missing key, docId, or title.");
    }

    let rawText = message.text?.trim();
    let contentType = message.contentType || "application/octet-stream";

    if (!rawText) {
      let response;
      try {
        response = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key
          })
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch s3://${bucket}/${key}: ${message}`);
      }

      contentType = message.contentType || response.ContentType || "application/octet-stream";
      rawText = await streamToString(response.Body);

      if (!rawText || rawText.trim().length === 0) {
        throw new Error(`Empty content for ${bucket}/${key}`);
      }
    }

    if (!contentType.startsWith("text/")) {
      if (!message.text) {
        throw new Error(`Missing extracted text for non-text content ${contentType} at s3://${bucket}/${key}.`);
      }
      console.warn(`Non-text content type (${contentType}) for ${bucket}/${key}.`);
    }

    const chunks = chunkText(rawText);
    if (chunks.length === 0) {
      console.warn(`No chunks generated for ${docId}.`);
      continue;
    }

    const index = pineconeNamespace ? pineconeIndex.namespace(pineconeNamespace) : pineconeIndex;

    try {
      await index.deleteMany({ docId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Pinecone deleteMany failed, continuing with upsert:", message);
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
    const vectors = chunks.map((chunk, index) => ({
      id: `${docId}#chunk-${chunk.index + 1}`,
      values: embeddings[index],
      metadata: {
        docId,
        title,
        chunkText: chunk.text,
        chunkIndex: chunk.index,
        sourceKey: key,
        contentType
      }
    }));

    await index.upsert(vectors);
    if (key.startsWith(rawPrefix)) {
      const trimmedRawPrefix = rawPrefix.endsWith("/") ? rawPrefix : `${rawPrefix}/`;
      const trimmedDonePrefix = donePrefix.endsWith("/") ? donePrefix : `${donePrefix}/`;
      const destinationKey = `${trimmedDonePrefix}${key.slice(trimmedRawPrefix.length)}`;

      await s3Client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: destinationKey,
          MetadataDirective: "COPY"
        })
      );
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key
        })
      );
      console.log(`Moved s3://${bucket}/${key} to s3://${bucket}/${destinationKey}.`);
    }

    console.log(`Ingested ${vectors.length} chunks for ${docId}.`);
  }
}
