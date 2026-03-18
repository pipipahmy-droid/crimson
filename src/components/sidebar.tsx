"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { DownloadCloud, History, LogOut, Settings, LayoutDashboard, Menu, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { auth } from "@/lib/firebase";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleSignOut = () => {
    auth.signOut();
  };

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "History",
      href: "/dashboard/history",
      icon: History,
    },
    {
      title: "Settings",
      href: "/dashboard/settings",
      icon: Settings,
      disabled: true,
    },
  ];

  const SidebarContent = () => (
    <>
      <div className="flex h-16 items-center border-b border-border/50 px-6 justify-between lg:justify-start">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-xl transition-colors hover:text-primary">
          <DownloadCloud className="h-6 w-6 text-primary" />
          <span>Crimson</span>
        </Link>
        <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground">
           <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-auto py-6 flex flex-col gap-1 px-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.disabled ? "#" : item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                item.disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </div>

      {user && (
        <div className="border-t border-border/50 p-4">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-muted/50 overflow-hidden flex items-center justify-center shrink-0">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "User"} width={32} height={32} />
              ) : (
                <span className="text-xs font-bold">{user.email?.[0].toUpperCase()}</span>
              )}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user.displayName || "User"}</span>
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile Top Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl z-40 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-xl">
          <DownloadCloud className="h-6 w-6 text-primary" />
          <span>Crimson</span>
        </Link>
        <button onClick={() => setIsOpen(true)} className="p-2 text-foreground">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <aside 
            className="fixed inset-y-0 left-0 w-3/4 max-w-sm border-r border-border/50 bg-background shadow-xl flex flex-col animate-in slide-in-from-left-full duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 border-r border-border/50 bg-background/50 backdrop-blur-xl flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
