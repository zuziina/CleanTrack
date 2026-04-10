import { Link, useLocation } from "wouter";
import { User, Home, Map as MapIcon, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/houses", icon: Home, label: "Houses" },
    { href: "/map", icon: MapIcon, label: "Map" },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <ClipboardList size={24} />
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">CleanTrack</span>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
              location === item.href 
                ? "bg-primary text-primary-foreground shadow-sm" 
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-border bg-card p-4 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <ClipboardList size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">CleanTrack</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card flex justify-around p-2 pb-safe">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cn(
            "flex flex-col items-center gap-1 p-2 rounded-lg min-w-[4rem]",
            location === item.href
              ? "text-primary"
              : "text-muted-foreground"
          )}>
            <item.icon size={24} className={cn(
              location === item.href ? "fill-primary/20" : ""
            )} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}