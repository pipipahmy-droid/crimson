export type FileStatus = "queued" | "downloading" | "processing" | "completed" | "failed";

export interface FileItem {
  id: string;
  userId: string;
  originalUrl: string;
  filename?: string;
  fileSize?: number;
  total_size?: number; // Added to support new backend logic
  status: FileStatus;
  progress: number;
  downloadUrl?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}
