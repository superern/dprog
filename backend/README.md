# Backend

Serverless backend using AWS API Gateway + Lambda (Node.js/TypeScript).

## Endpoints

POST /ingest
- Body: { "documents": [{ "id": "...", "title": "...", "content": "..." }] }
- Chunking strategy: normalized whitespace, then ~500-character chunks with 50-character overlap.
- Each chunk is embedded and upserted into Pinecone with metadata { docId, title, chunkText }.
- Re-ingesting a document removes previous chunks for that docId before upserting.

POST /ask
- Body: { "question": "...", "topK": 3 }
- Embeds the question, queries Pinecone, builds a prompt from the top matches, and calls the LLM.
- Response: { "answer": "...", "sources": [{ "docId": "...", "title": "..." }] }

## Environment variables

- OPENAI_API_KEY
- OPENAI_EMBED_MODEL (default: text-embedding-3-small)
- OPENAI_CHAT_MODEL (default: gpt-4o-mini)
- PINECONE_API_KEY
- PINECONE_INDEX
- PINECONE_HOST (optional, use the index host URL if the SDK cannot resolve it)
- PINECONE_NAMESPACE (optional)

## Local scripts

- npm run build
- npm run deploy
- npm run offline
