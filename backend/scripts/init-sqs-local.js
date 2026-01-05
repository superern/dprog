/* eslint-disable no-console */
"use strict";

const {SQSClient, CreateQueueCommand} = require("@aws-sdk/client-sqs");

const endpoint = process.env.SQS_ENDPOINT || "http://localhost:9324";
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "root";
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "root";
const accountId = process.env.AWS_ACCOUNT_ID || "000000000000";

const sqs = new SQSClient({
  endpoint,
  region,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function ensureQueue(queueName, attributes) {
  try {
    const {QueueUrl} = await sqs.send(
      new CreateQueueCommand({
        QueueName: queueName,
        Attributes: attributes || {}
      })
    );
    return QueueUrl;
  } catch (err) {
    const code = err.name || err.Code || err.code;
    if (code === "QueueAlreadyExists") {
      return undefined;
    }
    throw err;
  }
}

async function ensureQueues() {
  await ensureQueue("ingest-dlq");

  const dlqArn = `arn:aws:sqs:${region}:${accountId}:ingest-dlq`;

  const redrive = {
    deadLetterTargetArn: dlqArn,
    maxReceiveCount: 3
  };

  try {
    await ensureQueue("ingest-q", {RedrivePolicy: JSON.stringify(redrive)});
  } catch (err) {
    console.warn(
      "RedrivePolicy not supported by local SQS, creating ingest-q without DLQ."
    );
    await ensureQueue("ingest-q");
  }
}

async function main() {
  const attempts = 5;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await ensureQueues();
      console.log("Local SQS queues ready: ingest-q, ingest-dlq");
      return;
    } catch (err) {
      if (i === attempts - 1) throw err;
      await wait(500);
    }
  }
}

main().catch(err => {
  console.error("Failed to init local SQS queues:", err.message || err);
  process.exit(1);
});
