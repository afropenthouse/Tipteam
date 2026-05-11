import { LayoutDashboard, Store, Star, MessageSquareWarning, Wallet, Crown, LogOut, QrCode, Upload } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useCurrentUser } from "@/lib/store";
import { listBusinesses } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const mainItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard, end: true },
  { title: "Businesses", url: "/dashboard/businesses", icon: Store },
  { title: "Upload", url: "/dashboard/menu-qr-generator", icon: Upload },
  { title: "Ratings", url: "/dashboard/ratings", icon: Star },
  { title: "Feedback & Complaints", url: "/dashboard/complaints", icon: MessageSquareWarning },
  { title: "Wallet", url: "/dashboard/wallet", icon: Wallet },
  { title: "Subscriptions", url: "/dashboard/subscriptions", icon: Crown },
];
// ghv
export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  
  const { data: businesses = [] } = useQuery({
    queryKey: ["businesses"],
    queryFn: listBusinesses,
    enabled: !!user,
  });

  const isActive = (path: string, end = false) =>
    end ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <img 
            src="/logo2.png" 
            alt="Tracla Logo" 
            className="h-8 w-auto"
          />
          {!collapsed && (
            <div className="flex flex-col">
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.end)}>
                    <NavLink to={item.url} end={item.end}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {businesses.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>QR Codes</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {businesses.map((b) => (
                  <SidebarMenuItem key={b.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === `/dashboard/businesses/${b.id}`}
                    >
                      <NavLink to={`/dashboard/businesses/${b.id}`}>
                        <QrCode className="h-4 w-4" />
                        <span className="truncate">{b.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {user && !collapsed && (
          <div className="mb-2 flex items-center gap-2 rounded-md bg-sidebar-accent/50 p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-sidebar-foreground">{user.fullName}</p>
              <p className="truncate text-[10px] text-sidebar-foreground/60">{user.email}</p>
            </div>
          </div>
        )}
        <SidebarMenuButton
          onClick={() => {
            signOut();
            navigate("/login");
          }}
          className={cn("text-sidebar-foreground/80 hover:text-sidebar-foreground")}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
}