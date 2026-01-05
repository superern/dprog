export type Chunk = {
  text: string;
  index: number;
};

const DEFAULT_CHUNK_SIZE = 500;
const DEFAULT_CHUNK_OVERLAP = 50;

// Chunk strategy: split on whitespace into ~500-char chunks with a 50-char overlap.
export function chunkText(
  text: string,
  chunkSize = DEFAULT_CHUNK_SIZE,
  overlap = DEFAULT_CHUNK_OVERLAP
): Chunk[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return [];
  }

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    const end = Math.min(start + chunkSize, cleaned.length);
    const slice = cleaned.slice(start, end).trim();
    if (slice) {
      chunks.push({ text: slice, index });
      index += 1;
    }
    if (end >= cleaned.length) {
      break;
    }
    start = Math.max(0, end - overlap);
  }

  return chunks;
}
