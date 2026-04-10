import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ClipboardList } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <div className="bg-primary text-primary-foreground p-4 rounded-xl shadow-lg shadow-primary/20">
            <ClipboardList size={48} />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">CleanTrack</h1>
          <p className="text-lg text-muted-foreground">
            The professional app for cleaning teams. Manage assignments, track progress, and coordinate effortlessly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <Link href="/sign-in" className="flex-1">
            <Button size="lg" className="w-full text-base h-12">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up" className="flex-1">
            <Button size="lg" variant="outline" className="w-full text-base h-12 border-primary/20 hover:bg-primary/5">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}