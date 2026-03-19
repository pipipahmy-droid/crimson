"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { user, signInWithGoogle, logout, loading } = useAuth();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    if (pathname !== "/") return;

    e.preventDefault();
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  if (pathname === "/signup" || pathname === "/login") {
    return null;
  }

  return (
    <nav className="fixed top-0 w-full z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="container relative flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl tracking-tighter text-primary">CRIMSON.</span>
        </Link>
        
        <div className="hidden md:flex gap-6 absolute left-1/2 -translate-x-1/2">
            <Link href="/" onClick={(e) => scrollToSection(e, "top")} className="text-sm font-medium hover:text-primary transition-colors">
            Home
            </Link>
             <Link href="/#features" onClick={(e) => scrollToSection(e, "features")} className="text-sm font-medium hover:text-primary transition-colors text-muted-foreground">
            Features
            </Link>
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
             <div className="h-8 w-20 bg-muted rounded animate-pulse" />
          ) : user ? (
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-2 text-sm font-medium">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="h-7 w-7 rounded-full border" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center border">
                        <UserIcon className="h-4 w-4" />
                    </div>
                  )}
                  <span className="hidden sm:inline-block truncate max-w-[100px]">{user.displayName}</span>
               </div>
               <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
                 <LogOut className="h-4 w-4" />
               </Button>
            </div>
          ) : (
            <Button size="sm">
              <Link href="/signup">  
                Sign In
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}