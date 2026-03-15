"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
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
      <section className="relative w-full py-20 md:py-32 lg:py-40 overflow-hidden">
        <div className="container px-4 md:px-6 mx-auto relative z-10 flex flex-col items-center text-center">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 mb-8"
          >
            v1.0 is now live
          </motion.div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter max-w-4xl mb-6">
            Why choose us<br className="hidden md:inline" />
            <span className="text-primary relative inline-block min-w-[200px] md:min-w-[300px] text-center">
              {titles.map((title, index) => (
                <motion.span
                  key={index}
                  className="absolute left-0 top-0 w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    titleNumber === index
                      ? { y: 0, opacity: 1 }
                      : { y: titleNumber > index ? -20 : 20, opacity: 0 }
                  }
                  transition={{ type: "spring", stiffness: 100 }}
                >
                  {title}
                </motion.span>
              ))}
              <span className="invisible">placeholder</span>
            </span>
          </h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed"
          >
            Crimson leverages GitHub Actions to mirror large files instantly. 
            No more bandwidth restrictions. Just pure speed.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 w-full justify-center"
          >
            {user ? (
               <Button size="lg" className="h-12 px-8 text-base gap-2" asChild>
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" className="h-12 px-8 text-base gap-2">
                Get Started <MoveRight className="w-4 h-4" />
              </Button>
            )}
            <Button size="lg" variant="outline" className="h-12 px-8 text-base gap-2">
              View on GitHub <DownloadCloud className="w-4 h-4" />
            </Button>
          </motion.div>
        </div>

        {/* Background Gradient */}
        <div className="absolute inset-0 -z-10 h-full w-full bg-background [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,var(--primary)_100%)] opacity-5"></div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Why use Crimson?</h2>
            <p className="mt-4 text-muted-foreground md:text-xl">
              Built for power users who need reliable, high-speed file transfers without the hassle.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center p-6 border rounded-xl bg-background shadow-sm hover:shadow-md transition-shadow">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                <Zap className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Blazing Fast</h3>
              <p className="text-muted-foreground">Utilizes GitHub's massive bandwidth infrastructure for high-speed mirroring.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 border rounded-xl bg-background shadow-sm hover:shadow-md transition-shadow">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                <Shield className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Secure & Private</h3>
              <p className="text-muted-foreground">Your files are processed in ephemeral runners and wiped immediately after transfer.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 border rounded-xl bg-background shadow-sm hover:shadow-md transition-shadow">
              <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
                <DownloadCloud className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">No Limits</h3>
              <p className="text-muted-foreground">By stitching streams, we bypass typical file size limitations imposed by free tiers.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
