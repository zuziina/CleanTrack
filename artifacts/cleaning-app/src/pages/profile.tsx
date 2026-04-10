import { Layout } from "@/components/layout";
import { useGetMe, useGetTodayAssignments, useListUsers, useListHouses, useCreateAssignment, getGetTodayAssignmentsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Calendar, MapPin, Clock, Users, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: user, isLoading: userLoading } = useGetMe();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (user && !sessionStorage.getItem("roleChosen")) {
      // If we don't know for sure they explicitly chose a role this session
      // we check if they just signed up or are coming back
      // Since `me` returns employee by default, there is no direct metadata check here without updating backend
      // But based on instructions, we can redirect to setup-role if they don't have the flag
      // Wait, the instruction says: "If a signed-in user has no role yet (useGetMe returns role === "employee" with no explicit metadata), redirect them to /setup-role. Actually — simplest: after sign-up, always navigate to /setup-role."
      // Since I did that, I will just let it be. If they land here they are ok.
    }
  }, [user]);

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

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20 border-4 border-card shadow-sm">
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground uppercase">
              {user.firstName?.charAt(0) || user.username?.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {user.firstName || user.username}
            </h1>
            <div className="flex items-center gap-3 text-muted-foreground">
              <Badge variant="secondary" className="font-medium text-xs rounded-full px-2.5 py-0.5 uppercase tracking-wider bg-primary/10 text-primary hover:bg-primary/20 border-none">
                {user.role}
              </Badge>
              <span className="text-sm">{user.email}</span>
            </div>
          </div>
        </div>

        {user.role === "boss" ? <BossDashboard /> : <EmployeeDashboard />}
      </div>
    </Layout>
  );
}

function EmployeeDashboard() {
  const { data: assignments, isLoading } = useGetTodayAssignments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <h2 className="text-xl font-semibold tracking-tight">Today's Schedule</h2>
        <Badge variant="outline" className="bg-background">
          {assignments?.length || 0} assignments
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
            <p className="text-sm mt-1">Enjoy your day off!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {assignments?.map((assignment) => (
            <AssignmentCard key={assignment.id} assignment={assignment} />
          ))}
        </div>
      )}
    </div>
  );
}

function BossDashboard() {
  const { data: users, isLoading: usersLoading } = useListUsers();
  const { data: assignments, isLoading: assignmentsLoading } = useGetTodayAssignments();
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const employees = users?.filter(u => u.role === "employee") || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-5 space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <h2 className="text-xl font-semibold tracking-tight">Your Team</h2>
          <Badge variant="outline" className="bg-background">
            {employees.length} employees
          </Badge>
        </div>

        {usersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map(emp => (
              <Card key={emp.clerkId} className="border-border/50 bg-card hover:border-primary/20 transition-colors">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary uppercase text-sm">
                        {(emp.firstName || emp.username)?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <p className="font-medium leading-none truncate">{emp.firstName || emp.username}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{emp.email}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedUser(emp)}>
                    Assign
                  </Button>
                </CardContent>
              </Card>
            ))}
            {employees.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                No employees found
              </div>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <h2 className="text-xl font-semibold tracking-tight">Today's Global Schedule</h2>
          <Badge variant="outline" className="bg-background">
            {assignments?.length || 0} assignments
          </Badge>
        </div>

        {assignmentsLoading ? (
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
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments?.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} showAssignee />
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <AssignModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}

function AssignmentCard({ assignment, showAssignee = false }: { assignment: any, showAssignee?: boolean }) {
  return (
    <Card className="overflow-hidden border-border/50 hover:shadow-sm transition-shadow">
      <div className="flex">
        <div className={cn(
          "w-1.5 flex-shrink-0",
          assignment.status === 'completed' ? "bg-green-500" :
          assignment.status === 'in_progress' ? "bg-blue-500" :
          "bg-amber-500"
        )} />
        <CardContent className="p-4 flex-1 flex flex-col sm:flex-row gap-4 justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-base leading-tight">{assignment.houseName}</h3>
                <div className="flex items-center text-muted-foreground text-sm gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{assignment.houseAddress}</span>
                </div>
              </div>
              {assignment.priority === 'high' && (
                <Badge variant="destructive" className="h-5 px-1.5 py-0 text-[10px] uppercase shrink-0">High</Badge>
              )}
            </div>
            
            {showAssignee && assignment.assignedToUsername && (
              <div className="text-xs font-medium text-primary bg-primary/5 inline-flex items-center px-2 py-0.5 rounded-sm">
                Assigned to: {assignment.assignedToUsername}
              </div>
            )}
            
            {(assignment.guestCount || assignment.notes) && (
              <div className="text-sm bg-secondary/50 p-2 rounded-md space-y-1">
                {assignment.guestCount > 0 && (
                  <div className="flex items-center gap-1.5 text-foreground/80 font-medium">
                    <Users className="h-3.5 w-3.5" />
                    {assignment.guestCount} guests today
                  </div>
                )}
                {assignment.notes && <p className="text-muted-foreground text-xs">{assignment.notes}</p>}
              </div>
            )}
          </div>
          
          <div className="flex items-center sm:items-end justify-between sm:flex-col gap-2 shrink-0">
            <div className="flex items-center text-sm font-medium gap-1.5 bg-secondary px-2.5 py-1 rounded-md text-foreground">
              <Clock className="h-3.5 w-3.5 text-primary" />
              {assignment.timeSlot}
            </div>
            <Badge variant="outline" className={cn(
              "capitalize text-[10px]",
              assignment.status === 'completed' && "border-green-500 text-green-600 bg-green-50 dark:bg-green-950/30",
              assignment.status === 'in_progress' && "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/30",
              assignment.status === 'pending' && "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
            )}>
              {assignment.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

function AssignModal({ user, onClose }: { user: any, onClose: () => void }) {
  const { data: houses, isLoading: housesLoading } = useListHouses();
  const createAssignment = useCreateAssignment();
  const qc = useQueryClient();

  const [houseId, setHouseId] = useState<string>("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high">("normal");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!houseId || !timeSlot || !date) return;

    createAssignment.mutate({
      data: {
        houseId: parseInt(houseId, 10),
        assignedToClerkId: user.clerkId,
        date,
        timeSlot,
        guestCount: guestCount ? parseInt(guestCount, 10) : undefined,
        status: "pending",
        priority,
        notes: notes || undefined
      }
    }, {
      onSuccess: () => {
        toast.success("Assignment created");
        qc.invalidateQueries({ queryKey: getGetTodayAssignmentsQueryKey() });
        onClose();
      },
      onError: () => {
        toast.error("Failed to create assignment");
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign House</DialogTitle>
          <DialogDescription>
            Creating assignment for <span className="font-medium text-foreground">{user.firstName || user.username}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Property</Label>
            <Select value={houseId} onValueChange={setHouseId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {houses?.map(h => (
                  <SelectItem key={h.id} value={h.id.toString()}>{h.name} - {h.address}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Input placeholder="e.g. 9:00 AM - 11:00 AM" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Guests Today</Label>
              <Input type="number" min="0" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} />
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
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createAssignment.isPending}>
              {createAssignment.isPending ? "Assigning..." : "Assign House"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}