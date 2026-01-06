"use client";

import { useMemo, useState } from "react";
import { acceptTypes, allowedExtensions, allowedMimeTypes } from "./constants";
import type { PresignResponse, UploadItem, UploadStatus } from "./types";

function resolveApiBase() {
  const base = process.env.NEXT_PUBLIC_DPROG_API ?? "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-");
}

function fileExtension(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : "";
}

function isAllowedFile(file: File) {
  if (file.type && allowedMimeTypes.has(file.type)) {
    return true;
  }
  const ext = fileExtension(file.name);
  return ext ? allowedExtensions.has(ext) : false;
}

export default function DocsPage() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const apiBase = useMemo(() => resolveApiBase(), []);

  function updateItem(clientId: string, patch: Partial<UploadItem>) {
    setItems((prev) =>
      prev.map((item) => (item.clientId === clientId ? { ...item, ...patch } : item))
    );
  }

  async function uploadItem(item: UploadItem) {
    setStatus("working");
    updateItem(item.clientId, { status: "presigning", error: undefined });

    const contentType = item.file.type || "application/octet-stream";

    try {
      const presignResponse = await fetch(`${apiBase}/ingest/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: item.key, contentType, docId: item.docId, title: item.title })
      });

      const presignData = (await presignResponse.json()) as PresignResponse & {
        error?: string;
      };

      if (!presignResponse.ok) {
        throw new Error(presignData.error || "Failed to get presigned URL.");
      }

      updateItem(item.clientId, { status: "uploading" });

      const putResponse = await fetch(presignData.url, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          ...(presignData.requiredHeaders ?? {})
        },
        body: item.file
      });

      if (!putResponse.ok) {
        throw new Error("Upload failed.");
      }

      updateItem(item.clientId, {
        status: "uploaded",
        response: { uploaded: true, key: presignData.key }
      });
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      updateItem(item.clientId, { status: "error", error: message });
      setError(message);
      setStatus("error");
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const incoming = Array.from(fileList);
    const rejected = incoming.filter((file) => !isAllowedFile(file));

    if (rejected.length > 0) {
      setError(
        `Unsupported files: ${rejected.map((file) => file.name).join(", ")}. ` +
          "Only Tika-supported document types are allowed."
      );
      setStatus("error");
    } else {
      setError(null);
      setStatus("idle");
    }

    const accepted = incoming.filter((file) => isAllowedFile(file));
    if (accepted.length === 0) return;

    const newItems = accepted.map((file) => {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      const normalized = normalizeName(file.name);
      const key = `raw/${Date.now()}-${normalized}`;
      const docId = normalizeName(baseName) || normalized || `doc-${Date.now()}`;
      const title = baseName || file.name;

      return {
        clientId: makeId(),
        file,
        key,
        docId,
        title,
        status: "idle" as UploadStatus
      };
    });

    setItems((prev) => [...newItems, ...prev]);
    newItems.forEach((item) => {
      void uploadItem(item);
    });
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  return (
    <div className="page">
      <section className="hero">
        <div>
          <p className="eyebrow">Ingest documents</p>
          <h1>Drop files to upload and queue ingestion.</h1>
          <p className="lead">
            Upload a document, then we will request a presigned URL and upload it to S3. The backend
            automatically extracts text with Tika and queues the ingest workflow.
          </p>
          <div className="format-list">
            <span>Supported uploads:</span>
            <span>PDF, TXT, MD, HTML, CSV, RTF, DOC/DOCX, PPT/PPTX, XLS/XLSX</span>
            <span>
              Files are stored as <code>raw/&lt;timestamp&gt;-&lt;filename&gt;</code>; docId and title
              are derived from the filename.
            </span>
          </div>
        </div>
        <div className="hero-card">
          <h2>Document intake</h2>
          <div
            className={`dropzone ${dragging ? "dragging" : ""}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              id="file-input"
              type="file"
              accept={acceptTypes}
              multiple
              onChange={(event) => handleFiles(event.target.files)}
              hidden
            />
            <div className="dropzone-inner">
              <p>Drag files here, or click to browse.</p>
              <label htmlFor="file-input" className="primary">
                Choose files
              </label>
              <p className="muted">Only Tika-supported document types are accepted.</p>
            </div>
          </div>

          {items.length > 0 && (
            <div className="file-list">
              {items.map((item) => (
                <div className="file-row" key={item.clientId}>
                  <div>
                    <p className="file-name">{item.file.name}</p>
                    <p className="file-meta">
                      docId: {item.docId} · title: {item.title}
                    </p>
                  </div>
                  <div className={`status-pill ${item.status}`}>{item.status}</div>
                  {item.error && <p className="error">{item.error}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="results">
        <div className="result-card">
          <div className="result-header">
            <h3>Upload status</h3>
            <span className={`status ${status}`}>{status}</span>
          </div>
          {status === "error" && error && <p className="error">{error}</p>}
          {status === "idle" && items.length === 0 && (
            <p className="muted">Drop a document to begin uploading.</p>
          )}
        </div>
      </section>
    </div>
  );
}
