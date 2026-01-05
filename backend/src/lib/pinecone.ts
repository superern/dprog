import { Pinecone } from "@pinecone-database/pinecone";

const apiKey = process.env.PINECONE_API_KEY;
const indexName = process.env.PINECONE_INDEX;
const host = process.env.PINECONE_HOST;

if (!apiKey) {
  throw new Error("Missing PINECONE_API_KEY.");
}

if (!indexName) {
  throw new Error("Missing PINECONE_INDEX.");
}

export const pinecone = new Pinecone({ apiKey });

export const pineconeIndex = host
  ? pinecone.index(indexName, host)
  : pinecone.index(indexName);

export const pineconeNamespace = process.env.PINECONE_NAMESPACE ?? "";
