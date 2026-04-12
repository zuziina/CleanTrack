import { useState } from "react";
import { useSignUp } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Briefcase, Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { useSetUserRole } from "@workspace/api-client-react";
import { Link } from "wouter";

type Step = "role" | "details" | "verify";

export default function SignUpPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [, setLocation] = useLocation();
  const setUserRole = useSetUserRole();

  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<"boss" | "employee" | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectRole = (r: "boss" | "employee") => {
    setRole(r);
    setStep("details");
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !role) return;
    setError(null);

    try {
      setIsLoading(true);
      const result = await signUp!.create({
        firstName: username,
        emailAddress: email,
        password,
      });

      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        await setUserRole.mutateAsync({ data: { role } });
        sessionStorage.setItem("roleChosen", "true");
        setLocation("/profile");
      } else {
        await signUp!.prepareEmailAddressVerification({ strategy: "email_code" });
        setStep("verify");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !role) return;
    setError(null);

    try {
      setIsLoading(true);
      const result = await signUp!.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive!({ session: result.createdSessionId });
        await setUserRole.mutateAsync({ data: { role } });
        sessionStorage.setItem("roleChosen", "true");
        setLocation("/profile");
      } else {
        setError("Verification incomplete. Please try again.");
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message || "Invalid code.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === "role") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Welcome to CleanTrack</h1>
            <p className="text-muted-foreground">Choose your role to get started</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              className="cursor-pointer border-2 hover:border-primary transition-all hover:shadow-md hover:-translate-y-1"
              onClick={() => handleSelectRole("boss")}
            >
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Briefcase className="h-10 w-10 text-primary" />
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
              className="cursor-pointer border-2 hover:border-primary transition-all hover:shadow-md hover:-translate-y-1"
              onClick={() => handleSelectRole("employee")}
            >
              <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <User className="h-10 w-10 text-primary" />
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

  if (step === "verify") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/50 shadow-lg animate-in fade-in zoom-in-95 duration-300">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-2">
              <div className="bg-primary/10 p-4 rounded-full">
                <MailCheck className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Check your email</CardTitle>
            <CardDescription className="text-center">
              We sent a verification code to <strong>{email}</strong>. Enter it below to confirm your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isLoading || code.length < 4}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Verify & Create Account
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => { setStep("details"); setError(null); setCode(""); }}
              >
                Back
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/50 shadow-lg animate-in fade-in zoom-in-95 duration-300">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="icon" onClick={() => { setStep("role"); setError(null); }} className="h-8 w-8 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {role} Account
            </span>
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Enter your details below to sign up.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmitDetails} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Full Name</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full mt-2" disabled={isLoading || !isLoaded}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continue
            </Button>

            <p className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
