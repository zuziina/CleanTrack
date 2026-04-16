import { Layout } from "@/components/layout";
import {
  useGetMe,
  useGetMyCompany,
  useGetTodayAssignments,
  useListUsers,
  useListAssignments,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crown,
  UserCheck,
  Building2,
  Copy,
  Check,
  CalendarDays,
  Users,
  ClipboardList,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function toDateString(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useGetMe();

  if (userLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const isBoss = user.role === "boss";
  const displayName = user.username || user.firstName || user.email.split("@")[0];
  const initials = displayName.charAt(0).toUpperCase();
  const greeting = getGreeting();

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6 animate-in fade-in duration-300">
        {/* Profile header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-border shadow-sm shrink-0">
            <AvatarFallback className="text-xl bg-primary text-primary-foreground uppercase font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{greeting}</p>
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate leading-tight">
              {displayName}
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {isBoss ? (
                <Badge className="gap-1 px-2 py-0.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white border-none rounded-full">
                  <Crown className="h-3 w-3" />
                  Boss
                </Badge>
              ) : (
                <Badge className="gap-1 px-2 py-0.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-none rounded-full">
                  <UserCheck className="h-3 w-3" />
                  Employee
                </Badge>
              )}
              <span className="text-xs text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        </div>

        {isBoss ? <BossOverview /> : <EmployeeOverview />}
      </div>
    </Layout>
  );
}

/* ── Boss Overview ───────────────────────────────────────────────────── */

function BossOverview() {
  const { data: company, isLoading: companyLoading } = useGetMyCompany();
  const { data: users } = useListUsers();
  const { data: allAssignments } = useListAssignments();
  const [copied, setCopied] = useState(false);

  const today = toDateString(new Date());

  const employees = useMemo(
    () => (users ?? []).filter((u: any) => u.role === "employee"),
    [users]
  );

  const todayAssignments = useMemo(
    () => (allAssignments ?? []).filter((a: any) => a.date === today),
    [allAssignments, today]
  );

  const completedToday = todayAssignments.filter((a: any) => a.status === "completed").length;
  const pendingToday = todayAssignments.filter((a: any) => a.status !== "completed").length;

  const handleCopy = () => {
    if (!company?.inviteCode) return;
    navigator.clipboard.writeText(company.inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-5">
      {/* Company card */}
      {companyLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : company ? (
        <Card className="border bg-[#fafaf9] shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-primary/10 p-2.5 rounded-lg shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Company</p>
                  <p className="font-semibold text-foreground truncate">{company.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Invite Code</p>
                  <p className="font-mono font-bold tracking-widest text-foreground">{company.inviteCode}</p>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCopy}
                  title="Copy invite code"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-primary mx-auto mb-1.5" />
            <div className="text-2xl font-bold">{employees.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Employees</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <ClipboardList className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
            <div className="text-2xl font-bold">{pendingToday}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Jobs Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto mb-1.5" />
            <div className="text-2xl font-bold">{completedToday}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Go to Schedule CTA */}
      <Link href="/schedule">
        <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 p-2.5 rounded-lg shrink-0">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Manage Schedule</p>
                <p className="text-xs text-muted-foreground mt-0.5">Assign properties, view team workload</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary shrink-0" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}

/* ── Employee Overview ───────────────────────────────────────────────── */

function EmployeeOverview() {
  const { data: assignments, isLoading } = useGetTodayAssignments();

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const count = assignments?.length ?? 0;
  const completed = assignments?.filter((a: any) => a.status === "completed").length ?? 0;
  const inProgress = assignments?.filter((a: any) => a.status === "in_progress").length ?? 0;

  return (
    <div className="space-y-5">
      {/* Today summary */}
      <Card className="bg-[#fafaf9]">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Today</p>
              <p className="font-semibold text-foreground">{formattedDate}</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 rounded-full" />
            ) : (
              <Badge variant="outline" className="text-sm px-3 py-1 font-semibold">
                {count} {count === 1 ? "job" : "jobs"}
              </Badge>
            )}
          </div>

          {!isLoading && count > 0 && (
            <div className="flex gap-3">
              {inProgress > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {inProgress} in progress
                </div>
              )}
              {completed > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {completed} done
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Go to Schedule CTA */}
      <Link href="/schedule">
        <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-primary/15 p-2.5 rounded-lg shrink-0">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">
                  {count > 0 ? "View My Assignments" : "View Schedule"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {count > 0 ? `You have ${count} job${count !== 1 ? "s" : ""} today` : "No jobs scheduled today"}
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-primary shrink-0" />
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
