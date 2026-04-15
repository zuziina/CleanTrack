import { useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation, Redirect } from "wouter";
import { useCreateCompany, useJoinCompany } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Users, Copy, Check, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

type View = "choice" | "create" | "join";

export default function SetupCompanyPage() {
  const { user, isLoaded } = useUser();
  const [view, setView] = useState<View>("choice");

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Redirect to="/" />;

  const companyId = user.publicMetadata?.companyId as number | undefined;
  if (companyId) return <Redirect to="/profile" />;

  if (view === "create") return <CreateCompanyView clerkUser={user} onBack={() => setView("choice")} />;
  if (view === "join") return <JoinCompanyView clerkUser={user} onBack={() => setView("choice")} />;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to CleanTrack</h1>
          <p className="text-muted-foreground">Set up your company workspace to get started.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            className="cursor-pointer border-2 hover:border-primary transition-all hover:shadow-md hover:-translate-y-1"
            onClick={() => setView("create")}
          >
            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <Building2 className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Create a Company</h3>
                <p className="text-sm text-muted-foreground">
                  Start a new workspace, manage properties, and invite your team.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer border-2 hover:border-primary transition-all hover:shadow-md hover:-translate-y-1"
            onClick={() => setView("join")}
          >
            <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
              <div className="bg-primary/10 p-4 rounded-full">
                <Users className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-xl mb-2">Join a Company</h3>
                <p className="text-sm text-muted-foreground">
                  Enter an invite code from your boss to join their workspace.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CreateCompanyView({ clerkUser, onBack }: { clerkUser: any; onBack: () => void }) {
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [createdCompany, setCreatedCompany] = useState<{ name: string; inviteCode: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const createCompany = useCreateCompany();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const company = await createCompany.mutateAsync({ data: { name: name.trim() } });
      setCreatedCompany({ name: company.name, inviteCode: company.inviteCode });
    } catch (err: any) {
      toast.error("Failed to create company", { description: err?.message });
    }
  };

  const handleCopy = () => {
    if (!createdCompany) return;
    navigator.clipboard.writeText(createdCompany.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleContinue = async () => {
    await clerkUser.reload();
    setLocation("/profile");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <Building2 className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create Your Company</h1>
          <p className="text-muted-foreground">Give your cleaning company a name to get started.</p>
        </div>

        {!createdCompany ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input
                    id="company-name"
                    placeholder="e.g. Sparkling Clean Co."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={createCompany.isPending}
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!name.trim() || createCompany.isPending}
                >
                  {createCompany.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    "Create Company"
                  )}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-primary/20 bg-[#fafaf9]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary">Company Created!</CardTitle>
              <CardDescription>
                Share this invite code with your team members so they can join <strong>{createdCompany.name}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Invite Code</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-2xl font-bold tracking-widest bg-muted rounded-lg px-4 py-3 text-center select-all">
                    {createdCompany.inviteCode}
                  </div>
                  <Button variant="outline" size="icon" onClick={handleCopy} className="shrink-0">
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">You can always find this code on your profile page.</p>
              </div>
              <Button className="w-full" onClick={handleContinue}>
                Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function JoinCompanyView({ clerkUser, onBack }: { clerkUser: any; onBack: () => void }) {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [joinedCompany, setJoinedCompany] = useState<{ name: string } | null>(null);
  const joinCompany = useJoinCompany();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    try {
      const company = await joinCompany.mutateAsync({ data: { inviteCode: trimmed } });
      setJoinedCompany({ name: company.name });
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to join company";
      toast.error("Could not join company", { description: msg });
    }
  };

  const handleContinue = async () => {
    await clerkUser.reload();
    setLocation("/profile");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <Users className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Join Your Team</h1>
          <p className="text-muted-foreground">Enter the invite code your boss shared with you.</p>
        </div>

        {!joinedCompany ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    placeholder="XXXX-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={joinCompany.isPending}
                    className="font-mono text-center text-lg tracking-widest"
                    autoFocus
                    maxLength={9}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!code.trim() || joinCompany.isPending}
                >
                  {joinCompany.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...</>
                  ) : (
                    "Join Company"
                  )}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-sm border-primary/20 bg-[#fafaf9]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary">You're in!</CardTitle>
              <CardDescription>
                You've joined <strong>{joinedCompany.name}</strong>. Your boss can now assign you cleaning jobs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={handleContinue}>
                Go to Dashboard <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
