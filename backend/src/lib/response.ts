import type { APIGatewayProxyResult } from "aws-lambda";

type ErrorBody = { error: string };

type Json = Record<string, unknown> | ErrorBody;

const defaultHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type"
};

export function jsonResponse(statusCode: number, body: Json): APIGatewayProxyResult {
  return {
    statusCode,
    headers: defaultHeaders,
    body: JSON.stringify(body)
  };
}
