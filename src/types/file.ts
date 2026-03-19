export type FileStatus = "queued" | "downloading" | "processing" | "completed" | "failed";

export interface FileItem {
  id: string;
  userId: string;
  originalUrl: string;
  filename?: string;
  fileSize?: number;
  status: FileStatus;
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  md5_hash?: string;
  sha256_hash?: string;
}
