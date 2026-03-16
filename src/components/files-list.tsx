"use client";

import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FileItem } from "@/types/file";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink, Loader2, Trash2, FileIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function FilesList() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "files"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const filesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
          md5_hash: data.md5_hash, // Ensure this property is read from Firestore
        };
      }) as FileItem[];
      setFiles(filesData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching files:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-muted/10 border-dashed">
        <FileIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">No files yet</h3>
        <p className="text-muted-foreground mt-1">Start by pasting a URL above to mirror your first file.</p>
      </div>
    );
  }

  const getStatusBadge = (status: FileItem["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Completed</Badge>;
      case "processing":
      case "downloading":
        return <Badge variant="secondary" className="animate-pulse">Processing</Badge>;
      case "queued":
        return <Badge variant="outline">Queued</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Filename / URL</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col gap-1 max-w-[300px] overflow-hidden">
                  <span className="truncate font-semibold" title={file.filename || "Unknown"}>
                    {file.filename || "Mapping filename..."}
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={file.originalUrl}>
                    {file.originalUrl}
                  </span>
                  {file.md5_hash && (
                    <span className="text-[10px] text-muted-foreground font-mono truncate" title={`MD5: ${file.md5_hash}`}>
                      MD5: {file.md5_hash.substring(0, 8)}...
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(file.status)}</TableCell>
              <TableCell>
                {file.status === "processing" || file.status === "downloading" ? (
                  <div className="w-[120px] space-y-1">
                    <Progress value={file.progress} className="h-2" />
                    <span className="text-xs text-muted-foreground">{file.progress}%</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {file.createdAt ? formatDistanceToNow(file.createdAt, { addSuffix: true }) : "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {file.status === "completed" && file.downloadUrl && (
                    <Button size="icon" variant="ghost" asChild>
                      <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" title="Download">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {file.status === "failed" && (
                    <Button size="icon" variant="ghost" title="Retry" disabled>
                      <Loader2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
