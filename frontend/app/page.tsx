"use client";

import { FormEvent, useMemo, useState } from "react";

type AskSource = {
  id?: string;
  title?: string;
};

type AskResponse = {
  answer?: string;
  result?: string;
  sources?: AskSource[];
  docs?: AskSource[];
  [key: string]: unknown;
};

function resolveApiBase() {
  const base = process.env.DPROG_API ?? "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<AskSource[]>([]);
  const [raw, setRaw] = useState<AskResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const apiBase = useMemo(() => resolveApiBase(), []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setError(null);
    setAnswer(null);
    setSources([]);
    setRaw(null);

    try {
      const response = await fetch(`${apiBase}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question })
      });

      const data = (await response.json()) as AskResponse;
      if (!response.ok) {
        throw new Error(data?.error ? String(data.error) : "Request failed.");
      }

      const resolvedAnswer = data.answer ?? data.result ?? "";
      const resolvedSources = data.sources ?? data.docs ?? [];

      setAnswer(resolvedAnswer);
      setSources(resolvedSources);
      setRaw(data);
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
          <p className="eyebrow">Ask a question</p>
          <h1>Query your doc set in plain language.</h1>
          <p className="lead">
            Send a single question to the backend and get an answer plus the documents that
            informed it.
          </p>
        </div>
        <div className="hero-card">
          <h2>Ask the corpus</h2>
          <form className="stack" onSubmit={handleSubmit}>
            <label className="field">
              <span>Question</span>
              <input
                type="text"
                placeholder="Which documents mention onboarding?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                required
              />
            </label>
            <button className="primary" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Asking..." : "Send question"}
            </button>
          </form>
        </div>
      </section>

      <section className="results">
        <div className="result-card">
          <div className="result-header">
            <h3>Answer</h3>
            <span className={`status ${status}`}>{status}</span>
          </div>
          {status === "error" && <p className="error">{error}</p>}
          {status === "success" && answer && <p className="answer">{answer}</p>}
          {status === "success" && !answer && (
            <p className="muted">No answer field returned. Raw payload shown below.</p>
          )}
        </div>

        <div className="result-card">
          <h3>Sources</h3>
          {sources.length === 0 ? (
            <p className="muted">No sources yet. Submit a question to see matches.</p>
          ) : (
            <ul className="source-list">
              {sources.map((source, index) => (
                <li key={`${source.id ?? source.title ?? "source"}-${index}`}>
                  <div>
                    <p className="source-title">{source.title ?? "Untitled"}</p>
                    <p className="source-id">{source.id ?? "missing id"}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {raw && (
          <div className="result-card">
            <h3>Raw response</h3>
            <pre className="code-block">{JSON.stringify(raw, null, 2)}</pre>
          </div>
        )}
      </section>
    </div>
  );
}
