import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY.");
}

export const openai = new OpenAI({ apiKey });

export const embedModel = process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small";
export const chatModel = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: embedModel,
    input: texts
  });

  return response.data.map((item) => item.embedding);
}
