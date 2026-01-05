import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { jsonResponse } from "../lib/response.js";
import { embedTexts, openai, chatModel } from "../lib/openai.js";
import { pineconeIndex, pineconeNamespace } from "../lib/pinecone.js";

type AskRequest = {
  question: string;
  topK?: number;
};

type Source = {
  docId: string;
  title: string;
};

function buildPrompt(question: string, chunks: { docId: string; title: string; text: string }[]) {
  const context = chunks
    .map(
      (chunk, index) =>
        `Source ${index + 1}\nDoc: ${chunk.docId}\nTitle: ${chunk.title}\nText: ${chunk.text}`
    )
    .join("\n\n");

  return `You are a helpful assistant answering questions using the provided context.\n\nContext:\n${context}\n\nQuestion: ${question}\nAnswer using only the context. If the context is insufficient, say you don't have enough information.`;
}

export async function handler(event: APIGatewayProxyEventV2) {
  if (!event.body) {
    return jsonResponse(400, { error: "Missing request body." });
  }

  let payload: AskRequest;
  try {
    payload = JSON.parse(event.body) as AskRequest;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const question = payload.question?.trim();
  const topK = payload.topK ?? 3;

  if (!question) {
    return jsonResponse(400, { error: "question is required." });
  }

  if (Number.isNaN(topK) || topK <= 0) {
    return jsonResponse(400, { error: "topK must be a positive number." });
  }

  try {
    const [questionEmbedding] = await embedTexts([question]);
    const index = pineconeNamespace
      ? pineconeIndex.namespace(pineconeNamespace)
      : pineconeIndex;

    const queryResponse = await index.query({
      vector: questionEmbedding,
      topK,
      includeMetadata: true
    });

    const matches = queryResponse.matches ?? [];
    if (matches.length === 0) {
      return jsonResponse(200, {
        answer: "No relevant documents found.",
        sources: []
      });
    }

    const chunks = matches
      .map((match) => {
        const metadata = match.metadata as Record<string, unknown> | undefined;
        return {
          docId: String(metadata?.docId ?? ""),
          title: String(metadata?.title ?? "Untitled"),
          text: String(metadata?.chunkText ?? "")
        };
      })
      .filter((chunk) => chunk.docId && chunk.text);

    if (chunks.length === 0) {
      return jsonResponse(200, {
        answer: "No relevant documents found.",
        sources: []
      });
    }

    const prompt = buildPrompt(question, chunks);
    const completion = await openai.chat.completions.create({
      model: chatModel,
      messages: [
        { role: "system", content: "Answer questions using only provided context." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";

    const sourcesMap = new Map<string, Source>();
    for (const chunk of chunks) {
      const key = `${chunk.docId}::${chunk.title}`;
      if (!sourcesMap.has(key)) {
        sourcesMap.set(key, { docId: chunk.docId, title: chunk.title });
      }
    }

    return jsonResponse(200, {
      answer: answer || "No answer generated.",
      sources: Array.from(sourcesMap.values())
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error.";
    return jsonResponse(500, { error: message });
  }
}
