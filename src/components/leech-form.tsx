// src/components/leech-form.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DownloadCloud, Loader2, PlayCircle, LogIn, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function LeechForm() {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  
  const [url, setUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [downloadedMB, setDownloadedMB] = useState(0);
  const [status, setStatus] = useState<"idle" | "pending" | "running" | "completed" | "error">("idle");
  const [downloadLink, setDownloadLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    setProgress(5);
    setDocId(null);
    setStatus("pending");
    setDownloadLink(null);
    setErrorMsg("");

    try {
      const response = await fetch("/api/leech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Failed to start leech job.");
      
      setDocId(data.doc_id);
      setProgress(10); // Job created

    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  // Real-time listener for job status
  useEffect(() => {
    if (!docId) return;

    // Listen to the document in 'files' collection
    const unsub = onSnapshot(doc(db, "files", docId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.status === 'completed') {
           setStatus("completed");
           setProgress(100);
           setDownloadLink(`https://crimson.pipipahmy.workers.dev/download/${docId}`);
           setIsSubmitting(false);
        } else if (data.status === 'failed') {
           setStatus("error");
           setErrorMsg("Mirror failed. Check if link is direct.");
           setIsSubmitting(false);
        } else {
           // Still processing
           setStatus("running");
        }
      }
    });

    return () => unsub();
  }, [docId]);

  let lastProgress = progress;
  // Simulated progress for visual feedback
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running' || status === 'pending') {
      interval = setInterval(() => {
        setProgress((prev) => {
           if (prev >= 90) return 90; // Cap at 90% until done
           return prev + Math.random() * 2;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [status]);


  if (authLoading) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto border-2 border-red-50 shadow-xl bg-gradient-to-br from-white to-red-50/50">
        <CardHeader className="text-center pb-6 pt-8">
          <div className="mx-auto bg-red-100 p-4 rounded-full w-fit mb-4 mix-blend-multiply">
            <DownloadCloud className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Start Leeching</CardTitle>
          <CardDescription className="text-gray-600">
            Sign in to mirror unlimited files via GitHub & Cloudflare.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-8">
          <Button 
            onClick={signInWithGoogle} 
            className="w-full bg-primary hover:bg-black text-white gap-3 h-12 text-md transition-all shadow-lg hover:shadow-xl font-medium"
          >
            <LogIn className="w-4 h-4" />
            Continue with Google
          </Button>
        </CardContent>
            <CardFooter className="justify-center border-t py-4 bg-gray-50/50 text-xs text-gray-400">
              By continuing, you agree to our Terms of Service.
            </CardFooter>
      </Card>
    );
  }

  // --- LEECH FORM ---
  return (
    <div className="w-full relative bg-transparent">
      {/* Loading Bar Overlay */}
      {status === 'running' && (
        <div className="absolute -top-6 -left-6 -right-6 h-1 bg-muted overflow-hidden z-10 rounded-t-2xl">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }}/>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <DownloadCloud className="w-4 h-4 text-muted-foreground" />
          </div>
          <Input 
              placeholder="https://example.com/large-file.zip" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting || status === 'running'}
              className="h-12 pl-10 border-border/50 bg-muted/20 focus-visible:ring-primary/30 text-base shadow-sm"
              required
          />
        </div>
        <Button 
          type="submit" 
          className="h-12 w-full shadow-md gap-2"
          disabled={isSubmitting || !url || status === 'running'}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5" />
              Start Engine
            </>
          )}
        </Button>
      </form>

      {/* Status & Progress Tracking */}
      {(status !== 'idle') && (
        <div className="space-y-4 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex justify-between text-sm font-medium">
             <span className="flex items-center gap-2 text-foreground">
               {status === 'pending' && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground"/>}
               {status === 'pending' && "Initializing job..."}
               
               {status === 'running' && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary"/>}
               {status === 'running' && "Mirroring in progress..."}
               
               {status === 'completed' && <span className="text-primary font-semibold">Ready for download!</span>}
               {status === 'error' && <span className="text-destructive font-semibold">Failed</span>}
             </span>
             <span className="text-muted-foreground font-mono text-xs">
               {status === 'running' && (
                 <span className="mr-2 opacity-75 hidden sm:inline-block">
                   {downloadedMB.toFixed(1)} MB &bull; {speed} MB/s &bull;
                 </span>
               )}
               {Math.round(progress)}%
             </span>
          </div>
          
          <Progress value={progress} className="h-2 bg-muted" />
          
          {(status === 'running' || status === 'pending') && (
             <p className="text-xs text-muted-foreground text-center animate-pulse pt-1">
               This might take a few minutes depending on file size...
             </p>
          )}

          {status === 'error' && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 flex items-center gap-2 mt-2">
               <span>Error: {errorMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* RESULT SECTION */}
      {status === 'completed' && downloadLink && (
          <div className="mt-6 pt-6 border-t border-border/50">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <DownloadCloud className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold tracking-tight">Download Ready</span>
                          <span className="text-xs text-muted-foreground truncate font-mono mt-0.5">{downloadLink}</span>
                      </div>
                  </div>
                  <Button asChild variant="default" className="w-full text-sm shadow-sm gap-2">
                      <a href={downloadLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                          Open Link
                      </a>
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
}
