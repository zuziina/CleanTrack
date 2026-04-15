import { Link, useLocation } from "wouter";
import { User, Home, ClipboardList, LogOut, CalendarClock } from "lucide-react";
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
    { href: "/profile", icon: User, label: "Profile" },
    { href: "/houses", icon: Home, label: "Houses" },
    { href: "/attendance", icon: CalendarClock, label: "Attendance" },
  ];

  return (
    <>
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
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => setShowSignOutConfirm(true)}
          >
            <LogOut size={20} className="mr-3" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-border bg-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <ClipboardList size={20} />
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">CleanTrack</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setShowSignOutConfirm(true)}>
            <LogOut size={20} />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card flex justify-around p-2 pb-safe z-50">
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

    {/* Sign-out confirmation dialog */}
    <Dialog open={showSignOutConfirm} onOpenChange={(open) => !open && setShowSignOutConfirm(false)}>
      <DialogContent className="sm:max-w-[360px] bg-[#fafaf9]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5 text-muted-foreground" />
            Sign out?
          </DialogTitle>
          <DialogDescription className="pt-1">
            Are you sure you want to sign out of CleanTrack?
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setShowSignOutConfirm(false)}>
            Cancel
          </Button>
          <Button onClick={() => signOut()} className="gap-2">
            <LogOut className="h-4 w-4" />
            Yes, sign out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
