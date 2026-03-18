"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { FilesList } from "@/components/files-list";
import { Loader2 } from "lucide-react";

export default function HistoryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">   
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />      
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-10 px-6 md:px-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Mirror History</h1>   
        <p className="text-muted-foreground text-base">
          Review and access your recently mirrored files.
        </p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col min-h-[60vh]">
        <div className="p-6 border-b border-border/40 bg-muted/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Your Files</h2>
            <p className="text-sm text-muted-foreground mt-1">Files mirrored to the ephemeral cloud.</p>
          </div>
        </div>
        <div className="p-0 flex-1 bg-card">
          <FilesList />
        </div>
      </div>
    </div>
  );
}