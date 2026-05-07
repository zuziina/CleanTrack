import { Layout } from "@/components/layout";
import {
  useGetMe,
  useGetTodayAssignments,
  useListUsers,
  useListHouses,
  useListAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useGetHouse,
  useUpdateHouseNotes,
  useStartCleaning,
  useFinishCleaning,
  usePatchAssignmentTiming,
  usePatchUser,
  useRemoveEmployee,
  useReorderAssignment,
  getGetHouseQueryKey,
  getGetTodayAssignmentsQueryKey,
  getListAssignmentsQueryKey,
  getListUsersQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  Calendar,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Plus,
  UserCheck,
  Pencil,
  Trash2,
  BedDouble,
  BedSingle,
  Baby,
  Bath,
  ExternalLink,
  Phone,
  Mail,
  KeyRound,
  PlayCircle,
  CheckCircle2,
  Timer,
  AlarmClock,
  Waves,
  Flame,
  MoreVertical,
  EyeOff,
  Eye,
  UserMinus,
  Plane,
  Search,
  X,
  TriangleAlert,
  ImagePlus,
  Download,
  Camera,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

/* ── Helpers ─────────────────────────────────────────────────────────── */

function toDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CHECKOUT_MIN = 3;

const STATUS_OPTIONS = [
  { value: "pending", label: "Assigned", color: "bg-amber-100 text-amber-800 border-amber-300" },
  { value: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300" },
  { value: "completed", label: "Completed", color: "bg-emerald-100 text-emerald-800 border-emerald-300" },
] as const;

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function toTimeInputValue(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function objectPathToUrl(objectPath: string) {
  return `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
}

function buildIsoFromTimeInput(originalIso: string, timeValue: string) {
  const d = new Date(originalIso);
  const [h, m] = timeValue.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

/* ── Main Page ───────────────────────────────────────────────────────── */

export default function SchedulePage() {
  const { data: user, isLoading } = useGetMe();

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      {user.role === "boss" ? <BossSchedule /> : <EmployeeSchedule />}
    </Layout>
  );
}

/* ── Boss Schedule ───────────────────────────────────────────────────── */

function HouseSearchFilter({
  houses,
  value,
  onChange,
}: {
  houses: { id: number; name: string }[];
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selectedHouse = houses.find((h) => h.id === value);
  const filtered = query
    ? houses.filter((h) => h.name.toLowerCase().includes(query.toLowerCase()))
    : houses;

  if (selectedHouse) {
    return (
      <div className="flex items-center gap-1 bg-primary text-primary-foreground rounded-full pl-2.5 pr-1.5 py-0.5 h-6">
        <span className="text-xs font-medium truncate max-w-[180px]">{selectedHouse.name}</span>
        <button
          onClick={() => onChange(null)}
          className="opacity-70 hover:opacity-100 transition-opacity shrink-0"
          title="Clear house filter"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className={cn(
        "flex items-center gap-1.5 h-6 px-2.5 rounded-full border bg-background text-xs transition-all",
        open ? "border-primary/50 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"
      )}>
        <Search className="h-3 w-3 shrink-0 opacity-60" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder="Search houses…"
          className="bg-transparent outline-none text-xs w-28 placeholder:text-muted-foreground/50"
        />
        {query && (
          <button onMouseDown={(e) => { e.preventDefault(); setQuery(""); }} className="opacity-50 hover:opacity-80">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-hidden min-w-[200px] max-h-52 overflow-y-auto">
          {filtered.map((h) => (
            <button
              key={h.id}
              onMouseDown={() => { onChange(h.id); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors"
            >
              {h.name}
            </button>
          ))}
        </div>
      )}
      {open && filtered.length === 0 && query && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg px-3 py-2 text-xs text-muted-foreground min-w-[160px]">
          No houses match
        </div>
      )}
    </div>
  );
}

function HousePickerInput({
  houses,
  value,
  onChange,
}: {
  houses: { id: number; name: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = houses.find((h) => String(h.id) === value);
  const filtered = query
    ? houses.filter((h) => h.name.toLowerCase().includes(query.toLowerCase()))
    : houses;

  return (
    <div className="relative">
      {selected ? (
        <div className="flex items-center justify-between h-9 px-3 rounded-md border border-input bg-background text-sm">
          <span className="truncate text-foreground">{selected.name}</span>
          <button
            type="button"
            onClick={() => { onChange(""); setQuery(""); }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
            title="Clear selection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-md border bg-background text-sm transition-colors",
          open ? "border-ring ring-1 ring-ring/20" : "border-input"
        )}>
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="Search properties…"
            className="bg-transparent outline-none text-sm flex-1 placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setQuery(""); }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {open && !selected && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg overflow-y-auto max-h-52">
          {filtered.map((h) => (
            <button
              key={h.id}
              type="button"
              onMouseDown={() => { onChange(String(h.id)); setQuery(""); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors"
            >
              {h.name}
            </button>
          ))}
        </div>
      )}
      {open && !selected && filtered.length === 0 && query && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border border-border rounded-xl shadow-lg px-3 py-3 text-sm text-muted-foreground">
          No properties match
        </div>
      )}
    </div>
  );
}

function BossSchedule() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekRef, setWeekRef] = useState<Date>(today);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [filterEmployee, setFilterEmployee] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterHouse, setFilterHouse] = useState<number | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [removeConfirmTarget, setRemoveConfirmTarget] = useState<any>(null);

  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: allAssignments, isLoading: assignmentsLoading } = useListAssignments();
  const patchUser = usePatchUser();
  const removeEmployee = useRemoveEmployee();
  const reorderAssignment = useReorderAssignment();
  const qc = useQueryClient();

  const allEmployees = useMemo(
    () => (users ?? []).filter((u: any) => u.role === "employee"),
    [users]
  );
  const employees = useMemo(
    () => allEmployees.filter((u: any) => !u.isHidden),
    [allEmployees]
  );
  const hiddenEmployees = useMemo(
    () => allEmployees.filter((u: any) => u.isHidden),
    [allEmployees]
  );

  const handleToggleHidden = (emp: any) => {
    patchUser.mutate(
      { clerkId: emp.clerkId, data: { isHidden: !emp.isHidden } },
      {
        onSuccess: () => {
          toast.success(emp.isHidden ? `${emp.username || emp.firstName} is back` : `${emp.username || emp.firstName} set as away`);
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
        },
        onError: () => toast.error("Failed to update employee"),
      }
    );
  };

  const handleRemoveEmployee = (emp: any) => {
    removeEmployee.mutate(
      { clerkId: emp.clerkId },
      {
        onSuccess: () => {
          toast.success(`${emp.username || emp.firstName} removed from company`);
          qc.invalidateQueries({ queryKey: getListUsersQueryKey() });
          setRemoveConfirmTarget(null);
        },
        onError: () => toast.error("Failed to remove employee"),
      }
    );
  };

  const weekDays = useMemo(() => getWeekDays(weekRef), [weekRef]);

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (allAssignments ?? []).forEach((a: any) => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [allAssignments]);

  const datesWithIssues = useMemo(() => {
    const s = new Set<string>();
    (allAssignments ?? []).forEach((a: any) => {
      if (a.issuePhotoCount > 0) s.add(a.date);
    });
    return s;
  }, [allAssignments]);

  const datesWithMissingCheckout = useMemo(() => {
    const s = new Set<string>();
    (allAssignments ?? []).forEach((a: any) => {
      if (a.checkoutStatus === "pending_checkout") s.add(a.date);
    });
    return s;
  }, [allAssignments]);

  const selectedDateStr = toDateString(selectedDate);
  const selectedAssignments = assignmentsByDate[selectedDateStr] ?? [];

  const housesInSelection = useMemo(() => {
    const seen = new Set<number>();
    const result: { id: number; name: string }[] = [];
    for (const a of selectedAssignments) {
      if (a.houseId && !seen.has(a.houseId)) {
        seen.add(a.houseId);
        result.push({ id: a.houseId, name: a.houseName ?? `House ${a.houseId}` });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedAssignments]);

  const filteredAssignments = useMemo(() => {
    return selectedAssignments.filter((a: any) => {
      if (filterEmployee && a.assignedToClerkId !== filterEmployee) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      if (filterHouse && a.houseId !== filterHouse) return false;
      return true;
    });
  }, [selectedAssignments, filterEmployee, filterStatus, filterHouse]);

  const hasActiveFilter = filterEmployee !== null || filterStatus !== null || filterHouse !== null;

  const assignmentsByEmployee = useMemo(() => {
    const map = new Map<string | null, any[]>();
    filteredAssignments.forEach((a: any) => {
      const key = a.assignedToClerkId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    });
    const groups: { clerkId: string | null; name: string; assignments: any[] }[] = [];
    allEmployees.forEach((emp: any) => {
      if (map.has(emp.clerkId)) {
        groups.push({
          clerkId: emp.clerkId,
          name: emp.username || emp.firstName || "Unknown",
          assignments: map.get(emp.clerkId)!,
        });
      }
    });
    map.forEach((assignments, clerkId) => {
      if (clerkId !== null && !allEmployees.find((e: any) => e.clerkId === clerkId)) {
        groups.push({ clerkId, name: assignments[0]?.assignedToUsername ?? "Unknown", assignments });
      }
    });
    if (map.has(null)) {
      groups.push({ clerkId: null, name: "Unassigned", assignments: map.get(null)! });
    }
    return groups;
  }, [filteredAssignments, allEmployees]);

  const formattedSelected = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const monthLabel = (() => {
    const months = new Set(weekDays.map(d => d.getMonth()));
    if (months.size === 1) {
      return `${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`;
    }
    const [m1, m2] = [...months];
    return `${MONTH_NAMES[m1]} / ${MONTH_NAMES[m2]} ${weekDays[6].getFullYear()}`;
  })();

  const prevWeek = () => {
    const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d);
  };
  const nextWeek = () => {
    const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage assignments for your team</p>
      </div>

      {/* Week calendar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">{monthLabel}</span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, i) => {
            const ds = toDateString(day);
            const isToday = ds === toDateString(today);
            const isSelected = ds === selectedDateStr;
            const count = (assignmentsByDate[ds] ?? []).length;
            const hasIssues = datesWithIssues.has(ds);
            const hasMissingCheckout = datesWithMissingCheckout.has(ds);
            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all text-sm font-medium",
                  isSelected
                    ? "border-amber-500 bg-amber-500 text-white shadow-md"
                    : isToday
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-transparent bg-secondary hover:border-border hover:bg-secondary/80 text-foreground"
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                  {DAY_SHORT[i]}
                </span>
                <span className="text-base font-bold">{day.getDate()}</span>
                {count > 0 ? (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    isSelected ? "bg-white/25 text-white" : "bg-primary/15 text-primary"
                  )}>
                    {count}
                  </span>
                ) : (
                  <span className="h-4" />
                )}
                <div className="h-3 flex items-center gap-0.5">
                  {hasIssues && (
                    <TriangleAlert className={cn("h-3 w-3", isSelected ? "text-white/80" : "text-amber-500")} />
                  )}
                  {hasMissingCheckout && (
                    <Camera className={cn("h-3 w-3", isSelected ? "text-white/60" : "text-emerald-500")} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Team panel */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
            <h3 className="text-sm font-semibold tracking-tight">Team</h3>
            <Badge variant="outline" className="text-xs">{employees.length} active</Badge>
          </div>

          {usersLoading ? (
            <div className="space-y-2">
              {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : allEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
              No employees yet
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((emp: any) => {
                const empAssignments = selectedAssignments.filter(
                  (a: any) => a.assignedToClerkId === emp.clerkId
                );
                const name = emp.username || emp.firstName || "Unknown";
                return (
                  <Card key={emp.clerkId} className="border-border/50">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary uppercase text-xs">
                            {name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium leading-none truncate text-sm">{name}</p>
                          <p className={cn("text-xs mt-0.5", empAssignments.length > 0 ? "text-primary font-medium" : "text-muted-foreground")}>
                            {empAssignments.length > 0
                              ? `${empAssignments.length} job${empAssignments.length !== 1 ? "s" : ""} today`
                              : "No assignments"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setAssignTarget(emp)}>
                          <Plus className="h-3 w-3" /> Assign
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground">
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => handleToggleHidden(emp)} className="gap-2">
                              <Plane className="h-3.5 w-3.5 text-amber-500" />
                              Set as on vacation
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setRemoveConfirmTarget(emp)} className="gap-2 text-destructive focus:text-destructive">
                              <UserMinus className="h-3.5 w-3.5" />
                              Remove from company
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {hiddenEmployees.length > 0 && (
                <div className="pt-1">
                  <button
                    onClick={() => setShowHidden(!showHidden)}
                    className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-1.5 rounded-md hover:bg-secondary/60"
                  >
                    <span className="flex items-center gap-1.5">
                      <Plane className="h-3 w-3" />
                      {hiddenEmployees.length} on vacation
                    </span>
                    {showHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </button>

                  {showHidden && (
                    <div className="space-y-2 mt-2">
                      {hiddenEmployees.map((emp: any) => {
                        const name = emp.username || emp.firstName || "Unknown";
                        return (
                          <Card key={emp.clerkId} className="border-border/30 bg-secondary/30 opacity-70">
                            <CardContent className="p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 overflow-hidden">
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback className="bg-secondary text-muted-foreground uppercase text-xs">
                                    {name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium leading-none truncate text-sm text-muted-foreground">{name}</p>
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <Plane className="h-2.5 w-2.5 text-amber-500" />
                                    <span className="text-xs text-amber-600 font-medium">On vacation</span>
                                  </div>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                  <DropdownMenuItem onClick={() => handleToggleHidden(emp)} className="gap-2">
                                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                                    Back from vacation
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setRemoveConfirmTarget(emp)} className="gap-2 text-destructive focus:text-destructive">
                                    <UserMinus className="h-3.5 w-3.5" />
                                    Remove from company
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assignments panel */}
        <div className="lg:col-span-7 space-y-3">
          {/* Panel header */}
          <div className="flex items-start justify-between border-b border-border/50 pb-2.5 gap-3">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">{formattedSelected}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filteredAssignments.length === selectedAssignments.length
                  ? `${selectedAssignments.length} assignment${selectedAssignments.length !== 1 ? "s" : ""}`
                  : `${filteredAssignments.length} of ${selectedAssignments.length}`}
              </p>
            </div>
            {hasActiveFilter && (
              <button
                onClick={() => { setFilterEmployee(null); setFilterStatus(null); setFilterHouse(null); }}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline shrink-0 mt-0.5"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Filter pills */}
          {selectedAssignments.length > 0 && (
            <div className="space-y-2">
              {/* Person filter */}
              {employees.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-14 shrink-0">
                    Person
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => setFilterEmployee(null)}
                      className={cn(
                        "h-6 px-2.5 rounded-full text-xs font-medium border transition-all",
                        filterEmployee === null
                          ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                          : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      All
                    </button>
                    {employees.map((emp: any) => {
                      const isActive = filterEmployee === emp.clerkId;
                      const name = emp.username || emp.firstName || "Unknown";
                      return (
                        <button
                          key={emp.clerkId}
                          onClick={() => setFilterEmployee(isActive ? null : emp.clerkId)}
                          className={cn(
                            "h-6 px-2.5 rounded-full text-xs font-medium border transition-all",
                            isActive
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                          )}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status filter */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-14 shrink-0">
                  Status
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setFilterStatus(null)}
                    className={cn(
                      "h-6 px-2.5 rounded-full text-xs font-medium border transition-all",
                      filterStatus === null
                        ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                        : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                    )}
                  >
                    All
                  </button>
                  {STATUS_OPTIONS.map((opt) => {
                    const isActive = filterStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setFilterStatus(isActive ? null : opt.value)}
                        className={cn(
                          "h-6 px-2.5 rounded-full text-xs font-medium border transition-all",
                          isActive
                            ? opt.color + " border-current"
                            : "bg-background text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* House filter */}
              {housesInSelection.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-14 shrink-0">
                    House
                  </span>
                  <HouseSearchFilter
                    houses={housesInSelection}
                    value={filterHouse}
                    onChange={setFilterHouse}
                  />
                </div>
              )}
            </div>
          )}

          {/* Assignment list */}
          {assignmentsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : selectedAssignments.length === 0 ? (
            <Card className="border-dashed border-2 bg-background/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <div className="bg-secondary p-3 rounded-full mb-3">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <p className="font-medium text-foreground">No assignments on this day</p>
                <p className="text-sm mt-1">Pick a team member and click Assign</p>
              </CardContent>
            </Card>
          ) : filteredAssignments.length === 0 ? (
            <Card className="border-dashed border-2 bg-background/50">
              <CardContent className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                <p className="font-medium text-foreground">No matches</p>
                <button onClick={() => { setFilterEmployee(null); setFilterStatus(null); setFilterHouse(null); }} className="text-sm underline hover:text-foreground transition-colors mt-1">
                  Clear filters
                </button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {assignmentsByEmployee.map(({ clerkId, name, assignments: empAssignments }) => {
                const fullEmpAssignments = selectedAssignments.filter(
                  (a: any) => a.assignedToClerkId === clerkId
                );
                const initials = name.charAt(0).toUpperCase();
                return (
                  <div key={clerkId ?? "unassigned"}>
                    <div className="flex items-center gap-2 mb-2 px-0.5">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary uppercase text-[10px] font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-semibold text-foreground">{name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {empAssignments.length} job{empAssignments.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="space-y-2 pl-3 border-l-2 border-border/30 ml-3">
                      {empAssignments.map((a: any, filteredIdx: number) => {
                        const fullIdx = fullEmpAssignments.findIndex((fa: any) => fa.id === a.id);
                        const fullPos = fullIdx + 1;
                        const isFirst = filteredIdx === 0;
                        const isLast = filteredIdx === empAssignments.length - 1;
                        const hasIssuePhotos = a.issuePhotoCount > 0;
                        const hasCheckoutPhotos = a.checkoutPhotoCount > 0;
                        const isPending = reorderAssignment.isPending;
                        return (
                          <div key={a.id} className="flex items-center gap-1.5">
                            <div className="flex flex-col items-center shrink-0 self-start mt-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-25"
                                disabled={isFirst || isPending}
                                onClick={() =>
                                  reorderAssignment.mutate(
                                    { id: a.id, data: { newPosition: fullPos - 1 } },
                                    {
                                      onSuccess: () => qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() }),
                                      onError: () => toast.error("Failed to reorder"),
                                    }
                                  )
                                }
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-secondary/80 disabled:opacity-25"
                                disabled={isLast || isPending}
                                onClick={() =>
                                  reorderAssignment.mutate(
                                    { id: a.id, data: { newPosition: fullPos + 1 } },
                                    {
                                      onSuccess: () => qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() }),
                                      onError: () => toast.error("Failed to reorder"),
                                    }
                                  )
                                }
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="flex-1 min-w-0 flex gap-2 items-stretch">
                              <div className="flex-1 min-w-0">
                                {hasIssuePhotos ? (
                                  <div className="flex gap-3 items-stretch">
                                    <div className="flex-[2] min-w-0">
                                      <AssignmentCard assignment={a} bossView onEdit={() => setEditTarget(a)} />
                                    </div>
                                    <div className="flex-[1] min-w-0 bg-[#fafaf9] rounded-xl border border-amber-200 overflow-hidden">
                                      <PhotoStackPanel assignmentId={a.id} />
                                    </div>
                                  </div>
                                ) : (
                                  <AssignmentCard assignment={a} bossView onEdit={() => setEditTarget(a)} />
                                )}
                              </div>
                              {hasCheckoutPhotos && (
                                <div className="shrink-0 self-center">
                                  <CheckoutThumbnail assignmentId={a.id} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {assignTarget && (
        <AssignModal
          user={assignTarget}
          defaultDate={selectedDateStr}
          onClose={() => setAssignTarget(null)}
        />
      )}
      {editTarget && (
        <EditAssignmentModal
          assignment={editTarget}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* Remove employee confirmation */}
      <Dialog open={!!removeConfirmTarget} onOpenChange={(o) => !o && setRemoveConfirmTarget(null)}>
        <DialogContent className="sm:max-w-[380px] bg-[#fafaf9]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserMinus className="h-5 w-5" />
              Remove employee?
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">
                {removeConfirmTarget?.username || removeConfirmTarget?.firstName}
              </span>{" "}
              will lose access to this company immediately. Their past assignments will remain. You can invite them back later with the company invite code.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setRemoveConfirmTarget(null)} disabled={removeEmployee.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeConfirmTarget && handleRemoveEmployee(removeConfirmTarget)}
              disabled={removeEmployee.isPending}
            >
              {removeEmployee.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Removing...</>
              ) : (
                "Remove"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Employee Schedule ───────────────────────────────────────────────── */

function EmployeeSchedule() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekRef, setWeekRef] = useState<Date>(today);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  const { data: todayAssignments, isLoading: todayLoading } = useGetTodayAssignments();
  const { data: allAssignments, isLoading: allLoading } = useListAssignments();

  const isLoading = todayLoading || allLoading;

  const weekDays = useMemo(() => getWeekDays(weekRef), [weekRef]);

  const assignmentsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (allAssignments ?? []).forEach((a: any) => {
      if (!map[a.date]) map[a.date] = [];
      map[a.date].push(a);
    });
    return map;
  }, [allAssignments]);

  const selectedDateStr = toDateString(selectedDate);
  const isTodaySelected = selectedDateStr === toDateString(today);
  const displayAssignments = isTodaySelected
    ? (todayAssignments ?? [])
    : (assignmentsByDate[selectedDateStr] ?? []);

  const formattedSelected = selectedDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const monthLabel = (() => {
    const months = new Set(weekDays.map(d => d.getMonth()));
    if (months.size === 1) {
      return `${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`;
    }
    const [m1, m2] = [...months];
    return `${MONTH_NAMES[m1]} / ${MONTH_NAMES[m2]} ${weekDays[6].getFullYear()}`;
  })();

  const prevWeek = () => {
    const d = new Date(weekRef); d.setDate(d.getDate() - 7); setWeekRef(d);
  };
  const nextWeek = () => {
    const d = new Date(weekRef); d.setDate(d.getDate() + 7); setWeekRef(d);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Schedule</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your assignments for the week</p>
      </div>

      {/* Week calendar */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">{monthLabel}</span>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {weekDays.map((day, i) => {
            const ds = toDateString(day);
            const isToday = ds === toDateString(today);
            const isSelected = ds === selectedDateStr;
            const count = (assignmentsByDate[ds] ?? []).length;
            return (
              <button
                key={ds}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 transition-all text-sm font-medium",
                  isSelected
                    ? "border-primary bg-primary text-white shadow-md"
                    : isToday
                    ? "border-primary/40 bg-primary/5 text-primary"
                    : "border-transparent bg-secondary hover:border-border text-foreground"
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                  {DAY_SHORT[i]}
                </span>
                <span className="text-base font-bold">{day.getDate()}</span>
                {count > 0 ? (
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                    isSelected ? "bg-white/25 text-white" : "bg-primary/15 text-primary"
                  )}>
                    {count}
                  </span>
                ) : (
                  <span className="h-4" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div>
          <h2 className="text-sm font-semibold">{formattedSelected}</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          {displayAssignments.length} {displayAssignments.length === 1 ? "job" : "jobs"}
        </Badge>
      </div>

      {/* Assignment list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : displayAssignments.length === 0 ? (
        <Card className="border-dashed border-2 bg-background/50">
          <CardContent className="flex flex-col items-center justify-center py-14 text-center text-muted-foreground">
            <div className="bg-secondary p-4 rounded-full mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <p className="font-medium text-foreground text-lg">No assignments</p>
            <p className="text-sm mt-1">
              {isTodaySelected ? "Enjoy your free day!" : "Nothing scheduled for this day"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayAssignments.map((a: any) => (
            <AssignmentCard key={a.id} assignment={a} onClick={() => setSelectedAssignment(a)} />
          ))}
        </div>
      )}

      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  );
}

/* ── Assignment Card ─────────────────────────────────────────────────── */

function AssignmentCard({
  assignment,
  showAssignee = false,
  bossView = false,
  onEdit,
  onClick,
}: {
  assignment: any;
  showAssignee?: boolean;
  bossView?: boolean;
  onEdit?: () => void;
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 transition-shadow",
        onClick ? "cursor-pointer hover:shadow-md hover:border-primary/30" : "hover:shadow-sm"
      )}
      onClick={onClick}
    >
      <div className="flex">
        <div
          className={cn(
            "w-1.5 flex-shrink-0",
            assignment.status === "completed"
              ? "bg-green-500"
              : assignment.status === "in_progress"
              ? "bg-blue-500"
              : "bg-amber-500"
          )}
        />
        <CardContent className={cn("flex-1 flex flex-col sm:flex-row gap-3 justify-between", bossView ? "p-3" : "p-4 gap-4")}>
          <div className={cn("flex-1 min-w-0", bossView ? "space-y-1.5" : "space-y-2")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className={cn(
                  "leading-tight truncate",
                  bossView ? "font-bold text-lg" : "font-semibold text-base"
                )}>
                  {assignment.houseName}
                </h3>
                {assignment.timeSlot && (
                  <div className={cn(
                    "flex items-center gap-1 mt-0.5",
                    bossView ? "text-muted-foreground/70 text-xs" : "text-muted-foreground text-sm mt-1"
                  )}>
                    <Clock className={bossView ? "h-3 w-3 flex-shrink-0" : "h-3.5 w-3.5 flex-shrink-0"} />
                    <span className="truncate">{assignment.timeSlot}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {assignment.priority === "high" && (
                  <Badge variant="destructive" className="h-5 px-1.5 py-0 text-[10px] uppercase">
                    High
                  </Badge>
                )}
                {onEdit && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {showAssignee && !bossView && assignment.assignedToUsername && (
              <div className="text-xs font-medium text-primary bg-primary/5 inline-flex items-center px-2 py-0.5 rounded-sm">
                {assignment.assignedToUsername}
              </div>
            )}

            {(assignment.guestCount > 0 || assignment.notes) && (
              <div className={cn(
                "rounded-md space-y-1",
                bossView ? "bg-secondary/30 px-2 py-1.5" : "text-sm bg-secondary/50 p-2"
              )}>
                {assignment.guestCount > 0 && (
                  <div className={cn(
                    "flex items-center gap-1.5",
                    bossView ? "text-muted-foreground text-xs" : "text-foreground/80 font-medium"
                  )}>
                    <Users className={bossView ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    {assignment.guestCount} guests
                  </div>
                )}
                {assignment.notes && (
                  <p className={cn("text-muted-foreground", bossView ? "text-[11px]" : "text-xs")}>{assignment.notes}</p>
                )}
              </div>
            )}

            {(bossView || showAssignee) && assignment.completionNotes && (
              <div className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-2 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Completion Notes</p>
                <p className="text-xs text-foreground/80">{assignment.completionNotes}</p>
              </div>
            )}
            {(bossView || showAssignee) && assignment.issuePhotoCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
                <TriangleAlert className="h-3 w-3 shrink-0" />
                <span className="text-[10px] font-semibold">{assignment.issuePhotoCount} issue {assignment.issuePhotoCount === 1 ? "photo" : "photos"}</span>
              </div>
            )}
            {assignment.checkoutStatus === "pending_checkout" && (
              <div className="flex items-center gap-1.5 rounded-md px-2 py-1 border" style={{ background: "#fef2f2", color: "#991b1b", borderColor: "#fca5a5" }}>
                <TriangleAlert className="h-3 w-3 shrink-0" />
                <span className="text-[10px] font-semibold">Photos missing</span>
              </div>
            )}
          </div>

          <div className="flex items-center sm:items-end justify-between sm:flex-col gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "capitalize text-[10px]",
                assignment.status === "completed" &&
                  "border-green-500 text-green-600 bg-green-50",
                assignment.status === "in_progress" &&
                  "border-blue-500 text-blue-600 bg-blue-50",
                assignment.status === "pending" &&
                  "border-amber-500 text-amber-600 bg-amber-50"
              )}
            >
              {assignment.status === "pending" ? "assigned" : assignment.status.replace("_", " ")}
            </Badge>

            {assignment.startedAt && (
              <div className="text-[10px] text-muted-foreground text-right space-y-0.5">
                <div className="flex items-center gap-1 justify-end">
                  <PlayCircle className="h-2.5 w-2.5 text-blue-500" />
                  <span>{formatTime(assignment.startedAt)}</span>
                </div>
                {assignment.finishedAt && (
                  <>
                    <div className="flex items-center gap-1 justify-end">
                      <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                      <span>{formatTime(assignment.finishedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end font-medium text-foreground/70">
                      <Timer className="h-2.5 w-2.5" />
                      <span>{formatDuration(Math.floor((new Date(assignment.finishedAt).getTime() - new Date(assignment.startedAt).getTime()) / 1000))}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

/* ── Issue Photo Hooks & Section ────────────────────────────────────── */

function useIssuePhotos(assignmentId: number) {
  return useQuery({
    queryKey: ["issue-photos", assignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${assignmentId}/issue-photos`);
      if (!res.ok) throw new Error("Failed to fetch photos");
      return res.json() as Promise<Array<{
        id: number; assignmentId: number; objectPath: string;
        description: string | null; uploadedByClerkId: string;
        uploadedAt: string; expiresAt: string;
      }>>;
    },
    staleTime: 30_000,
  });
}

function useCheckoutPhotos(assignmentId: number) {
  return useQuery({
    queryKey: ["checkout-photos", assignmentId],
    queryFn: async () => {
      const res = await fetch(`/api/assignments/${assignmentId}/checkout-photos`);
      if (!res.ok) throw new Error("Failed to fetch checkout photos");
      return res.json() as Promise<Array<{
        id: number; assignmentId: number; objectPath: string;
        uploadedByClerkId: string; uploadedAt: string; expiresAt: string;
      }>>;
    },
    staleTime: 30_000,
  });
}

/* ── Photo Stack Panel (schedule page, boss view) ───────────────────── */

function PhotoStackPanel({ assignmentId }: { assignmentId: number }) {
  const { data: photos = [], refetch, isLoading } = useIssuePhotos(assignmentId);
  const qc = useQueryClient();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const deletePhoto = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await fetch(`/api/assignments/${assignmentId}/issue-photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
    },
  });

  const safeIdx = Math.min(activeIdx, Math.max(0, photos.length - 1));
  const currentPhoto = photos[safeIdx] ?? null;

  const STACK_ROTATIONS = [-5, 3, -2];

  const handleDownload = async (photo: typeof currentPhoto) => {
    if (!photo) return;
    try {
      const res = await fetch(objectPathToUrl(photo.objectPath));
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = photo.objectPath.split("/").pop() ?? "issue-photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <>
      <button
        onClick={() => { setActiveIdx(0); setGalleryOpen(true); }}
        className="h-full w-full flex flex-col items-center justify-center gap-2.5 px-3 py-4 hover:bg-amber-50/60 transition-colors"
        disabled={isLoading || photos.length === 0}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
        ) : photos.length === 0 ? (
          <p className="text-xs text-muted-foreground">No photos</p>
        ) : (
          <>
            <div className="relative" style={{ width: 72, height: 72 }}>
              {photos.slice(0, 3).map((p, i) => (
                <img
                  key={p.id}
                  src={objectPathToUrl(p.objectPath)}
                  alt="Issue photo"
                  className="absolute inset-0 w-full h-full object-cover rounded-lg border-2 border-white shadow-md"
                  style={{
                    transform: `rotate(${STACK_ROTATIONS[i] ?? 0}deg)`,
                    zIndex: 3 - i,
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
              {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">click to view</span>
          </>
        )}
      </button>

      <Dialog open={galleryOpen} onOpenChange={(o) => { if (!o) setGalleryOpen(false); }}>
        <DialogContent className="sm:max-w-[560px] bg-[#fafaf9]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-amber-500" />
              Issue Photos
              {photos.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {safeIdx + 1} / {photos.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Browse issue photos for this assignment</DialogDescription>
          </DialogHeader>

          {currentPhoto && (
            <div className="space-y-3">
              <div className="relative aspect-video bg-black/90 rounded-xl overflow-hidden">
                <img
                  src={objectPathToUrl(currentPhoto.objectPath)}
                  alt="Issue photo"
                  className="w-full h-full object-contain"
                />
              </div>

              {currentPhoto.description && (
                <p className="text-sm text-foreground/80 leading-snug">{currentPhoto.description}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(currentPhoto.uploadedAt).toLocaleDateString([], {
                  month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>

              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="icon"
                    onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                    disabled={safeIdx === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="icon"
                    onClick={() => setActiveIdx(i => Math.min(photos.length - 1, i + 1))}
                    disabled={safeIdx === photos.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="sm"
                    className="gap-1.5"
                    onClick={() => handleDownload(currentPhoto)}
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      const newIdx = Math.max(0, safeIdx - 1);
                      deletePhoto.mutate(currentPhoto.id, {
                        onSuccess: () => setActiveIdx(newIdx),
                      });
                    }}
                    disabled={deletePhoto.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        "shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                        safeIdx === i ? "border-amber-500 opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                      )}
                    >
                      <img src={objectPathToUrl(p.objectPath)} alt="" className="h-14 w-14 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {photos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">All photos have been deleted.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Checkout Stack Panel (boss view) ───────────────────────────────── */

function CheckoutStackPanel({ assignmentId }: { assignmentId: number }) {
  const { data: photos = [], isLoading } = useCheckoutPhotos(assignmentId);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const safeIdx = Math.min(activeIdx, Math.max(0, photos.length - 1));
  const currentPhoto = photos[safeIdx] ?? null;

  const STACK_ROTATIONS = [-5, 3, -2];

  const handleDownload = async (photo: typeof currentPhoto) => {
    if (!photo) return;
    try {
      const res = await fetch(objectPathToUrl(photo.objectPath));
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = photo.objectPath.split("/").pop() ?? "checkout-photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Download failed");
    }
  };

  return (
    <>
      <button
        onClick={() => { setActiveIdx(0); setGalleryOpen(true); }}
        className="h-full w-full flex flex-col items-center justify-center gap-2.5 px-3 py-4 hover:bg-emerald-50/60 transition-colors"
        disabled={isLoading || photos.length === 0}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        ) : photos.length === 0 ? (
          <p className="text-xs text-muted-foreground">No photos</p>
        ) : (
          <>
            <div className="relative" style={{ width: 72, height: 72 }}>
              {photos.slice(0, 3).map((p, i) => (
                <img
                  key={p.id}
                  src={objectPathToUrl(p.objectPath)}
                  alt="Checkout photo"
                  className="absolute inset-0 w-full h-full object-cover rounded-lg border-2 border-white shadow-md"
                  style={{
                    transform: `rotate(${STACK_ROTATIONS[i] ?? 0}deg)`,
                    zIndex: 3 - i,
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
              {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </span>
            <span className="text-[10px] text-muted-foreground leading-none">click to view</span>
          </>
        )}
      </button>

      <Dialog open={galleryOpen} onOpenChange={(o) => { if (!o) setGalleryOpen(false); }}>
        <DialogContent className="sm:max-w-[560px] bg-[#fafaf9]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-600" />
              Checkout Photos
              {photos.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {safeIdx + 1} / {photos.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Browse checkout photos for this assignment</DialogDescription>
          </DialogHeader>

          {currentPhoto && (
            <div className="space-y-3">
              <div className="relative aspect-video bg-black/90 rounded-xl overflow-hidden">
                <img
                  src={objectPathToUrl(currentPhoto.objectPath)}
                  alt="Checkout photo"
                  className="w-full h-full object-contain"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {new Date(currentPhoto.uploadedAt).toLocaleDateString([], {
                  month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>

              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                  <Button
                    variant="outline" size="icon"
                    onClick={() => setActiveIdx(i => Math.max(0, i - 1))}
                    disabled={safeIdx === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline" size="icon"
                    onClick={() => setActiveIdx(i => Math.min(photos.length - 1, i + 1))}
                    disabled={safeIdx === photos.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline" size="sm"
                  className="gap-1.5"
                  onClick={() => handleDownload(currentPhoto)}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        "shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                        safeIdx === i ? "border-emerald-500 opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                      )}
                    >
                      <img src={objectPathToUrl(p.objectPath)} alt="" className="h-14 w-14 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {photos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No checkout photos.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Checkout Thumbnail (boss view compact) ─────────────────────────── */

function CheckoutThumbnail({ assignmentId }: { assignmentId: number }) {
  const { data: photos = [], isLoading } = useCheckoutPhotos(assignmentId);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const safeIdx = Math.min(activeIdx, Math.max(0, photos.length - 1));
  const currentPhoto = photos[safeIdx] ?? null;

  const handleDownload = async (photo: typeof currentPhoto) => {
    if (!photo) return;
    try {
      const res = await fetch(objectPathToUrl(photo.objectPath));
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = photo.objectPath.split("/").pop() ?? "checkout-photo.jpg";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("Download failed");
    }
  };

  if (isLoading) return <div className="w-14 h-14 rounded-lg bg-secondary/50 animate-pulse shrink-0" />;
  if (photos.length === 0) return null;

  return (
    <>
      <button
        onClick={() => { setActiveIdx(0); setGalleryOpen(true); }}
        className="relative shrink-0 rounded-lg overflow-hidden border border-emerald-200 hover:border-emerald-400 transition-colors shadow-sm"
        style={{ width: 56, height: 56 }}
        title={`${photos.length} checkout ${photos.length === 1 ? "photo" : "photos"}`}
      >
        <img
          src={objectPathToUrl(photos[0].objectPath)}
          alt="Checkout photo"
          className="w-full h-full object-cover"
        />
        {photos.length > 1 && (
          <span className="absolute bottom-0.5 right-0.5 bg-black/65 text-white text-[9px] font-bold rounded px-1 leading-[14px]">
            {photos.length}
          </span>
        )}
      </button>

      <Dialog open={galleryOpen} onOpenChange={(o) => { if (!o) setGalleryOpen(false); }}>
        <DialogContent className="sm:max-w-[560px] bg-[#fafaf9]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-600" />
              Checkout Photos
              {photos.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {safeIdx + 1} / {photos.length}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">Browse checkout photos for this assignment</DialogDescription>
          </DialogHeader>
          {currentPhoto && (
            <div className="space-y-3">
              <div className="relative aspect-video bg-black/90 rounded-xl overflow-hidden">
                <img src={objectPathToUrl(currentPhoto.objectPath)} alt="Checkout photo" className="w-full h-full object-contain" />
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(currentPhoto.uploadedAt).toLocaleDateString([], { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => setActiveIdx(i => Math.max(0, i - 1))} disabled={safeIdx === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => setActiveIdx(i => Math.min(photos.length - 1, i + 1))} disabled={safeIdx === photos.length - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleDownload(currentPhoto)}>
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 pt-1">
                  {photos.map((p, i) => (
                    <button
                      key={p.id}
                      onClick={() => setActiveIdx(i)}
                      className={cn(
                        "shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                        safeIdx === i ? "border-emerald-500 opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                      )}
                    >
                      <img src={objectPathToUrl(p.objectPath)} alt="" className="h-14 w-14 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {photos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No checkout photos.</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function IssuePhotoSection({
  assignmentId,
  myClerkId,
  readOnly = false,
  onCountChange,
}: {
  assignmentId: number;
  myClerkId?: string;
  readOnly?: boolean;
  onCountChange?: (delta: number) => void;
}) {
  const { data: photos = [], refetch, isLoading } = useIssuePhotos(assignmentId);
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingDesc, setPendingDesc] = useState("");
  const [uploading, setUploading] = useState(false);
  const [batchUploading, setBatchUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [lightbox, setLightbox] = useState<string | null>(null);

  const addPhoto = useMutation({
    mutationFn: async ({ objectPath, description }: { objectPath: string; description: string }) => {
      const res = await fetch(`/api/assignments/${assignmentId}/issue-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath, description: description.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Failed to save photo");
      return res.json();
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
      onCountChange?.(1);
    },
  });

  const deletePhoto = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await fetch(`/api/assignments/${assignmentId}/issue-photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: () => {
      refetch();
      qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
      onCountChange?.(-1);
    },
  });

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    if (files.length === 1) {
      setPendingFile(files[0]);
    } else {
      handleBatchUpload(files);
    }
  };

  const handleBatchUpload = async (files: File[]) => {
    setBatchUploading(true);
    setBatchProgress({ done: 0, total: files.length });

    const uploadOne = async (file: File) => {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error(`Failed to get upload URL for ${file.name}`);
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed for ${file.name}`);

      const saveRes = await fetch(`/api/assignments/${assignmentId}/issue-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath }),
      });
      if (!saveRes.ok) throw new Error(`Failed to save photo record for ${file.name}`);

      setBatchProgress((p) => ({ ...p, done: p.done + 1 }));
      onCountChange?.(1);
    };

    try {
      await Promise.all(files.map(uploadOne));
      toast.success(`${files.length} photos uploaded`);
    } catch (err: any) {
      toast.error(err.message ?? "Some uploads failed");
    } finally {
      await refetch();
      qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
      setBatchUploading(false);
      setBatchProgress({ done: 0, total: 0 });
    }
  };

  const handleSubmitPhoto = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pendingFile.name, size: pendingFile.size, contentType: pendingFile.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": pendingFile.type },
        body: pendingFile,
      });
      if (!uploadRes.ok) throw new Error("Upload to storage failed");

      await addPhoto.mutateAsync({ objectPath, description: pendingDesc });
      setPendingFile(null);
      setPendingDesc("");
      toast.success("Photo submitted");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
          <TriangleAlert className="h-4 w-4" />
          Issue Photos
          {photos.length > 0 && <span className="bg-amber-200 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{photos.length}</span>}
        </h4>
        {!readOnly && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelected} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={batchUploading || uploading}
              className="flex items-center gap-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 active:bg-amber-300 px-3 py-2 rounded-lg transition-colors touch-manipulation disabled:opacity-50 disabled:pointer-events-none"
            >
              {batchUploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{batchProgress.done}/{batchProgress.total}</>
              ) : (
                <><ImagePlus className="h-4 w-4" />Add Photo</>
              )}
            </button>
          </>
        )}
      </div>

      {pendingFile && !readOnly && (
        <div className="mb-3 bg-white border border-amber-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <img
              src={URL.createObjectURL(pendingFile)}
              alt="Preview"
              className="h-16 w-16 object-cover rounded-md border border-border"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{pendingFile.name}</p>
              <p className="text-[10px] text-muted-foreground">{(pendingFile.size / 1024).toFixed(0)} KB</p>
            </div>
            <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder="Short description (optional)..."
            value={pendingDesc}
            onChange={(e) => setPendingDesc(e.target.value)}
            className="w-full text-sm border border-border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-amber-400/50"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => { setPendingFile(null); setPendingDesc(""); }} disabled={uploading}>Cancel</Button>
            <Button size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 text-white gap-1.5" onClick={handleSubmitPhoto} disabled={uploading}>
              {uploading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Uploading...</> : "Submit"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-xs text-muted-foreground text-center py-2">Loading photos…</div>
      ) : photos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          {readOnly ? "No issue photos reported." : "No photos yet. Tap 'Add Photo' to report a problem."}
        </p>
      ) : (
        <div className="space-y-2">
          {photos.map((p) => (
            <div key={p.id} className="flex items-start gap-2.5 bg-white border border-border/60 rounded-lg p-2">
              <button onClick={() => setLightbox(objectPathToUrl(p.objectPath))} className="shrink-0">
                <img
                  src={objectPathToUrl(p.objectPath)}
                  alt="Issue photo"
                  className="h-14 w-14 object-cover rounded-md border border-border hover:opacity-80 transition-opacity"
                />
              </button>
              <div className="flex-1 min-w-0">
                {p.description && <p className="text-xs text-foreground/80 leading-snug">{p.description}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(p.uploadedAt).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {(readOnly || p.uploadedByClerkId === myClerkId) && (
                <button
                  onClick={() => deletePhoto.mutate(p.id)}
                  disabled={deletePhoto.isPending}
                  className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Issue photo" className="max-w-full max-h-full object-contain rounded-lg" />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-1.5">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Checkout Photo Section ──────────────────────────────────────────── */

function CheckoutPhotoSection({
  assignmentId,
  myClerkId,
  onCountUpdated,
}: {
  assignmentId: number;
  myClerkId?: string;
  onCountUpdated?: (count: number) => void;
}) {
  const { data: photos = [], refetch, isLoading } = useCheckoutPhotos(assignmentId);
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ done: 0, total: 0 });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const deletePhoto = useMutation({
    mutationFn: async (photoId: number) => {
      const res = await fetch(`/api/assignments/${assignmentId}/checkout-photos/${photoId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete photo");
    },
    onSuccess: async () => {
      const updated = await refetch();
      const newCount = updated.data?.length ?? 0;
      qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
      onCountUpdated?.(newCount);
    },
    onError: () => toast.error("Failed to delete photo"),
  });

  const count = photos.length;
  const reached = count >= CHECKOUT_MIN;
  const progressPct = Math.min(100, (count / CHECKOUT_MIN) * 100);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    handleBatchUpload(files);
  };

  const handleBatchUpload = async (files: File[]) => {
    setUploading(true);
    setBatchProgress({ done: 0, total: files.length });

    const uploadOne = async (file: File) => {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!urlRes.ok) throw new Error(`Failed to get upload URL for ${file.name}`);
      const { uploadURL, objectPath } = await urlRes.json();

      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error(`Upload failed for ${file.name}`);

      const saveRes = await fetch(`/api/assignments/${assignmentId}/checkout-photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath }),
      });
      if (!saveRes.ok) {
        const errBody = await saveRes.json().catch(() => ({}));
        throw new Error((errBody as any).error ?? `Failed to save photo for ${file.name}`);
      }
      setBatchProgress((p) => ({ ...p, done: p.done + 1 }));
    };

    try {
      await Promise.all(files.map(uploadOne));
      toast.success(`${files.length} ${files.length === 1 ? "photo" : "photos"} uploaded`);
    } catch (err: any) {
      toast.error(err.message ?? "Some uploads failed");
    } finally {
      const updated = await refetch();
      const newCount = updated.data?.length ?? 0;
      qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
      qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
      onCountUpdated?.(newCount);
      setUploading(false);
      setBatchProgress({ done: 0, total: 0 });
    }
  };

  return (
    <div className="overflow-x-hidden">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
          <Camera className="h-4 w-4" />
          Checkout Photos
          {count > 0 && (
            <span className="bg-emerald-200 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </h4>
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 active:bg-emerald-300 px-3 py-2 rounded-lg transition-colors touch-manipulation disabled:opacity-50 disabled:pointer-events-none"
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" />{batchProgress.done}/{batchProgress.total}</>
            ) : (
              <><ImagePlus className="h-4 w-4" />Add Photos</>
            )}
          </button>
        </>
      </div>

      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className={cn("font-medium", reached ? "text-emerald-700" : "text-emerald-600")}>
            {reached ? "Minimum reached — you can close this job" : `${count} of ${CHECKOUT_MIN} required`}
          </span>
          {!reached && (
            <span className="text-emerald-500/80">{CHECKOUT_MIN - count} more needed</span>
          )}
        </div>
        <div className="h-1.5 bg-emerald-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              reached ? "bg-emerald-500" : "bg-emerald-400"
            )}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        {!reached && (
          <p className="text-[11px] text-emerald-600/70 leading-snug">
            Suggested areas: Kitchen · Bathrooms · Bedrooms · Living areas
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="text-xs text-muted-foreground text-center py-2">Loading photos…</div>
      ) : count === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-2">
          No photos yet. Photograph the main areas of the property.
        </p>
      ) : (
        <div style={{ width: "100%", overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", overflowX: "auto", overflowY: "hidden", width: "100%", paddingBottom: "4px", gap: "8px" }}>
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => setLightboxIndex(i)}
                style={{ width: "56px", height: "56px", flexShrink: 0, borderRadius: "8px", overflow: "hidden" }}
                className="border border-emerald-200 bg-emerald-50 hover:opacity-90 active:opacity-75 transition-opacity touch-manipulation"
              >
                <img
                  src={objectPathToUrl(p.objectPath)}
                  alt={`Checkout photo ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {lightboxIndex !== null && ReactDOM.createPortal(
        <>
          {/* layer 1 — background, the ONLY element with a close handler */}
          <div
            className="fixed inset-0 bg-black"
            style={{ zIndex: 99999 }}
            onClick={() => setLightboxIndex(null)}
          />

          {/* layer 2 — UI controls, sits above background, pointer-events-none at
              root so gaps between controls fall through to the background close handler */}
          <div
            className="fixed inset-0 flex flex-col pointer-events-none"
            style={{ zIndex: 100000 }}
          >
            {/* top bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0 pointer-events-auto">
              <span className="text-white/70 text-sm font-medium">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <div className="flex items-center gap-3">
                {photos[lightboxIndex]?.uploadedByClerkId === myClerkId && (
                  <button
                    onClick={() => {
                      const id = photos[lightboxIndex]!.id;
                      const nextIndex = lightboxIndex > 0 ? lightboxIndex - 1 : photos.length > 1 ? 0 : null;
                      deletePhoto.mutate(id, {
                        onSuccess: () => setLightboxIndex(photos.length - 1 === 0 ? null : nextIndex),
                      });
                    }}
                    disabled={deletePhoto.isPending}
                    className="text-white/70 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => setLightboxIndex(null)}
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* photo — pointer-events-none so tapping the photo/gap falls through to background */}
            <div className="flex-1 flex items-center justify-center px-4 min-h-0">
              <img
                src={objectPathToUrl(photos[lightboxIndex]!.objectPath)}
                alt={`Checkout photo ${lightboxIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
                style={{ maxHeight: "calc(100vh - 120px)" }}
              />
            </div>

            {/* bottom nav */}
            <div className="flex items-center justify-between px-4 pb-8 pt-3 shrink-0 pointer-events-auto">
              <button
                onClick={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                disabled={lightboxIndex === 0}
                className="flex items-center gap-1.5 text-white bg-white/15 hover:bg-white/25 active:bg-white/35 px-4 py-2.5 rounded-full transition-colors disabled:opacity-25 touch-manipulation"
              >
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Prev</span>
              </button>
              <button
                onClick={() => setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))}
                disabled={lightboxIndex === photos.length - 1}
                className="flex items-center gap-1.5 text-white bg-white/15 hover:bg-white/25 active:bg-white/35 px-4 py-2.5 rounded-full transition-colors disabled:opacity-25 touch-manipulation"
              >
                <span className="text-sm font-medium">Next</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

/* ── Assign Modal ────────────────────────────────────────────────────── */

function AssignModal({ user, defaultDate, onClose }: { user: any; defaultDate: string; onClose: () => void }) {
  const { data: houses } = useListHouses();
  const createAssignment = useCreateAssignment();
  const qc = useQueryClient();

  const [houseId, setHouseId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [timeSlot, setTimeSlot] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseId || guestCount === "") return;
    createAssignment.mutate(
      { data: { houseId: parseInt(houseId, 10), assignedToClerkId: user.clerkId, date: date || undefined, timeSlot: timeSlot || undefined, guestCount: parseInt(guestCount, 10), status: "pending", priority, notes: notes || undefined } },
      {
        onSuccess: () => {
          toast.success("Assignment created");
          qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
          qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          onClose();
        },
        onError: () => toast.error("Failed to create assignment"),
      }
    );
  };

  const displayName = user.username || user.firstName || "Employee";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] bg-[#fafaf9]">
        <DialogHeader>
          <DialogTitle>Assign Property</DialogTitle>
          <DialogDescription>
            Scheduling work for <span className="font-semibold text-foreground">{displayName}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Property *</Label>
            <HousePickerInput
              houses={houses ?? []}
              value={houseId}
              onChange={setHouseId}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Input placeholder="e.g. 9:00 – 11:00 AM" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Guests Today *</Label>
              <Input type="number" min="0" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Maintenance</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea placeholder="Any specific instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createAssignment.isPending || !houseId || guestCount === ""}>
              {createAssignment.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Assign Property"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ── Edit Assignment Modal ───────────────────────────────────────────── */

function EditAssignmentModal({ assignment, onClose }: { assignment: any; onClose: () => void }) {
  const { data: houses } = useListHouses();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();
  const qc = useQueryClient();

  const [houseId, setHouseId] = useState(String(assignment.houseId));
  const [date, setDate] = useState(assignment.date || "");
  const [timeSlot, setTimeSlot] = useState(assignment.timeSlot || "");
  const [guestCount, setGuestCount] = useState(assignment.guestCount != null ? String(assignment.guestCount) : "");
  const [priority, setPriority] = useState<"low" | "normal" | "high">(assignment.priority || "normal");
  const [status, setStatus] = useState<"pending" | "in_progress" | "completed">(assignment.status || "pending");
  const [notes, setNotes] = useState(assignment.notes || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
    qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseId || guestCount === "") return;
    updateAssignment.mutate(
      { id: assignment.id, data: { houseId: parseInt(houseId, 10), date: date || undefined, timeSlot: timeSlot || undefined, guestCount: parseInt(guestCount, 10), status, priority, notes: notes || undefined } },
      { onSuccess: () => { toast.success("Assignment updated"); invalidate(); onClose(); }, onError: () => toast.error("Failed to update assignment") }
    );
  };

  const handleDelete = () => {
    deleteAssignment.mutate({ id: assignment.id }, {
      onSuccess: () => { toast.success("Assignment deleted"); invalidate(); onClose(); },
      onError: () => toast.error("Failed to delete assignment"),
    });
  };

  const isBusy = updateAssignment.isPending || deleteAssignment.isPending;

  const formBody = (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label>Property *</Label>
        <HousePickerInput
          houses={houses ?? []}
          value={houseId}
          onChange={setHouseId}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Time Slot</Label>
          <Input placeholder="e.g. 9:00 – 11:00 AM" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Guests Today *</Label>
          <Input type="number" min="0" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Notes (optional)</Label>
        <Textarea placeholder="Any specific instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} className="resize-none" />
      </div>
      {assignment.completionNotes && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Completion Notes from Employee</p>
          <p className="text-sm text-foreground/80">{assignment.completionNotes}</p>
        </div>
      )}
      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)} disabled={isBusy}>
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button type="submit" disabled={isBusy || !houseId || guestCount === ""}>
            {updateAssignment.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );

  const deleteConfirmDialog = (
    <Dialog open={showDeleteConfirm} onOpenChange={(o) => !o && setShowDeleteConfirm(false)}>
      <DialogContent className="sm:max-w-[360px] bg-[#fafaf9]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Delete assignment?
          </DialogTitle>
          <DialogDescription>
            This will permanently remove the assignment for{" "}
            <span className="font-semibold text-foreground">{assignment.houseName}</span>. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleteAssignment.isPending}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteAssignment.isPending}>
            {deleteAssignment.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Yes, delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[440px] bg-[#fafaf9]">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{assignment.houseName}</span>
              {assignment.assignedToUsername && <> &mdash; {assignment.assignedToUsername}</>}
            </DialogDescription>
          </DialogHeader>
          {formBody}
        </DialogContent>
      </Dialog>
      {deleteConfirmDialog}
    </>
  );
}

/* ── Assignment Detail Modal (employee) ─────────────────────────────── */

function useLiveElapsed(startedAt: string | null, finishedAt: string | null) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (!startedAt || finishedAt) {
      clearInterval(intervalRef.current);
      if (startedAt && finishedAt) {
        setElapsed(Math.floor((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000));
      }
      return;
    }
    const tick = () => setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [startedAt, finishedAt]);

  return elapsed;
}

function AssignmentDetailModal({ assignment: initialAssignment, onClose }: { assignment: any; onClose: () => void }) {
  const [assignment, setAssignment] = useState(initialAssignment);
  const { data: house, isLoading } = useGetHouse(assignment.houseId, {
    query: { enabled: !!assignment.houseId, queryKey: getGetHouseQueryKey(assignment.houseId) },
  });
  const updateNotes = useUpdateHouseNotes();
  const startCleaning = useStartCleaning();
  const finishCleaning = useFinishCleaning();
  const patchTiming = usePatchAssignmentTiming();
  const qc = useQueryClient();
  const [notesValue, setNotesValue] = useState("");
  const [editingField, setEditingField] = useState<"startedAt" | "finishedAt" | null>(null);
  const [editTimeValue, setEditTimeValue] = useState("");
  const [showFinishNotes, setShowFinishNotes] = useState(false);
  const [completionNotesInput, setCompletionNotesInput] = useState("");
  const issuePhotoRef = useRef<HTMLDivElement>(null);
  const checkoutPhotoRef = useRef<HTMLDivElement>(null);
  const [localCheckoutCount, setLocalCheckoutCount] = useState<number>(
    assignment.checkoutPhotoCount ?? 0
  );

  const elapsed = useLiveElapsed(assignment.startedAt ?? null, assignment.finishedAt ?? null);

  useEffect(() => {
    if (house?.notes != null) setNotesValue(house.notes);
  }, [house?.notes]);

  const handleStart = () => {
    startCleaning.mutate({ id: assignment.id }, {
      onSuccess: (data) => {
        setAssignment(data);
        qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
        qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
        setTimeout(() => issuePhotoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 150);
      },
      onError: () => toast.error("Failed to start cleaning"),
    });
  };

  const handleFinish = (notes: string) => {
    finishCleaning.mutate({ id: assignment.id, data: { completionNotes: notes.trim() || null } }, {
      onSuccess: (data) => {
        setAssignment(data);
        setShowFinishNotes(false);
        setCompletionNotesInput("");
        qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
        qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
        setTimeout(() => checkoutPhotoRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 200);
      },
      onError: () => toast.error("Failed to finish cleaning"),
    });
  };

  const applyTimingPatch = (data: { startedAt?: string | null; finishedAt?: string | null }) => {
    patchTiming.mutate({ id: assignment.id, data }, {
      onSuccess: (updated) => { setAssignment(updated); setEditingField(null); qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() }); qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() }); },
      onError: () => toast.error("Failed to update time"),
    });
  };

  const openEdit = (field: "startedAt" | "finishedAt") => {
    const iso = field === "startedAt" ? assignment.startedAt : assignment.finishedAt;
    setEditTimeValue(iso ? toTimeInputValue(iso) : toTimeInputValue(new Date().toISOString()));
    setEditingField(field);
  };

  const handleSaveEdit = () => {
    if (!editingField || !editTimeValue) return;
    const originalIso = editingField === "startedAt" ? assignment.startedAt : assignment.finishedAt;
    applyTimingPatch({ [editingField]: buildIsoFromTimeInput(originalIso ?? new Date().toISOString(), editTimeValue) });
  };

  const handleSaveNotes = () => {
    updateNotes.mutate({ id: assignment.houseId, data: { notes: notesValue } }, {
      onSuccess: () => { toast.success("Notes saved"); qc.setQueryData(getGetHouseQueryKey(assignment.houseId), (old: any) => old ? { ...old, notes: notesValue } : old); },
      onError: () => toast.error("Failed to save notes"),
    });
  };

  const notStarted = !assignment.startedAt;
  const inProgress = assignment.startedAt && !assignment.finishedAt;
  const done = assignment.startedAt && assignment.finishedAt;
  const priorityColor =
    assignment.priority === "high" ? "text-red-600 bg-red-50 border-red-200"
    : assignment.priority === "low" ? "text-muted-foreground bg-secondary border-border"
    : "text-amber-600 bg-amber-50 border-amber-200";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[580px] p-0 bg-[#fafaf9] max-h-[90dvh] overflow-y-auto overflow-x-hidden">
        {isLoading || !house ? (
          <div className="p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="sr-only">Loading assignment details</DialogTitle>
              <DialogDescription className="sr-only">Please wait while the assignment details load.</DialogDescription>
            </DialogHeader>
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-[200px] w-full mt-4" />
          </div>
        ) : (
          <>
            <div className="bg-primary/5 p-6 border-b border-border">
              <DialogHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-2xl font-bold text-foreground mb-1">{house.name}</DialogTitle>
                    <DialogDescription className="text-foreground/60 flex items-center gap-2 flex-wrap">
                      {assignment.timeSlot && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{assignment.timeSlot}</span>}
                      {assignment.guestCount > 0 && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{assignment.guestCount} guests</span>}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant="outline" className={cn("capitalize text-xs px-2.5 py-1 font-medium", priorityColor)}>
                      {assignment.priority} priority
                    </Badge>
                    {house.mapLink && (
                      <button type="button" onClick={() => window.open(house.mapLink!, "_blank")}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap">
                        <MapPin className="h-3 w-3" />Open in Maps<ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* Cleaning Tracker */}
            <div className={cn("px-6 py-5 border-b border-border overflow-x-hidden", done ? "bg-emerald-50" : inProgress ? "bg-amber-50" : "bg-white")}>
              {notStarted && (
                <div className="flex flex-col items-center gap-3 py-2">
                  <p className="text-sm text-muted-foreground">Tap the button when you begin cleaning</p>
                  <Button size="lg" className="w-full max-w-xs h-14 text-base font-semibold gap-2 shadow-md" onClick={handleStart} disabled={startCleaning.isPending}>
                    {startCleaning.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PlayCircle className="h-5 w-5" />}
                    Start Cleaning
                  </Button>
                </div>
              )}
              {inProgress && (
                <div className="flex flex-col items-center gap-3 py-1">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Timer className="h-4 w-4 animate-pulse shrink-0" />
                    {editingField === "startedAt" ? (
                      <div className="flex items-center gap-2">
                        <input type="time" value={editTimeValue} onChange={(e) => setEditTimeValue(e.target.value)} className="border border-amber-300 rounded-md px-2 py-1 text-sm bg-white text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-400" />
                        <button onClick={handleSaveEdit} disabled={patchTiming.isPending} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">{patchTiming.isPending ? "Saving…" : "Save"}</button>
                        <button onClick={() => setEditingField(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <span className="text-sm font-medium flex items-center gap-1.5">
                        Started at {formatTime(assignment.startedAt)}
                        <button onClick={() => openEdit("startedAt")} className="text-amber-500 hover:text-amber-700 transition-colors"><Pencil className="h-3 w-3" /></button>
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-bold font-mono tabular-nums text-amber-700">{formatDuration(elapsed)}</div>
                  {!showFinishNotes ? (
                    <Button size="lg" variant="outline" className="w-full max-w-xs h-14 text-base font-semibold gap-2 border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50 shadow-sm" onClick={() => setShowFinishNotes(true)} disabled={finishCleaning.isPending}>
                      <CheckCircle2 className="h-5 w-5" />
                      Finish Cleaning
                    </Button>
                  ) : (
                    <div className="w-full max-w-sm space-y-3">
                      <div className="text-sm font-medium text-amber-800 text-center">Any notes before finishing?</div>
                      <Textarea
                        placeholder="e.g. Found a broken towel rail, used extra supplies, dog was inside... (optional)"
                        value={completionNotesInput}
                        onChange={(e) => setCompletionNotesInput(e.target.value)}
                        className="resize-none min-h-[90px] bg-white border-emerald-200 focus-visible:ring-emerald-400/50 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowFinishNotes(false); setCompletionNotesInput(""); }} disabled={finishCleaning.isPending}>
                          Cancel
                        </Button>
                        <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5" onClick={() => handleFinish(completionNotesInput)} disabled={finishCleaning.isPending}>
                          {finishCleaning.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                          Confirm Finish
                        </Button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => applyTimingPatch({ startedAt: null, finishedAt: null })} disabled={patchTiming.isPending} className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline disabled:opacity-50">Undo start</button>
                </div>
              )}
              {done && (
                <div className="flex flex-col items-center gap-3 py-1">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  <p className="font-semibold text-emerald-700 text-base">Cleaning Complete</p>
                  <div className="w-full max-w-xs space-y-2">
                    {(["startedAt", "finishedAt"] as const).map((field) => (
                      <div key={field} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2 border border-emerald-200">
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                          {field === "startedAt" ? <AlarmClock className="h-3.5 w-3.5 text-emerald-600" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                          {field === "startedAt" ? "Started" : "Finished"}
                        </span>
                        {editingField === field ? (
                          <div className="flex items-center gap-2">
                            <input type="time" value={editTimeValue} onChange={(e) => setEditTimeValue(e.target.value)} className="border border-emerald-300 rounded px-1.5 py-0.5 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <button onClick={handleSaveEdit} disabled={patchTiming.isPending} className="text-xs font-semibold text-primary hover:underline disabled:opacity-50">{patchTiming.isPending ? "…" : "Save"}</button>
                            <button onClick={() => setEditingField(null)} className="text-xs text-muted-foreground hover:underline">✕</button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                            {formatTime(assignment[field])}
                            <button onClick={() => openEdit(field)} className="text-emerald-500 hover:text-emerald-700 transition-colors"><Pencil className="h-3 w-3" /></button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="bg-emerald-100 border border-emerald-200 rounded-full px-4 py-1 text-emerald-800 font-semibold text-sm flex items-center gap-1.5">
                    <Timer className="h-3.5 w-3.5" /> Total: {formatDuration(elapsed)}
                  </div>
                  <button onClick={() => applyTimingPatch({ finishedAt: null })} disabled={patchTiming.isPending} className="text-xs text-muted-foreground hover:text-destructive transition-colors underline-offset-2 hover:underline disabled:opacity-50">Undo finish</button>
                  {assignment.completionNotes && (
                    <div className="w-full max-w-xs bg-white border border-emerald-200 rounded-lg px-3 py-2.5 text-left">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 mb-1">Completion Notes</p>
                      <p className="text-sm text-foreground/80">{assignment.completionNotes}</p>
                    </div>
                  )}
                </div>
              )}
              {(inProgress || done) && (
                <div ref={issuePhotoRef} className="mt-4 pt-4 border-t border-border/40">
                  <IssuePhotoSection
                    assignmentId={assignment.id}
                    myClerkId={assignment.assignedToClerkId ?? undefined}
                    readOnly={false}
                    onCountChange={(delta) =>
                      setAssignment((a: any) => ({ ...a, issuePhotoCount: Math.max(0, (a.issuePhotoCount ?? 0) + delta) }))
                    }
                  />
                </div>
              )}
              {done && (
                <div ref={checkoutPhotoRef} className="mt-4 pt-4 border-t border-emerald-200/70 bg-emerald-50/40 -mx-6 px-6 pb-2 overflow-x-hidden">
                  <CheckoutPhotoSection
                    assignmentId={assignment.id}
                    myClerkId={assignment.assignedToClerkId ?? undefined}
                    onCountUpdated={(count) => {
                      setLocalCheckoutCount(count);
                      qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
                      qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
                    }}
                  />
                  {localCheckoutCount >= CHECKOUT_MIN && (
                    <div className="mt-4 pt-3 border-t border-emerald-200/60">
                      <Button
                        size="lg"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
                        onClick={onClose}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        Close Job
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Property Specs</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icon: BedDouble, value: house.doubleBeds, label: "Dbl" },
                      { icon: BedSingle, value: house.singleBeds, label: "Sgl" },
                      { icon: Baby, value: house.babyBeds, label: "Baby" },
                      { icon: Bath, value: house.bathrooms, label: "Bath" },
                      { icon: Waves, value: house.jacuzzis, label: "Jcz" },
                      { icon: Flame, value: house.saunas, label: "Sauna" },
                    ].map(({ icon: Icon, value, label }) => (
                      <div key={label} className="bg-card border border-border/50 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
                        <Icon className="h-4 w-4 text-muted-foreground mb-1" />
                        <span className="text-base font-bold leading-none">{value ?? "-"}</span>
                        <span className="text-[9px] text-muted-foreground uppercase mt-1">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {house.entryCode && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entry Code</h4>
                    <div className="bg-card border border-border/50 rounded-lg px-4 py-3 flex items-center gap-3">
                      <KeyRound className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-mono font-bold tracking-widest text-primary text-lg">{house.entryCode}</span>
                    </div>
                  </div>
                )}
                {(house.ownerName || house.ownerPhone || house.ownerEmail) && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Owner Contact</h4>
                    <div className="bg-secondary/30 rounded-lg p-3 space-y-2 border border-border/50">
                      {house.ownerName && <p className="font-medium text-foreground text-sm">{house.ownerName}</p>}
                      {house.ownerPhone && <a href={`tel:${house.ownerPhone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Phone className="h-3.5 w-3.5 shrink-0" />{house.ownerPhone}</a>}
                      {house.ownerEmail && <a href={`mailto:${house.ownerEmail}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><Mail className="h-3.5 w-3.5 shrink-0" />{house.ownerEmail}</a>}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                <div className="flex-1 flex flex-col gap-3">
                  <Textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)} placeholder="Add access codes, special instructions, or cleaning preferences..." className="flex-1 min-h-[140px] resize-none bg-amber-50/50 border-amber-200/50 focus-visible:ring-amber-500/30" />
                  <Button onClick={handleSaveNotes} disabled={updateNotes.isPending || notesValue === (house.notes || "")} className="w-full">
                    {updateNotes.isPending ? "Saving..." : "Save Notes"}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
