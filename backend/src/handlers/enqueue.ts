import {SQSClient, SendMessageCommand} from "@aws-sdk/client-sqs";
import type {APIGatewayProxyEventV2} from "aws-lambda";

type EnqueueBody = {
  message?: string;
};

const sqs = new SQSClient({
  region: process.env.AWS_REGION || "us-east-1",
  endpoint: process.env.SQS_ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "root",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "root"
  }
});

export async function handler(event: APIGatewayProxyEventV2) {
  const body: EnqueueBody =
    event.body && event.body.length > 0 ? JSON.parse(event.body) : {};

  const message =
    body.message ||
    `test-message ${new Date().toISOString()} ${Math.random().toString(36).slice(2)}`;

  const QueueUrl = process.env.SQS_QUEUE_URL;
  if (!QueueUrl) {
    return {
      statusCode: 500,
      body: JSON.stringify({error: "SQS_QUEUE_URL is not set"})
    };
  }

  await sqs.send(
    new SendMessageCommand({
      QueueUrl,
      MessageBody: message
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ok: true, queueUrl: QueueUrl, message})
  };
}
