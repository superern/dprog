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

3) Start local SQS (ElasticMQ)
```
npm run sqs:start
```
This downloads the ElasticMQ server JAR into `backend/scripts/elasticmq-server.jar` if it's missing.

To verify local SQS is working (pick one):

Option A: call the test endpoint (sends a message to `ingest-q`)
```
curl -X POST http://localhost:8080/enqueue \
  -H 'Content-Type: application/json' \
  -d '{"message":"hello from api"}'
```

Option B: check the queue exists with AWS CLI
```
AWS_REGION=us-east-1 AWS_ACCESS_KEY_ID=root AWS_SECRET_ACCESS_KEY=root \
aws --endpoint-url http://localhost:9324 sqs get-queue-url --queue-name ingest-q
```

4) (Optional) Initialize local S3 bucket and prefixes for `dprog` (the offline S3 service will create the local directory on first run):
```
npm run s3:init
```

5) Run offline
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
- SQS_ENDPOINT (default: http://localhost:9324)
- SQS_QUEUE_URL (default: http://localhost:9324/000000000000/ingest-q)
- AWS_ACCESS_KEY_ID (default: root for local SQS)
- AWS_SECRET_ACCESS_KEY (default: root for local SQS)

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
