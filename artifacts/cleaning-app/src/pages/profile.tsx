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
  Timer,
  AlertCircle,
  TrendingUp,
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
  const formattedToday = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const employees = useMemo(
    () => (users ?? []).filter((u: any) => u.role === "employee" && !u.isHidden),
    [users]
  );

  const todayAssignments = useMemo(
    () => (allAssignments ?? []).filter((a: any) => a.date === today),
    [allAssignments, today]
  );

  const completedToday = todayAssignments.filter((a: any) => a.status === "completed").length;
  const inProgressToday = todayAssignments.filter((a: any) => a.status === "in_progress").length;
  const pendingToday = todayAssignments.filter((a: any) => a.status === "pending").length;
  const totalToday = todayAssignments.length;

  const employeeSummaries = useMemo(() => {
    return employees.map((emp: any) => {
      const empJobs = todayAssignments.filter((a: any) => a.assignedToClerkId === emp.clerkId);
      const done = empJobs.filter((a: any) => a.status === "completed").length;
      const inProg = empJobs.filter((a: any) => a.status === "in_progress").length;
      const pend = empJobs.filter((a: any) => a.status === "pending").length;
      return { ...emp, total: empJobs.length, done, inProg, pend };
    }).filter((e: any) => e.total > 0);
  }, [employees, todayAssignments]);

  const unassignedJobs = useMemo(
    () => todayAssignments.filter((a: any) => !a.assignedToClerkId),
    [todayAssignments]
  );

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

      {/* Today's Summary */}
      <Card className="border bg-[#fafaf9] shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-500/10 p-2 rounded-lg shrink-0">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Today's Summary</p>
                <p className="text-xs text-muted-foreground">{formattedToday}</p>
              </div>
            </div>
            {totalToday > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold px-2.5",
                  completedToday === totalToday
                    ? "text-green-700 border-green-300 bg-green-50"
                    : "text-amber-700 border-amber-300 bg-amber-50"
                )}
              >
                {completedToday}/{totalToday} done
              </Badge>
            )}
          </div>
        </div>

        <CardContent className="p-5 space-y-4">
          {totalToday === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No jobs scheduled for today</p>
          ) : (
            <>
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex h-2.5 rounded-full overflow-hidden bg-secondary gap-0.5">
                  {completedToday > 0 && (
                    <div
                      className="bg-green-500 rounded-full transition-all"
                      style={{ width: `${(completedToday / totalToday) * 100}%` }}
                    />
                  )}
                  {inProgressToday > 0 && (
                    <div
                      className="bg-amber-400 rounded-full transition-all"
                      style={{ width: `${(inProgressToday / totalToday) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  {completedToday > 0 && (
                    <span className="flex items-center gap-1 text-green-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                      {completedToday} completed
                    </span>
                  )}
                  {inProgressToday > 0 && (
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                      {inProgressToday} in progress
                    </span>
                  )}
                  {pendingToday > 0 && (
                    <span className="flex items-center gap-1 font-medium">
                      <span className="w-2 h-2 rounded-full bg-secondary border border-border inline-block" />
                      {pendingToday} pending
                    </span>
                  )}
                </div>
              </div>

              {/* Per-employee rows */}
              {employeeSummaries.length > 0 && (
                <div className="space-y-2">
                  {employeeSummaries.map((emp: any) => {
                    const name = emp.username || emp.firstName || "Unknown";
                    const allDone = emp.done === emp.total;
                    const hasActive = emp.inProg > 0;
                    return (
                      <div
                        key={emp.clerkId}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm",
                          allDone
                            ? "bg-green-50 border-green-200"
                            : hasActive
                            ? "bg-amber-50 border-amber-200"
                            : "bg-card border-border/50"
                        )}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className={cn(
                            "text-[11px] font-bold",
                            allDone ? "bg-green-200 text-green-800" : hasActive ? "bg-amber-200 text-amber-800" : "bg-primary/10 text-primary"
                          )}>
                            {name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium flex-1 truncate">{name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {allDone ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-green-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              All done
                            </span>
                          ) : hasActive ? (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                              <Timer className="h-3.5 w-3.5 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              Not started
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground ml-1">
                            {emp.done}/{emp.total}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Unassigned jobs warning */}
              {unassignedJobs.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800 font-medium">
                    {unassignedJobs.length} job{unassignedJobs.length !== 1 ? "s" : ""} still unassigned today
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg shrink-0">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none">{employees.length}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Active Employees</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-amber-500/10 p-2 rounded-lg shrink-0">
              <ClipboardList className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold leading-none">{totalToday}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Jobs Scheduled Today</div>
            </div>
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
