#!/bin/bash
set -euo pipefail

S3_ENDPOINT="${S3_ENDPOINT:-http://localhost:4569}"
BUCKET_NAME="${BUCKET_NAME:-dprog}"

echo "Seeding local S3 at ${S3_ENDPOINT} for bucket ${BUCKET_NAME}..."

curl -s -X PUT "${S3_ENDPOINT}/${BUCKET_NAME}"
curl -s -X PUT "${S3_ENDPOINT}/${BUCKET_NAME}/raw/.keep" -d ""
curl -s -X PUT "${S3_ENDPOINT}/${BUCKET_NAME}/failed/.keep" -d ""
curl -s -X PUT "${S3_ENDPOINT}/${BUCKET_NAME}/archive/.keep" -d ""

echo "Seed complete."
