export const allowedMimeTypes = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/html",
  "text/csv",
  "application/rtf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
]);

export const allowedExtensions = new Set([
  "pdf",
  "txt",
  "md",
  "html",
  "htm",
  "csv",
  "rtf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx"
]);

export const acceptTypes = [
  ...allowedMimeTypes,
  ".pdf",
  ".txt",
  ".md",
  ".html",
  ".htm",
  ".csv",
  ".rtf",
  ".doc",
  ".docx",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx"
].join(",");
