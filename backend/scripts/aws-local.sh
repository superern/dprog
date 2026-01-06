#!/bin/sh
set -eu

AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-test} \
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-test} \
AWS_REGION=${AWS_REGION:-us-east-1} \
AWS_PAGER="" \
LOCALSTACK_ENDPOINT=${LOCALSTACK_ENDPOINT:-http://localhost:4566} \
  sh -c '
    cmd="$1"
    shift
    if [ "$cmd" = "serverless" ] || [ "$cmd" = "sls" ]; then
      exec "$cmd" "$@"
    fi
    if [ "$cmd" = "aws" ]; then
      exec aws --endpoint-url "$LOCALSTACK_ENDPOINT" "$@"
    fi
    exec aws --endpoint-url "$LOCALSTACK_ENDPOINT" "$cmd" "$@"
  ' sh "$@"
