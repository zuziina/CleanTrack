import { Link, useLocation } from "wouter";
import { User, Home, ClipboardList, LogOut, CalendarClock, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClerk } from "@clerk/react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { useState } from "react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const navItems = [
    { href: "/profile", icon: User, label: "Dashboard" },
    { href: "/schedule", icon: CalendarDays, label: "Schedule" },
    { href: "/houses", icon: Home, label: "Properties" },
    { href: "/attendance", icon: CalendarClock, label: "Attendance" },
  ];

  return (
    <>
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card shrink-0">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-border/50">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg shrink-0">
            <ClipboardList size={20} />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">CleanTrack</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              location === item.href
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border/50">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground gap-3 px-3 text-sm font-medium"
            onClick={() => setShowSignOutConfirm(true)}
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-border bg-card px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <ClipboardList size={18} />
            </div>
            <span className="font-bold text-base tracking-tight text-foreground">CleanTrack</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => setShowSignOutConfirm(true)}>
            <LogOut size={18} />
          </Button>
        </header>

        <div
          className="flex-1 overflow-y-auto overscroll-contain touch-pan-y pb-16 md:pb-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-sm flex justify-around px-2 py-1.5 pb-safe z-50">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={cn(
            "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg min-w-[4rem] transition-colors",
            location === item.href
              ? "text-primary"
              : "text-muted-foreground"
          )}>
            <item.icon size={22} strokeWidth={location === item.href ? 2.5 : 1.75} />
            <span className="text-[10px] font-semibold">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>

    {/* Sign-out confirmation dialog */}
    <Dialog open={showSignOutConfirm} onOpenChange={(open) => !open && setShowSignOutConfirm(false)}>
      <DialogContent className="sm:max-w-[340px] bg-[#fafaf9]">
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
          <DialogDescription>
            You'll be returned to the login screen.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={() => setShowSignOutConfirm(false)}>
            Cancel
          </Button>
          <Button className="flex-1 gap-2" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
