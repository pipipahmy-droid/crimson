"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import LeechForm from "@/components/leech-form";
import { FilesList } from "@/components/files-list";
import { Loader2 } from "lucide-react";

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
    <div className="container mx-auto py-10 px-4 md:px-6 space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your file mirrors and downloads.
        </p>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">New Mirror Task</h2>
            <LeechForm />
          </div>
          
          <div className="rounded-xl border bg-muted/30 p-6 text-sm text-muted-foreground">
            <h3 className="font-semibold mb-2">How it works</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Detailed progress updates</li>
              <li>Files processed in chunks</li>
              <li>Auto-cleanup after transfer</li>
            </ul>
          </div>
        </div>

        {/* Right Column: Files List */}
        <div className="lg:col-span-2">
           <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Active Downloads</h2>
            </div>
            <div className="p-0">
              <FilesList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
