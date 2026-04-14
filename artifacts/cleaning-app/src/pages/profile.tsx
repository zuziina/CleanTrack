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
  getGetTodayAssignmentsQueryKey,
  getListAssignmentsQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Crown,
  Plus,
  UserCheck,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function toDateString(d: Date) {
  return d.toISOString().split("T")[0];
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

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useGetMe();

  if (userLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const isBoss = user.role === "boss";
  const displayName = user.username || user.firstName || user.email.split("@")[0];
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-5">
          <Avatar className="h-20 w-20 border-4 border-card shadow-sm shrink-0">
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground uppercase">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-foreground truncate">
              {displayName}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              {isBoss ? (
                <Badge className="gap-1.5 px-3 py-1 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white border-none rounded-full">
                  <Crown className="h-3.5 w-3.5" />
                  Boss
                </Badge>
              ) : (
                <Badge className="gap-1.5 px-3 py-1 text-sm font-semibold bg-primary hover:bg-primary/90 text-primary-foreground border-none rounded-full">
                  <UserCheck className="h-3.5 w-3.5" />
                  Employee
                </Badge>
              )}
              <span className="text-sm text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>
        </div>

        {isBoss ? <BossDashboard /> : <EmployeeDashboard />}
      </div>
    </Layout>
  );
}

