# DPROG

Frontend (Next.js + TypeScript) and backend (Serverless + Pinecone + OpenAI).

## Frontend

### How to run locally

1) Install dependencies
```
cd frontend
npm install
```

2) Add `frontend/.env.local` with required variables (see below).

3) Run dev server
```
npm run dev
```

The app will be available at `http://localhost:3000`.

### Env vars needed

Required:
- NEXT_PUBLIC_DPROG_API (e.g. http://localhost:8080)

### High-level deploy steps

1) Set `NEXT_PUBLIC_DPROG_API` to your deployed backend URL.
2) Build and start:
```
npm run build
npm run start
```

### Assumptions and trade-offs

- Uses client-side fetches to call the backend; no auth or session handling.
- UI expects `answer` and `sources` fields but falls back to common alternatives.
- Simple success/error handling to keep UX minimal.

If I had more time, I would:
- Add form validation and better error affordances.
- Add loading skeletons and improved empty states.
- Add tests (unit + E2E) for the form flows.

## Backend

Serverless backend using AWS API Gateway + Lambda (Node.js/TypeScript) with Pinecone + OpenAI.

## How to run locally

1) Install dependencies
```
npm install
```

2) Add `backend/.env` with required variables (see below).

3) Start LocalStack (S3 + SQS)
```
cd backend
npm run localstack:start
```

4) Initialize LocalStack resources (bucket + queue, requires AWS CLI)
```
npm run localstack:init
```

5) Add CORS to the bucket (required for browser uploads)
```
aws --endpoint-url http://localhost:4566 s3api put-bucket-cors \
  --bucket dprog \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["http://localhost:3000"],
      "AllowedMethods": ["PUT","GET","HEAD","POST"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 30000
    }]
  }'
```

6) Run offline (this will auto-create SQS queues if missing)
```
npm run offline
```

The API will be available at `http://localhost:8080`.

## Env vars needed

Required:
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

## Example requests

POST /ingest
```
curl -X POST http://localhost:8080/ingest \\
  -H 'Content-Type: application/json' \\
  -d '{\"documents\":[{\"id\":\"refund-policy\",\"title\":\"Refund Policy\",\"content\":\"Full refund within 30 days with receipt. No refunds on digital goods.\"}]}'
```

POST /ask
```
curl -X POST http://localhost:8080/ask \\
  -H 'Content-Type: application/json' \\
  -d '{\"question\":\"Can I get a refund on a digital product?\",\"topK\":3}'
```

## High-level deploy steps

1) Configure AWS credentials for Serverless (e.g. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`).
2) Ensure Pinecone + OpenAI env vars are set in your deploy environment.
3) Deploy:
```
npm run deploy
```
4) Use the returned API Gateway URL for frontend calls.

## Assumptions and trade-offs

- Chunking is character-based (500 chars with 50-char overlap) for simplicity and predictability.
- Re-ingest deletes previous chunks for the same docId before upserting; if delete fails, ingestion continues.
- Source list is deduped by docId + title; deeper citation granularity is not included.
- Minimal validation to keep the flow straightforward.

If I had more time, I would:
- Add stronger input validation and structured error codes.
- Add tracing and timing logs around embeddings and Pinecone calls.
