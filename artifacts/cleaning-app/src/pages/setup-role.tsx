import { useSetUserRole } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { User, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function SetupRolePage() {
  const setUserRole = useSetUserRole();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<"boss" | "employee" | null>(null);

  const handleSelectRole = async (role: "boss" | "employee") => {
    try {
      setIsLoading(role);
      await setUserRole.mutateAsync({
        data: { role }
      });
      sessionStorage.setItem("roleChosen", "true");
      setLocation("/profile");
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to set role. Please try again.",
        variant: "destructive"
      });
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">One Last Step</h1>
          <p className="text-muted-foreground">Please select your role to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className={`cursor-pointer border-2 transition-all ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:shadow-md hover:-translate-y-1'}`}
            onClick={() => handleSelectRole("boss")}
          >
            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="bg-primary/10 p-4 rounded-full relative">
                {isLoading === "boss" ? (
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : (
                  <Briefcase className="h-10 w-10 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">I am a Boss</h3>
                <p className="text-sm text-muted-foreground">
                  I want to manage properties, invite team members, and assign daily schedules.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer border-2 transition-all ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:shadow-md hover:-translate-y-1'}`}
            onClick={() => handleSelectRole("employee")}
          >
            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="bg-primary/10 p-4 rounded-full relative">
                {isLoading === "employee" ? (
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : (
                  <User className="h-10 w-10 text-primary" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">I am an Employee</h3>
                <p className="text-sm text-muted-foreground">
                  I want to see my daily schedule, view property details, and update job status.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}