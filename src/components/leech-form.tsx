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
    <Card className="w-full max-w-xl mx-auto border shadow-lg overflow-hidden relative bg-white">
      {/* Loading Bar Overlay */}
      {status === 'running' && (
        <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 overflow-hidden z-10">
          <div className="h-full bg-primary animate-progress-indeterminate origin-left" style={{ width: `${progress}%` }}/>
        </div>
      )}
      
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                    Leech Engine
                    <span className="text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full border">v1.0</span>
                </CardTitle>
                <CardDescription>
                Paste a direct download link. We'll split & mirror it.
                </CardDescription>
            </div>
            {/* User Avatar Tiny */}
            <div className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300" title={user.email || ""}>
                {user.photoURL ? (
                    <img src={user.photoURL} alt="User" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                        {user.displayName?.charAt(0) || "U"}
                    </div>
                )}
            </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <DownloadCloud className="w-4 h-4 text-gray-400" />
            </div>
            <Input 
                placeholder="https://example.com/large-file.zip" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isSubmitting || status === 'running'}
                className="h-12 pl-10 border-gray-200 focus-visible:ring-primary/30 text-base"
                required
            />
          </div>
          <Button 
            type="submit" 
            size="icon" 
            className="h-12 w-12 shrink-0 bg-primary hover:bg-black transition-colors rounded-md shadow-md"
            disabled={isSubmitting || !url || status === 'running'}
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <PlayCircle className="w-5 h-5 fill-current" />
            )}
          </Button>
        </form>

        {/* Status & Progress Tracking */}
        {(status !== 'idle') && (
          <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between text-sm font-medium text-gray-700">
               <span className="flex items-center gap-2">
                 {status === 'pending' && <Loader2 className="w-3 h-3 animate-spin"/>}
                 {status === 'pending' && "Initializing job..."}
                 
                 {status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-primary"/>}
                 {status === 'running' && "Mirroring & Splitting..."}
                 
                 {status === 'completed' && <span className="text-green-600">Ready for download!</span>}
                 {status === 'error' && <span className="text-red-600">Failed.</span>}
               </span>
               <span className="text-muted-foreground font-mono text-xs">{Math.round(progress)}%</span>
            </div>
            
            <Progress value={progress} className="h-2 bg-gray-100" />
            
            {(status === 'running' || status === 'pending') && (
               <p className="text-xs text-muted-foreground text-center animate-pulse">
                 This might take a few minutes depending on file size...
               </p>
            )}

            {status === 'error' && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 flex items-center gap-2">
                 <span>Error: {errorMsg}</span>
              </div>
            )}
          </div>
        )}

        {/* RESULT SECTION */}
        {status === 'completed' && downloadLink && (
            <div className="mt-4 pt-4 border-t border-dashed">
                <div className="bg-green-50/50 border border-green-200 rounded-lg p-3 flex items-center gap-2 justify-between group">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                            <DownloadCloud className="w-4 h-4 text-green-700" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">Download Ready</span>
                            <span className="text-xs text-green-700 truncate font-mono opacity-80">{downloadLink}</span>
                        </div>
                    </div>
                    <Button 
                    size="sm"
                    className="h-8 bg-green-600 hover:bg-green-700 text-white shrink-0 shadow-sm"
                    onClick={() => window.open(downloadLink, '_blank')}
                    >
                    Open <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
