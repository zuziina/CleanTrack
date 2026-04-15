import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ClipboardList, CalendarClock, HomeIcon, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full space-y-10 text-center">
        <div className="space-y-5">
          <div className="flex justify-center">
            <div className="bg-primary text-primary-foreground p-4 rounded-2xl shadow-lg shadow-primary/20">
              <ClipboardList size={44} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">CleanTrack</h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              The all-in-one app for professional cleaning teams.
            </p>
          </div>
        </div>

        <div className="space-y-3 text-left">
          {[
            { icon: ClipboardList, text: "Assign and track daily cleaning jobs" },
            { icon: HomeIcon, text: "Manage properties and all their details" },
            { icon: CalendarClock, text: "Log attendance and working hours" },
            { icon: Users, text: "Coordinate your whole team in one place" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="bg-primary/10 text-primary rounded-lg p-1.5 shrink-0">
                <Icon size={15} />
              </div>
              {text}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/sign-in">
            <Button size="lg" className="w-full text-base h-12 font-semibold">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="lg" variant="outline" className="w-full text-base h-12 border-border hover:bg-secondary">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
