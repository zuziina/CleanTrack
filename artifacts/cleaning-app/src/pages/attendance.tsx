import { Layout } from "@/components/layout";
import { useGetMe, useListUsers } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Timer,
  CheckCircle2,
  Clock,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";

type WorkSession = {
  id: number;
  clerkUserId: string;
  username: string | null;
  date: string;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  createdAt: string;
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_SHORT = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function toMonthStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `<1m`;
}

function sessionDuration(s: WorkSession) {
  if (!s.clockedInAt || !s.clockedOutAt) return null;
  return Math.floor(
    (new Date(s.clockedOutAt).getTime() - new Date(s.clockedInAt).getTime()) / 1000
  );
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function useLiveElapsed(clockedInAt: string | null, clockedOutAt: string | null) {
  const [elapsed, setElapsed] = useState(0);
  const ref = useRef<any>(null);
  useEffect(() => {
    if (!clockedInAt || clockedOutAt) {
      clearInterval(ref.current);
      if (clockedInAt && clockedOutAt) {
        setElapsed(Math.floor((new Date(clockedOutAt).getTime() - new Date(clockedInAt).getTime()) / 1000));
      }
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(clockedInAt).getTime()) / 1000));
    tick();
    ref.current = setInterval(tick, 1000);
    return () => clearInterval(ref.current);
  }, [clockedInAt, clockedOutAt]);
  return elapsed;
}

