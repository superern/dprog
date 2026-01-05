import type { APIGatewayProxyResultV2 } from "aws-lambda";

type ErrorBody = { error: string };

type Json = Record<string, unknown> | ErrorBody;

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type"
};

export function jsonResponse(statusCode: number, body: Json): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body)
  };
}
