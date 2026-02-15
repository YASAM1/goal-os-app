import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LogOut, User, ChevronDown } from "lucide-react";

export function TopBar() {
  const { user, signOut } = useAuth();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/30 px-4 bg-background/40 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
            Run a Sub-4 Hour Marathon
          </span>
          <Badge variant="outline" className="border-primary/40 text-primary text-xs">
            Active
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs text-muted-foreground hidden md:block">{today}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <div className="h-6 w-6 rounded-full bg-secondary/80 flex items-center justify-center">
                <User className="h-3.5 w-3.5" />
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="backdrop-blur-md bg-card/90 border-border/30">
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              {user?.email ?? "user@example.com"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="h-3.5 w-3.5 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
