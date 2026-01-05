#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
JAR_DIR="${ROOT_DIR}/scripts"
JAR_PATH="${JAR_DIR}/elasticmq-server.jar"
PORT="${SQS_PORT:-9324}"
VERSION="${ELASTICMQ_VERSION:-1.6.7}"

mkdir -p "${JAR_DIR}"

DOWNLOAD_URL="https://github.com/softwaremill/elasticmq/releases/download/v${VERSION}/elasticmq-server-all-${VERSION}.jar"

if [ ! -f "${JAR_PATH}" ]; then
  echo "Downloading ElasticMQ ${VERSION}..."
  curl -L -o "${JAR_PATH}" "${DOWNLOAD_URL}"
fi

JAR_SIZE=$(stat -f%z "${JAR_PATH}" 2>/dev/null || echo 0)

if [ "${JAR_SIZE}" -lt 1000000 ]; then
  echo "ElasticMQ jar looks too small (${JAR_SIZE} bytes). Re-downloading..."
  rm -f "${JAR_PATH}"
  curl -L -o "${JAR_PATH}" "${DOWNLOAD_URL}"
fi

if ! jar tf "${JAR_PATH}" >/dev/null 2>&1; then
  echo "ElasticMQ jar is invalid at ${JAR_PATH}."
  exit 1
fi

echo "Starting ElasticMQ on port ${PORT}..."
java -jar "${JAR_PATH}" -Dconfig.file="${ROOT_DIR}/scripts/elasticmq.conf"
