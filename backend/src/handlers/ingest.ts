import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { jsonResponse } from "../lib/response.js";
import { chunkText } from "../lib/chunk.js";
import { embedTexts } from "../lib/openai.js";
import { pineconeIndex, pineconeNamespace } from "../lib/pinecone.js";

type DocInput = {
  id: string;
  title: string;
  content: string;
};

type IngestRequest = {
  documents: DocInput[];
};

export async function handler(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return jsonResponse(400, { error: "Missing request body." });
  }

  let payload: IngestRequest;
  try {
    payload = JSON.parse(event.body) as IngestRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  if (!payload.documents || !Array.isArray(payload.documents)) {
    return jsonResponse(400, { error: "documents must be an array." });
  }

  const documents = payload.documents.filter((doc) =>
    Boolean(doc && doc.id && doc.title && doc.content)
  );

  if (documents.length === 0) {
    return jsonResponse(400, { error: "No valid documents provided." });
  }

  let ingestedChunks = 0;

  for (const doc of documents) {
    const chunks = chunkText(doc.content);
    if (chunks.length === 0) {
      continue;
    }

    const index = pineconeNamespace
      ? pineconeIndex.namespace(pineconeNamespace)
      : pineconeIndex;

    // Remove any previous chunks for this docId to avoid duplicates.
    try {
      await index.deleteMany({ docId: doc.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Pinecone deleteMany failed, continuing with upsert:", message);
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));
    const vectors = chunks.map((chunk, index) => ({
      id: `${doc.id}#chunk-${chunk.index + 1}`,
      values: embeddings[index],
      metadata: {
        docId: doc.id,
        title: doc.title,
        chunkText: chunk.text,
        chunkIndex: chunk.index
      }
    }));

    await index.upsert(vectors);
    ingestedChunks += vectors.length;
  }

  return jsonResponse(200, {
    ingestedDocuments: documents.length,
    ingestedChunks
  });
}
