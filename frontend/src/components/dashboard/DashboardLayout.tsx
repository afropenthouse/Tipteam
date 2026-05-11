import { Navigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useCurrentUser } from "@/lib/store";

export default function DashboardLayout() {
  const user = useCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
// guyg
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger />
            <div className="ml-auto text-xs text-muted-foreground">
              Welcome back, <span className="font-medium text-foreground">{user.fullName.split(" ")[0]}</span>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-10">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}