export type UploadStatus =
  | "idle"
  | "presigning"
  | "uploading"
  | "uploaded"
  | "error";

export type UploadItem = {
  clientId: string;
  file: File;
  docId: string;
  title: string;
  key: string;
  status: UploadStatus;
  error?: string;
  response?: Record<string, unknown>;
};

export type PresignResponse = {
  url: string;
  bucket: string;
  key: string;
  expiresInSeconds: number;
  requiredHeaders?: Record<string, string>;
};
