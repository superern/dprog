# DPROG

Frontend (Next.js + TypeScript) and backend (Serverless + Pinecone + OpenAI).

## Requirements

- Node.js 18.x (matches Lambda runtime).
- npm 9+.
- Docker 24+ (for LocalStack and Tika).
- AWS CLI v2.
- Serverless Framework v3.38+.

## Step-by-step Setup Guide

1) Backend dependencies
```
cd backend
npm install
```

2) Backend env
Add `backend/.env` with required variables (see below).

Env vars Required:
- OPENAI_API_KEY
- PINECONE_API_KEY
- PINECONE_INDEX

Optional:
- OPENAI_EMBED_MODEL (default: text-embedding-3-small)
- OPENAI_CHAT_MODEL (default: gpt-4o-mini)
- PINECONE_HOST (use the index host URL if the SDK cannot resolve it)
- PINECONE_NAMESPACE (default: empty string)
- AWS_REGION (default: us-east-1)
- S3_ENDPOINT (default: http://localhost:4566)
- SQS_ENDPOINT (default: http://localhost:4566)
- SQS_QUEUE_URL (default: http://localhost:4566/000000000000/ingest-q)
- AWS_ACCESS_KEY_ID (default: test for LocalStack)
- AWS_SECRET_ACCESS_KEY (default: test for LocalStack)
- S3_RAW_PREFIX
- S3_DONE_PREFIX

3) LocalStack + Tika + deploy (bootstraps local infra)
```
npm run localstack:start
```
This runs:
- `localstack:docker`: pulls and starts the LocalStack container (S3/SQS/Lambda/API Gateway/CloudFormation).
- `localstack:wait`: waits for LocalStack to be healthy.
- `localstack:init`: creates the S3 bucket, the SQS queue, and applies S3 CORS for browser uploads.
- `tika:start`: pulls and starts Apache Tika on port 9998.
- `deploy:local`: deploys the Serverless stack into LocalStack so S3 `raw/` events invoke the textract Lambda (with Docker-safe endpoints for Tika and LocalStack).

4) Backend API (offline)
```
npm run offline
```
The API will be available at `http://localhost:8080`.

5) Frontend dependencies
```
cd ../frontend
npm install
```

6) Frontend env
Add `frontend/.env` with required variables (see below).

Env vars Required:
- NEXT_PUBLIC_DPROG_API (e.g. http://localhost:8080)

7) Frontend dev server
```
npm run frontend
```
The app will be available at `http://localhost:3000`.

Optional helpers:
- `npm run localstack:log` tails LocalStack logs.
- `npm run localstack:stop` stops the LocalStack container.
- `npm run tika:stop` stops the Tika container.

## Frontend 
### Assumptions and trade-offs

- Uses client-side presign + direct-to-S3 upload; no auth or session handling.
- Upload validation is MIME-based on the client; server still validates content.
- Status is optimistic (uploaded) and does not poll for ingest completion.
- Error handling is minimal to keep the flow simple.

If I had more time, I would:
- Add form validation and better error affordances.
- Add loading skeletons and improved empty states.
- Add tests (unit + E2E) for the form flows.


## Backend
### Example requests

POST /ingest/presign
```
curl -X POST http://localhost:8080/ingest/presign \
  -H 'Content-Type: application/json' \
  -d '{"filename":"sample.pdf","contentType":"application/pdf","docId":"sample-doc","title":"Sample PDF"}'
```

POST /ask
```
curl -X POST http://localhost:8080/ask \\
  -H 'Content-Type: application/json' \\
  -d '{\"question\":\"Can I get a refund on a digital product?\",\"topK\":3}'
```

### Assumptions and trade-offs

- Direct upload uses `/ingest/presign`; `/ingest` is no longer used in the UI flow.
- Chunking is character-based (500 chars with 50-char overlap) for simplicity and predictability.
- Re-ingest deletes previous chunks for the same docId before upserting; if delete fails, ingestion continues.
- Source list is deduped by docId + title; deeper citation granularity is not included.
- Minimal validation to keep the flow straightforward.

If I had more time, I would:
- Add stronger input validation and structured error codes.
- Add tracing and timing logs around embeddings and Pinecone calls.
