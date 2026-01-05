"use client";

import { FormEvent, useMemo, useState } from "react";

type DocInput = {
  id: string;
  title: string;
  content: string;
};

type IngestResponse = {
  status?: string;
  message?: string;
  [key: string]: unknown;
};

const emptyDoc = (): DocInput => ({ id: "", title: "", content: "" });

function resolveApiBase() {
  const base = process.env.DRPOG_API ?? "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export default function DocsPage() {
  const [docs, setDocs] = useState<DocInput[]>([emptyDoc()]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<IngestResponse | null>(null);

  const apiBase = useMemo(() => resolveApiBase(), []);

  function updateDoc(index: number, field: keyof DocInput, value: string) {
    setDocs((prev) =>
      prev.map((doc, docIndex) => (docIndex === index ? { ...doc, [field]: value } : doc))
    );
  }

  function addDoc() {
    setDocs((prev) => [...prev, emptyDoc()]);
  }

  function removeDoc(index: number) {
    setDocs((prev) => prev.filter((_, docIndex) => docIndex !== index));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setResponse(null);

    try {
      const response = await fetch(`${apiBase}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: docs })
      });

      const data = (await response.json()) as IngestResponse;
      if (!response.ok) {
        throw new Error(data?.error ? String(data.error) : "Request failed.");
      }

      setResponse(data);
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
      setStatus("error");
    }
  }

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Ingest documents</p>
          <h1>Add the documents you want the backend to index.</h1>
          <p className="lead">
            Provide an id, title, and plain text content. You can add multiple entries before
            submitting.
          </p>
        </div>
        <div className="hero-card">
          <h2>Document intake</h2>
          <form className="stack" onSubmit={handleSubmit}>
            {docs.map((doc, index) => (
              <div className="doc-card" key={`doc-${index}`}>
                <div className="doc-header">
                  <h3>Document {index + 1}</h3>
                  {docs.length > 1 && (
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => removeDoc(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <label className="field">
                  <span>Id</span>
                  <input
                    type="text"
                    placeholder="doc-001"
                    value={doc.id}
                    onChange={(event) => updateDoc(index, "id", event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Title</span>
                  <input
                    type="text"
                    placeholder="Onboarding notes"
                    value={doc.title}
                    onChange={(event) => updateDoc(index, "title", event.target.value)}
                    required
                  />
                </label>
                <label className="field">
                  <span>Content</span>
                  <textarea
                    placeholder="Paste plain text content here..."
                    rows={6}
                    value={doc.content}
                    onChange={(event) => updateDoc(index, "content", event.target.value)}
                    required
                  />
                </label>
              </div>
            ))}

            <div className="doc-actions">
              <button type="button" className="ghost" onClick={addDoc}>
                Add another document
              </button>
              <button className="primary" type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Uploading..." : "Send to /ingest"}
              </button>
            </div>
          </form>
        </div>
      </section>

      <section className="results">
        <div className="result-card">
          <div className="result-header">
            <h3>Ingest status</h3>
            <span className={`status ${status}`}>{status}</span>
          </div>
          {status === "error" && <p className="error">{error}</p>}
          {status === "success" && response && (
            <pre className="code-block">{JSON.stringify(response, null, 2)}</pre>
          )}
          {status === "idle" && (
            <p className="muted">Submit documents to see the backend response.</p>
          )}
        </div>
      </section>
    </div>
  );
}
