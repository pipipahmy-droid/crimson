"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoveRight, DownloadCloud, Zap, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { user } = useAuth();
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["Limitless", "Free", "Fast"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-12 md:py-16 lg:py-24 overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-background bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary opacity-20 blur-[100px]"></div>
        </div>

        <div className="container px-4 md:px-6 mx-auto relative z-10 flex flex-col items-center text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center rounded-full border border-border/50 bg-muted/30 backdrop-blur-sm px-3 py-1 text-sm font-medium transition-colors hover:bg-muted/50 mb-8 shadow-sm"
          >
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Crimson v1.0 is now live
          </motion.div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight max-w-5xl mb-6">
            File Mirroring, <br className="hidden md:inline" />
            <span className="relative inline-block min-w-[200px] md:min-w-[350px] text-center pb-2 h-[1em] text-primary">
              <AnimatePresence mode="popLayout">
                <motion.span
                  key={titleNumber}
                  className="absolute left-0 top-0 w-full"
                  initial={{ opacity: 0, y: 40, filter: "blur(4px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -40, opacity: 0, filter: "blur(4px)" }}
                  transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
                >
                  {titles[titleNumber]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed"
          >
            Bypass bandwidth limits and restrictions natively. Crimson leverages ephemeral runners to mirror any links to a reliable cloud storage instantly. 
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center"
          >
            {user ? (
               <Button size="lg" className="h-14 px-8 text-base gap-2 rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300" asChild>
                <Link href="/dashboard">
                  Enter Dashboard <ArrowRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" className="h-14 px-8 text-base gap-2 rounded-full shadow-lg hover:shadow-primary/25 transition-all duration-300" asChild>
                <Link href="/signup">
                  Start Mirroring <ArrowRight className="w-5 h-5 ml-1" />
                </Link>
              </Button>
            )}
            <Button size="lg" variant="outline" className="h-14 px-8 text-base gap-2 rounded-full bg-background/50 backdrop-blur-sm border-border/50 hover:bg-muted/50 transition-all duration-300">
              View on GitHub <DownloadCloud className="w-5 h-5 ml-1" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-background relative border-t border-border/40">
        <div className="absolute inset-0 bg-muted/10"></div>
        <div className="container px-4 md:px-6 mx-auto relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Built for absolute velocity.</h2>
            <p className="text-muted-foreground md:text-lg">
              We eliminated the typical bottlenecks of free file-hosting platforms to give you an uninterrupted downloading experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group relative flex flex-col items-start p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Blazing Fast</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">Tap into massive bandwidth infrastructures for high-speed mirroring. Your queue is processed almost instantly without premium gates.</p>
            </div>
            <div className="group relative flex flex-col items-start p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Secure & Private</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">Operations run in ephemeral environments. Everything is automated and logs are naturally detached to maintain your privacy.</p>
            </div>
            <div className="group relative flex flex-col items-start p-8 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300 overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-primary/5 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary mb-6 ring-1 ring-primary/20">
                <DownloadCloud className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">No Boundaries</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">By utilizing advanced stream stitching technologies, we circumvent conventional file-size limits enforced by public free hosting providers.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
