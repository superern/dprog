type PromptChunk = {
  docId: string;
  title: string;
  text: string;
};

export function buildPrompt(question: string, chunks: PromptChunk[]) {
  const context = chunks
    .map(
      (chunk, index) =>
        `Source ${index + 1}\nDoc: ${chunk.docId}\nTitle: ${chunk.title}\nText: ${chunk.text}`
    )
    .join("\n\n");

  return `You are a helpful assistant answering questions using the provided context.\n\nContext:\n${context}\n\nQuestion: ${question}\nAnswer using only the context. If the context is insufficient, say you don't have enough information.`;
}
