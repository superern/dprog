const DEFAULT_TIKA_URL = "http://localhost:9998";

type FetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
};

async function ensureOk(response: FetchResponse) {
  if (response.ok) return;
  const details = await response.text().catch(() => "");
  const message = `Tika request failed (${response.status}): ${details || response.statusText}`;
  throw new Error(message);
}

export async function extractTextWithTika(buffer: Buffer, contentType: string) {
  const baseUrl = process.env.TIKA_URL || DEFAULT_TIKA_URL;
  const url = `${baseUrl.replace(/\/$/, "")}/tika`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      Accept: "text/plain"
    },
    body: buffer
  });

  await ensureOk(response);
  return response.text();
}
