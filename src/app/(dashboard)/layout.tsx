import { Sidebar } from "@/components/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-muted/10">
      <Sidebar />
      <main className="flex-1 w-full lg:pl-64 pt-16 lg:pt-0 transition-all">
        {children}
      </main>
    </div>
  );
}