function EmployeeDashboard() {
  const today = new Date();
  const { data: assignments, isLoading } = useGetTodayAssignments();

  const formatted = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <Card className="bg-primary text-primary-foreground border-none shadow-md">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="bg-white/15 rounded-xl p-3">
            <Calendar className="h-7 w-7" />
          </div>
          <div>
            <p className="text-primary-foreground/70 text-sm font-medium uppercase tracking-wider">
              Today
            </p>
            <p className="text-xl font-bold">{formatted}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <h2 className="text-xl font-semibold tracking-tight">My Assignments</h2>
        <Badge variant="outline">
          {assignments?.length ?? 0} today
        </Badge>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : assignments?.length === 0 ? (
        <Card className="border-dashed border-2 bg-background/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
            <div className="bg-secondary p-4 rounded-full mb-4">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <p className="font-medium text-foreground text-lg">No assignments today</p>
            <p className="text-sm mt-1">Enjoy your free day!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments?.map((a) => (
            <AssignmentCard key={a.id} assignment={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function BossDashboard() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [weekRef, setWeekRef] = useState<Date>(today);
  const [assignTarget, setAssignTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);

  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: allAssignments, isLoading: assignmentsLoading } = useListAssignments();

  const employees = useMemo(
    () => (users ?? []).filter((u: any) => u.role === "employee"),
    [users]
  );

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
  const selectedAssignments = assignmentsByDate[selectedDateStr] ?? [];

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
    const d = new Date(weekRef);
    d.setDate(d.getDate() - 7);
    setWeekRef(d);
  };
  const nextWeek = () => {
    const d = new Date(weekRef);
    d.setDate(d.getDate() + 7);
    setWeekRef(d);
  };

  return (
    <div className="space-y-7">
      <Card className="bg-amber-500 text-white border-none shadow-md">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="bg-white/15 rounded-xl p-3">
            <Crown className="h-7 w-7" />
          </div>
          <div>
            <p className="text-white/70 text-sm font-medium uppercase tracking-wider">
              Today
            </p>
            <p className="text-xl font-bold">
              {today.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Schedule Calendar</h2>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium w-40 text-center">{monthLabel}</span>
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
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h3 className="text-base font-semibold tracking-tight">Your Team</h3>
            <Badge variant="outline">{employees.length} employees</Badge>
          </div>

          {usersLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
              No employees yet
            </div>
          ) : (
            <div className="space-y-2">
              {employees.map((emp: any) => {
                const empAssignments = selectedAssignments.filter(
                  (a: any) => a.assignedToClerkId === emp.clerkId
                );
                return (
                  <Card key={emp.clerkId} className="border-border/50 bg-card">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="bg-primary/10 text-primary uppercase text-sm">
                            {(emp.username || emp.firstName || "?").charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium leading-none truncate text-sm">
                            {emp.username || emp.firstName}
                          </p>
                          {empAssignments.length > 0 ? (
                            <p className="text-xs text-primary mt-1 font-medium">
                              {empAssignments.length} assignment{empAssignments.length !== 1 ? "s" : ""}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">No assignments</p>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1 text-xs h-8"
                        onClick={() => setAssignTarget(emp)}
                      >
                        <Plus className="h-3 w-3" />
                        Assign
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <div>
              <h3 className="text-base font-semibold tracking-tight">{formattedSelected}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedAssignments.length} assignment{selectedAssignments.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

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
                <p className="text-sm mt-1">Click an employee and press Assign to add one</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {selectedAssignments.map((a: any) => (
                <AssignmentCard key={a.id} assignment={a} showAssignee onEdit={() => setEditTarget(a)} />
              ))}
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
    </div>
  );
}

function AssignmentCard({
  assignment,
  showAssignee = false,
  onEdit,
}: {
  assignment: any;
  showAssignee?: boolean;
  onEdit?: () => void;
}) {
  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-sm transition-shadow">
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
        <CardContent className="p-4 flex-1 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base leading-tight">{assignment.houseName}</h3>
                {assignment.timeSlot && (
                  <div className="flex items-center text-muted-foreground text-sm gap-1 mt-1">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
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
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {showAssignee && assignment.assignedToUsername && (
              <div className="text-xs font-medium text-primary bg-primary/5 inline-flex items-center px-2 py-0.5 rounded-sm">
                {assignment.assignedToUsername}
              </div>
            )}

            {(assignment.guestCount > 0 || assignment.notes) && (
              <div className="text-sm bg-secondary/50 p-2 rounded-md space-y-1">
                {assignment.guestCount > 0 && (
                  <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
                    <Users className="h-3.5 w-3.5" />
                    {assignment.guestCount} guests
                  </div>
                )}
                {assignment.notes && (
                  <p className="text-muted-foreground text-xs">{assignment.notes}</p>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center sm:items-end justify-between sm:flex-col gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn(
                "capitalize text-[10px]",
                assignment.status === "completed" &&
                  "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30",
                assignment.status === "in_progress" &&
                  "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30",
                assignment.status === "pending" &&
                  "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
              )}
            >
              {assignment.status.replace("_", " ")}
            </Badge>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function AssignModal({
  user,
  defaultDate,
  onClose,
}: {
  user: any;
  defaultDate: string;
  onClose: () => void;
}) {
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
    if (!houseId || !guestCount) return;

    createAssignment.mutate(
      {
        data: {
          houseId: parseInt(houseId, 10),
          assignedToClerkId: user.clerkId,
          date: date || undefined,
          timeSlot: timeSlot || undefined,
          guestCount: parseInt(guestCount, 10),
          status: "pending",
          priority,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Assignment created");
          qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
          qc.invalidateQueries({ queryKey: getListAssignmentsQueryKey() });
          onClose();
        },
        onError: () => {
          toast.error("Failed to create assignment");
        },
      }
    );
  };

  const displayName = user.username || user.firstName || "Employee";

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Assign Property</DialogTitle>
          <DialogDescription>
            Scheduling work for{" "}
            <span className="font-semibold text-foreground">{displayName}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Property *</Label>
            <Select value={houseId} onValueChange={setHouseId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {(houses ?? []).map((h: any) => (
                  <SelectItem key={h.id} value={String(h.id)}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Input
                placeholder="e.g. 9:00 – 11:00 AM"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Guests Today *</Label>
              <Input
                type="number"
                min="0"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
            <Textarea
              placeholder="Any specific instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAssignment.isPending || !houseId || !guestCount}>
              {createAssignment.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Assign Property"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAssignmentModal({
  assignment,
  onClose,
}: {
  assignment: any;
  onClose: () => void;
}) {
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
    if (!houseId || !guestCount) return;

    updateAssignment.mutate(
      {
        id: assignment.id,
        data: {
          houseId: parseInt(houseId, 10),
          date: date || undefined,
          timeSlot: timeSlot || undefined,
          guestCount: parseInt(guestCount, 10),
          status,
          priority,
          notes: notes || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Assignment updated");
          invalidate();
          onClose();
        },
        onError: () => toast.error("Failed to update assignment"),
      }
    );
  };

  const handleDelete = () => {
    deleteAssignment.mutate(
      { id: assignment.id },
      {
        onSuccess: () => {
          toast.success("Assignment deleted");
          invalidate();
          onClose();
        },
        onError: () => toast.error("Failed to delete assignment"),
      }
    );
  };

  const isBusy = updateAssignment.isPending || deleteAssignment.isPending;

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-[440px] bg-[#fafaf9]">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">{assignment.houseName}</span>
              {assignment.assignedToUsername && (
                <> &mdash; {assignment.assignedToUsername}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Property *</Label>
              <Select value={houseId} onValueChange={setHouseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {(houses ?? []).map((h: any) => (
                    <SelectItem key={h.id} value={String(h.id)}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <div className="flex justify-between gap-3 pt-2">
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowDeleteConfirm(true)} disabled={isBusy}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isBusy || !houseId || !guestCount}>
                  {updateAssignment.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={(o) => !o && setShowDeleteConfirm(false)}>
        <DialogContent className="sm:max-w-[360px] bg-[#fafaf9]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete assignment?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove the assignment for{" "}
              <span className="font-semibold text-foreground">{assignment.houseName}</span>.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deleteAssignment.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAssignment.isPending}>
              {deleteAssignment.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</>
              ) : (
                "Yes, delete"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