function useWorkSessions(month: string) {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch_ = useCallback(() => {
    setIsLoading(true);
    fetch(`/api/work-sessions?month=${month}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setSessions(data); setIsLoading(false); })
      .catch(() => { setSessions([]); setIsLoading(false); });
  }, [month]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { sessions, isLoading, refetch: fetch_ };
}

function useTodaySession() {
  const [session, setSession] = useState<WorkSession | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    setIsLoading(true);
    fetch("/api/work-sessions/today", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setSession(d); setIsLoading(false); })
      .catch(() => { setSession(null); setIsLoading(false); });
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const clockIn = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/work-sessions/clock-in", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
      });
      if (r.ok) { const d = await r.json(); setSession(d); }
      else toast.error("Could not clock in");
    } catch { toast.error("Could not clock in"); }
    finally { setBusy(false); }
  }, []);

  const clockOut = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/work-sessions/clock-out", {
        method: "POST", credentials: "include",
        headers: { "content-type": "application/json" },
      });
      if (r.ok) { const d = await r.json(); setSession(d); }
      else toast.error("Could not clock out");
    } catch { toast.error("Could not clock out"); }
    finally { setBusy(false); }
  }, []);

  const undoClock = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/work-sessions/today", {
        method: "DELETE", credentials: "include",
      });
      if (r.ok) setSession(null);
      else toast.error("Could not reset");
    } catch { toast.error("Could not reset"); }
    finally { setBusy(false); }
  }, []);

  return { session, isLoading, busy, clockIn, clockOut, undoClock, reload };
}

export default function AttendancePage() {
  const { data: user, isLoading: userLoading } = useGetMe();

  if (userLoading || !user) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user.role === "boss" ? "Track your team's working hours" : "Your work schedule and hours"}
          </p>
        </div>
        {user.role === "boss" ? <BossAttendance /> : <EmployeeAttendance />}
      </div>
    </Layout>
  );
}

function EmployeeAttendance() {
  const today = new Date();
  const [monthRef, setMonthRef] = useState(today);
  const monthStr = toMonthStr(monthRef);
  const { sessions, isLoading: sessionsLoading, refetch } = useWorkSessions(monthStr);
  const todayState = useTodaySession();

  const prevMonth = () => setMonthRef(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setMonthRef(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const sessionByDate = useMemo(() => {
    const map: Record<string, WorkSession> = {};
    sessions.forEach(s => { map[s.date] = s; });
    return map;
  }, [sessions]);

  const monthTotal = useMemo(() => {
    return sessions.reduce((acc, s) => {
      const dur = sessionDuration(s);
      return acc + (dur ?? 0);
    }, 0);
  }, [sessions]);

  const todayStr = toDateStr(today);
  const todaySession = sessionByDate[todayStr];
  const effectiveTodaySession = todayState.session !== undefined ? todayState.session : todaySession ?? null;

  useEffect(() => {
    if (todayState.session !== undefined) {
      refetch();
    }
  }, [todayState.session]);

  const grid = getMonthGrid(monthRef.getFullYear(), monthRef.getMonth());
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  return (
    <div className="space-y-6">
      <TodayClockWidget session={effectiveTodaySession} isLoading={todayState.isLoading} busy={todayState.busy} clockIn={todayState.clockIn} clockOut={todayState.clockOut} undoClock={todayState.undoClock} />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              {MONTH_NAMES[monthRef.getMonth()]} {monthRef.getFullYear()}
            </h2>
            {monthTotal > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Timer className="h-3 w-3" />
                {formatDuration(monthTotal)} total
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {sessionsLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <div className="rounded-xl border border-border overflow-hidden bg-card">
            <div className="grid grid-cols-7 border-b border-border">
              {DAY_SHORT.map(d => (
                <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
                {week.map((day, di) => {
                  if (!day) return <div key={di} className="min-h-[80px] bg-secondary/20 border-r border-border last:border-r-0" />;
                  const ds = toDateStr(day);
                  const isToday = ds === todayStr;
                  const s = isToday ? effectiveTodaySession : (sessionByDate[ds] ?? null);
                  const isFuture = ds > todayStr;
                  const dur = s ? sessionDuration(s) : null;

                  return (
                    <div
                      key={di}
                      className={cn(
                        "min-h-[80px] p-1.5 border-r border-border last:border-r-0 flex flex-col gap-1 transition-colors",
                        isToday ? "bg-primary/5" : isFuture ? "bg-secondary/10" : "bg-card"
                      )}
                    >
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                        isToday ? "bg-primary text-primary-foreground" : "text-foreground/70"
                      )}>
                        {day.getDate()}
                      </div>

                      {s?.clockedInAt && (
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-0.5 text-[9px] text-emerald-700 font-medium">
                            <LogIn className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{formatTime(s.clockedInAt)}</span>
                          </div>
                          {s.clockedOutAt ? (
                            <>
                              <div className="flex items-center gap-0.5 text-[9px] text-rose-600 font-medium">
                                <LogOut className="h-2.5 w-2.5 shrink-0" />
                                <span className="truncate">{formatTime(s.clockedOutAt)}</span>
                              </div>
                              {dur !== null && (
                                <div className="text-[9px] text-muted-foreground font-semibold">
                                  {formatDuration(dur)}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
                              <Timer className="h-2.5 w-2.5 animate-pulse shrink-0" />
                              <span>Active</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TodayClockWidget({
  session,
  isLoading,
  busy,
  clockIn,
  clockOut,
  undoClock,
}: {
  session: WorkSession | null | undefined;
  isLoading: boolean;
  busy: boolean;
  clockIn: () => void;
  clockOut: () => void;
  undoClock: () => void;
}) {
  const elapsed = useLiveElapsed(session?.clockedInAt ?? null, session?.clockedOutAt ?? null);

  if (isLoading || session === undefined) {
    return <Skeleton className="h-28 w-full rounded-2xl" />;
  }

  const notStarted = !session?.clockedInAt;
  const inProgress = !!session?.clockedInAt && !session?.clockedOutAt;
  const done = !!session?.clockedInAt && !!session?.clockedOutAt;

  if (notStarted) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-foreground">Ready to start your workday?</p>
          <p className="text-sm text-muted-foreground">Tap to record when you arrived</p>
        </div>
        <Button
          size="lg"
          className="h-12 px-8 font-semibold gap-2 shadow-md shrink-0"
          onClick={clockIn}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
          Clock In
        </Button>
      </div>
    );
  }

  if (inProgress) {
    return (
      <div className="rounded-2xl bg-primary text-primary-foreground p-5 shadow-md">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-white/15 rounded-xl p-2.5">
              <Timer className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-wider">Clocked in</p>
              <p className="text-lg font-bold">{formatTime(session.clockedInAt!)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-primary-foreground/70 text-xs font-semibold uppercase tracking-wider">Elapsed</p>
            <p className="text-2xl font-bold font-mono tabular-nums">{formatDuration(elapsed)}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="flex-1 h-12 font-semibold gap-2 bg-white/15 hover:bg-white/25 text-white border-white/20"
            onClick={clockOut}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
            Clock Out
          </Button>
          <button
            onClick={undoClock}
            disabled={busy}
            className="text-xs text-primary-foreground/50 hover:text-primary-foreground/80 transition-colors whitespace-nowrap"
          >
            Undo
          </button>
        </div>
      </div>
    );
  }

  const total = sessionDuration(session) ?? 0;

  return (
    <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-emerald-100 rounded-xl p-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-semibold text-emerald-800">Workday complete</p>
          <p className="text-xs text-emerald-600">You're done for today — great work!</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Arrived</p>
          <p className="font-bold text-sm">{formatTime(session.clockedInAt!)}</p>
        </div>
        <div className="bg-emerald-100 rounded-xl p-3 border border-emerald-200">
          <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mb-1">Total</p>
          <p className="font-bold text-sm text-emerald-800">{formatDuration(total)}</p>
        </div>
        <div className="bg-white/80 rounded-xl p-3 border border-emerald-100">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Left</p>
          <p className="font-bold text-sm">{formatTime(session.clockedOutAt!)}</p>
        </div>
      </div>
      <button
        onClick={undoClock}
        className="mt-3 text-xs text-muted-foreground hover:text-destructive transition-colors w-full text-center"
      >
        Undo clock-out
      </button>
    </div>
  );
}

function BossAttendance() {
  const today = new Date();
  const [monthRef, setMonthRef] = useState(today);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const monthStr = toMonthStr(monthRef);
  const { sessions, isLoading: sessionsLoading } = useWorkSessions(monthStr);
  const { data: users, isLoading: usersLoading } = useListUsers();

  const employees = useMemo(() => (users ?? []).filter((u: any) => u.role === "employee"), [users]);

  const selectedEmployee = useMemo(
    () => employees.find((e: any) => e.clerkId === selectedEmployeeId) ?? employees[0] ?? null,
    [employees, selectedEmployeeId]
  );

  const effectiveId = selectedEmployee?.clerkId ?? null;

  const filteredSessions = useMemo(() => {
    if (!effectiveId) return [];
    return sessions.filter(s => s.clerkUserId === effectiveId);
  }, [sessions, effectiveId]);

  const sessionByDate = useMemo(() => {
    const map: Record<string, WorkSession> = {};
    filteredSessions.forEach(s => { map[s.date] = s; });
    return map;
  }, [filteredSessions]);

  const monthTotal = useMemo(() =>
    filteredSessions.reduce((acc, s) => acc + (sessionDuration(s) ?? 0), 0),
    [filteredSessions]
  );

  const prevMonth = () => setMonthRef(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () => setMonthRef(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const todayStr = toDateStr(today);
  const grid = getMonthGrid(monthRef.getFullYear(), monthRef.getMonth());
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  if (usersLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  if (employees.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <div className="bg-secondary p-4 rounded-full mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <p className="font-medium text-foreground text-lg">No employees yet</p>
          <p className="text-sm mt-1">Share your invite code so workers can join your company</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee</p>
        <div className="flex flex-wrap gap-2">
          {employees.map((emp: any) => {
            const name = emp.username || emp.firstName || "Unknown";
            const isActive = emp.clerkId === (selectedEmployee?.clerkId ?? employees[0]?.clerkId);
            const empSessions = sessions.filter(s => s.clerkUserId === emp.clerkId);
            const empTotal = empSessions.reduce((a, s) => a + (sessionDuration(s) ?? 0), 0);
            return (
              <button
                key={emp.clerkId}
                onClick={() => setSelectedEmployeeId(emp.clerkId)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                )}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className={cn(
                    "text-[10px] font-bold",
                    isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                  )}>
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{name}</span>
                {empTotal > 0 && (
                  <span className={cn(
                    "text-[10px] font-semibold",
                    isActive ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {formatDuration(empTotal)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedEmployee && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                {MONTH_NAMES[monthRef.getMonth()]} {monthRef.getFullYear()}
              </h2>
              {monthTotal > 0 && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Timer className="h-3 w-3" />
                  {formatDuration(monthTotal)} total
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {sessionsLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-card">
              <div className="grid grid-cols-7 border-b border-border">
                {DAY_SHORT.map(d => (
                  <div key={d} className="py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>
              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
                  {week.map((day, di) => {
                    if (!day) return <div key={di} className="min-h-[80px] bg-secondary/20 border-r border-border last:border-r-0" />;
                    const ds = toDateStr(day);
                    const isToday = ds === todayStr;
                    const isFuture = ds > todayStr;
                    const s = sessionByDate[ds] ?? null;
                    const dur = s ? sessionDuration(s) : null;

                    return (
                      <div
                        key={di}
                        className={cn(
                          "min-h-[80px] p-1.5 border-r border-border last:border-r-0 flex flex-col gap-1",
                          isToday ? "bg-amber-50/60" : isFuture ? "bg-secondary/10" : "bg-card"
                        )}
                      >
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                          isToday ? "bg-amber-500 text-white" : "text-foreground/70"
                        )}>
                          {day.getDate()}
                        </div>

                        {s?.clockedInAt && (
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-0.5 text-[9px] text-emerald-700 font-medium">
                              <LogIn className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{formatTime(s.clockedInAt)}</span>
                            </div>
                            {s.clockedOutAt ? (
                              <>
                                <div className="flex items-center gap-0.5 text-[9px] text-rose-600 font-medium">
                                  <LogOut className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">{formatTime(s.clockedOutAt)}</span>
                                </div>
                                {dur !== null && (
                                  <div className="text-[9px] text-muted-foreground font-semibold">
                                    {formatDuration(dur)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
                                <Timer className="h-2.5 w-2.5 animate-pulse shrink-0" />
                                <span>Active</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {!sessionsLoading && filteredSessions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-4">
              No attendance records for {selectedEmployee.username || selectedEmployee.firstName} this month
            </p>
          )}
        </div>
      )}
    </div>
  );
}
