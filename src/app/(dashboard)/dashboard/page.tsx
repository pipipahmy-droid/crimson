"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import LeechForm from "@/components/leech-form";
import { Loader2, Zap, Database } from "lucide-react";

export default function Dashboard() {
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
    <div className="w-full max-w-6xl mx-auto py-10 px-6 md:px-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">    
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Active Mirroring</h1>   
        <p className="text-muted-foreground text-base">
          Start a new engine job by submitting a direct link.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-2xl border border-border/50 bg-card text-card-foreground shadow-lg transition-shadow p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">New Job</h2>    
              <p className="text-sm text-muted-foreground mt-1">Paste your target URL below to begin.</p>
            </div>
            <LeechForm />
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-sm flex flex-col gap-4 shadow-sm">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              High-Speed Engine
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              We leverage GitHub Runners networking throughput to bypass common bandwidth hurdles, pushing chunks swiftly.
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-muted/20 p-6 text-sm flex flex-col gap-4 shadow-sm">
            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-foreground tracking-tight">
              Server-Side Caching
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Once downloaded, chunks are stitched seamlessly on the worker side edge nodes, avoiding client browser crashes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
