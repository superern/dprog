2) Backend – API Gateway + Lambda (Node.js/TS)
   Use AWS API Gateway → Lambda (Node.js, written in TypeScript).
   Endpoints:
1. POST /ingest
   ● Request body:
   {
   "documents": [
   {
   "id": "refund-policy",
   "title": "Refund Policy",
   "content": "Full refund within 30 days with receipt. No refunds on
   digital goods."
   JSON
   JSON
   }
   ]
   }
   ● Behavior:
   ● Chunk content (any simple strategy; document it).
   ● For each chunk:
   ● Generate an embedding.
   ● Upsert into Pinecone with:
   ● id (e.g. refund-policy#chunk-1)
   ● vector
   ● metadata: at least docId, title, chunkText
   ● Re-ingesting same id should update, not duplicate.
   ● Response example:
   {
   "ingestedDocuments": 1,
   "ingestedChunks": 4
   }
2. POST /ask
   ● Request body:
   {
   "question": "Can I get a refund on a digital product?",
   "topK": 3
   }
   ● Behavior:
   ● Embed question.
   ● Query Pinecone for topK similar chunks.
   ● Build a prompt with question + retrieved chunks.
   ● Call an LLM (OpenAI, Anthropic, etc.).
   ● Return:
   JSON
   {
   "answer": "Digital products are not eligible for refunds.",
   "sources": [
   { "docId": "refund-policy", "title": "Refund Policy" }
   ]
   }
   ● Handle:
   ● No docs / no matches.
   ● Pinecone/LLM errors.
   ● Bad input



Hard Rules
● ❌ No LangChain.
● ❌ No LlamaIndex or similar RAG frameworks.
● ✅ You can use:
● Pinecone SDK.
● Official LLM/embedding SDKs. What are the Official LLM embedding sdks? give me sample before you do it.
● fetch / axios / etc.
You should implement the RAG flow yourself:
chunk → embed → store → query → build prompt → call LLM → answer.
