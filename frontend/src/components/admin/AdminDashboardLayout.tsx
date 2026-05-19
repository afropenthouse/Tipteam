import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminAppSidebar } from "@/components/admin/AdminAppSidebar";

export default function AdminDashboardLayout() {
  const isAdmin = localStorage.getItem("ttt:admin:token");
  if (!isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminAppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="ml-auto text-xs text-muted-foreground">
              Admin Portal
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}