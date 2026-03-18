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
      
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
            let filesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        const timeVal = data.createdAt || data.created_at || Date.now();
        return {
          id: doc.id,
          ...data,
          createdAt: typeof timeVal?.toMillis === 'function' ? timeVal.toMillis() : (timeVal || Date.now()),
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
          md5_hash: data.md5_hash,
        };
      }) as FileItem[];
      
      filesData.sort((a, b) => b.createdAt - a.createdAt);
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
        return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 font-medium">Completed</Badge>;
      case "processing":
      case "downloading":
        return <Badge variant="secondary" className="animate-pulse bg-muted font-medium border-border/50">Processing</Badge>;
      case "queued":
        return <Badge variant="outline" className="text-muted-foreground border-border/50">Queued</Badge>;
      case "failed":
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20 font-medium">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="w-full">
      <Table>
        <TableHeader className="bg-muted/5 hover:bg-muted/5">
          <TableRow className="border-border/40">
            <TableHead className="w-[45%] font-semibold">File Info</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Progress</TableHead>
            <TableHead className="font-semibold hidden md:table-cell">Date</TableHead>
            <TableHead className="text-right font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map((file) => (
            <TableRow key={file.id} className="group border-border/40 hover:bg-muted/20 transition-colors">
              <TableCell className="font-medium align-top py-4">
                <div className="flex flex-col gap-1.5 pr-4">
                  <div className="flex items-center gap-2">
                    <FileIcon className="h-4 w-4 text-primary/70 shrink-0" />
                    <span className="truncate font-semibold text-foreground" title={file.filename || "Unknown"}>
                      {file.filename || "Mapping filename..."}
                    </span>
                  </div>
                  <span className="truncate text-xs text-muted-foreground ml-6" title={file.originalUrl}>
                    {file.originalUrl}
                  </span>
                  {file.md5_hash && (
                    <span className="text-[10px] text-muted-foreground/80 font-mono ml-6" title={`MD5: ${file.md5_hash}`}>
                      <span className="font-semibold mr-1">MD5:</span>{file.md5_hash.substring(0, 8)}...
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="align-top py-4">
                <div className="pt-0.5">{getStatusBadge(file.status)}</div>
              </TableCell>
              <TableCell className="align-top py-4">
                {["processing", "downloading", "pending", "running"].includes(file.status) ? (
                  <div className="w-full max-w-[120px] space-y-2 mt-2">
                    <Progress value={file.progress} className="h-1.5" />
                    <span className="text-[11px] font-medium text-muted-foreground">{file.progress}%</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground/50">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm align-top py-4 hidden md:table-cell">
                <div className="pt-0.5 whitespace-nowrap">
                  {file.createdAt ? formatDistanceToNow(file.createdAt, { addSuffix: true }) : "-"}
                </div>
              </TableCell>
              <TableCell className="text-right align-top py-4">
                <div className="flex justify-end pt-0.5 gap-2">
                  {file.status === "completed"   && (
                    <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-colors" asChild>
                      <a href={file.downloadUrl || `https://crimson.pipipahmy.workers.dev/download/${file.id}`} target="_blank" rel="noopener noreferrer" title="Download">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {file.status === "failed" && (
                    <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" title="Retry" disabled>
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
