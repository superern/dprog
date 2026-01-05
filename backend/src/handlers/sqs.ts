import type { SQSEvent } from "aws-lambda";

export async function handler(event: SQSEvent) {
  const recordCount = event.Records?.length ?? 0;
  console.log(`Received ${recordCount} SQS message(s).`);
  return { received: recordCount };
}
