import { ReactNode } from "react";
import {
  LayoutDashboard,
  Target,
  CheckSquare,
  BookOpen,
  Settings,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { TopBar } from "@/components/TopBar";
import { StarField, NebulaGlows } from "@/components/StarField";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Goal", url: "/goal", icon: Target },
  { title: "Check-in", url: "/check-in", icon: CheckSquare },
  { title: "Resources", url: "/resources", icon: BookOpen },
  { title: "Settings", url: "/settings", icon: Settings },
];

function AppSidebar() {
  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar/80 backdrop-blur-md">
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center shadow-[0_0_12px_hsl(270_70%_60%/0.3)]">
          <Target className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display font-bold text-base text-sidebar-accent-foreground tracking-tight">
          Goal OS
        </span>
      </div>
      <SidebarContent className="pt-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full relative">
        <StarField />
        <NebulaGlows />
        <AppSidebar />
        <div className="flex flex-1 flex-col min-w-0 relative z-10">
          <TopBar />
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
