import { Layout } from "@/components/layout";
import {
  useListHouses,
  useGetHouseStats,
  useGetHouse,
  useCreateHouse,
  useUpdateHouse,
  useDeleteHouse,
  useUpdateHouseNotes,
  getGetHouseQueryKey,
  getListHousesQueryKey,
  getGetHouseStatsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  MapPin,
  Bath,
  BedSingle,
  BedDouble,
  Baby,
  Activity,
  CalendarDays,
  Pencil,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type StatusValue = "active" | "inactive";

interface HouseFormState {
  name: string;
  mapLink: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  notes: string;
  singleBeds: string;
  doubleBeds: string;
  babyBeds: string;
  bathrooms: string;
  entryCode: string;
  status: StatusValue;
}

const emptyForm = (): HouseFormState => ({
  name: "",
  mapLink: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
  notes: "",
  singleBeds: "",
  doubleBeds: "",
  babyBeds: "",
  bathrooms: "",
  entryCode: "",
  status: "active",
});

export default function HousesPage() {
  const { data: houses, isLoading } = useListHouses();
  const { data: stats } = useGetHouseStats();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const [editHouseId, setEditHouseId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredHouses = houses?.filter((h) => {
    const matchesSearch =
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      h.ownerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCardClick = (id: number) => {
    if (isManageMode) {
      setEditHouseId(id);
    } else {
      setSelectedHouseId(id);
    }
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
            <p className="text-muted-foreground mt-1">
              {isManageMode
                ? "Manage mode — edit or add properties."
                : "Manage and view all cleaning locations."}
            </p>
          </div>
          <div className="flex gap-2">
            {isManageMode ? (
              <>
                <Button onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Property
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsManageMode(false)}
                  className="gap-2 border-primary text-primary hover:bg-primary/5"
                >
                  <CheckCircle2 className="h-4 w-4" /> Done
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => setIsManageMode(true)}
                className="gap-2"
              >
                <Pencil className="h-4 w-4" /> Manage
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardContent className="p-4">
              <div className="text-primary-foreground/80 text-sm font-medium mb-1">
                Total Properties
              </div>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-1.5">
                <Activity size={14} /> Active
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.active || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-1.5">
                <CalendarDays size={14} /> Jobs Today
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.totalAssignmentsToday || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-1.5">
                <Activity size={14} /> Inactive
              </div>
              <div className="text-3xl font-bold text-foreground">
                {stats?.inactive || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties or owners..."
              className="pl-9 bg-background border-border/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              onClick={() => setStatusFilter("all")}
              className="h-10 px-4"
            >
              All
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              onClick={() => setStatusFilter("active")}
              className="h-10 px-4"
            >
              Active
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "default" : "outline"}
              onClick={() => setStatusFilter("inactive")}
              className="h-10 px-4"
            >
              Inactive
            </Button>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-[180px] rounded-xl" />
            ))}
          </div>
        ) : filteredHouses?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed">
            <div className="bg-secondary w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">
              No properties found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHouses?.map((house) => (
              <Card
                key={house.id}
                className={cn(
                  "overflow-hidden transition-colors cursor-pointer group relative border-2",
                  house.status === "active"
                    ? "border-green-400"
                    : "border-gray-200",
                  isManageMode
                    ? "ring-1 ring-amber-200/60 hover:border-amber-400"
                    : house.status === "active"
                      ? "hover:border-green-500"
                      : "hover:border-gray-400"
                )}
                onClick={() => handleCardClick(house.id)}
              >
                {isManageMode && (
                  <div className="absolute top-2 right-2 z-10">
                    <div className="bg-amber-500 text-white rounded-full p-1.5 shadow">
                      <Pencil className="h-3 w-3" />
                    </div>
                  </div>
                )}
                <CardContent className="p-0">
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors truncate">
                          {house.name}
                        </h3>
                        {house.entryCode ? (
                          <p className="text-sm text-muted-foreground line-clamp-1 font-mono tracking-wide">
                            Code: {house.entryCode}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/50 italic line-clamp-1">
                            No entry code
                          </p>
                        )}
                      </div>
                    </div>

                    {house.mapLink ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(house.mapLink!, "_blank");
                        }}
                        className="flex items-center gap-2 text-sm text-primary bg-primary/10 hover:bg-primary/20 px-3 py-2 rounded-lg transition-colors w-full"
                      >
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="font-medium">Open in Maps</span>
                        <ExternalLink className="h-3 w-3 ml-auto shrink-0" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground/50 italic px-3 py-2 bg-secondary/30 rounded-lg">
                        <MapPin className="h-4 w-4 shrink-0" />
                        No location set
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2 border-t border-border/50">
                      <span className="flex items-center gap-1.5" title="Double beds">
                        <BedDouble className="h-4 w-4" />{house.doubleBeds ?? "-"}
                      </span>
                      <span className="flex items-center gap-1.5" title="Single beds">
                        <BedSingle className="h-4 w-4" />{house.singleBeds ?? "-"}
                      </span>
                      <span className="flex items-center gap-1.5" title="Baby beds">
                        <Baby className="h-4 w-4" />{house.babyBeds ?? "-"}
                      </span>
                      <span className="flex items-center gap-1.5 ml-auto" title="Bathrooms">
                        <Bath className="h-4 w-4" />{house.bathrooms ?? "-"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      {!isManageMode && selectedHouseId && (
        <HouseDetailModal
          houseId={selectedHouseId}
          onClose={() => setSelectedHouseId(null)}
        />
      )}
      {isManageMode && editHouseId && (
        <EditHouseModal
          houseId={editHouseId}
          onClose={() => setEditHouseId(null)}
        />
      )}
      {isManageMode && showAddModal && (
        <AddHouseModal onClose={() => setShowAddModal(false)} />
      )}
    </Layout>
  );
}

/* ── View Modal ─────────────────────────────────────────────────────── */

function HouseDetailModal({
  houseId,
  onClose,
}: {
  houseId: number;
  onClose: () => void;
}) {
  const { data: house, isLoading } = useGetHouse(houseId, {
    query: { enabled: !!houseId, queryKey: getGetHouseQueryKey(houseId) },
  });
  const updateNotes = useUpdateHouseNotes();
  const qc = useQueryClient();
  const [notesValue, setNotesValue] = useState("");

  useEffect(() => {
    if (house?.notes) setNotesValue(house.notes);
  }, [house?.notes]);

  const handleSaveNotes = () => {
    updateNotes.mutate(
      { id: houseId, data: { notes: notesValue } },
      {
        onSuccess: () => {
          toast.success("Notes saved");
          qc.setQueryData(getGetHouseQueryKey(houseId), (old: any) =>
            old ? { ...old, notes: notesValue } : old
          );
        },
        onError: () => toast.error("Failed to save notes"),
      }
    );
  };

  return (
    <Dialog open={!!houseId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-[#fafaf9]">
        {isLoading || !house ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-[200px] w-full mt-4" />
          </div>
        ) : (
          <>
            <div className="bg-primary/5 p-6 border-b border-border">
              <DialogHeader>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-2xl font-bold text-foreground mb-1">
                      {house.name}
                    </DialogTitle>
                    <DialogDescription className="text-foreground/60">
                      {house.ownerName}
                    </DialogDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge className="capitalize text-sm px-3 py-1 bg-primary text-primary-foreground">
                      {house.status}
                    </Badge>
                    {house.mapLink && (
                      <button
                        type="button"
                        onClick={() => window.open(house.mapLink!, "_blank")}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-md transition-colors whitespace-nowrap"
                      >
                        <MapPin className="h-3 w-3" />
                        Open in Maps
                      </button>
                    )}
                  </div>
                </div>
              </DialogHeader>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Owner Details
                  </h4>
                  <div className="bg-secondary/30 rounded-lg p-3 space-y-2 border border-border/50">
                    <p className="font-medium text-foreground">{house.ownerName}</p>
                    {house.ownerPhone && (
                      <p className="text-sm text-muted-foreground">{house.ownerPhone}</p>
                    )}
                    {house.ownerEmail && (
                      <p className="text-sm text-muted-foreground">{house.ownerEmail}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Property Specs
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-bold leading-none">{house.singleBeds ?? "-"}</span>
                      <span className="text-[10px] text-muted-foreground uppercase mt-1">Single</span>
                    </div>
                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-bold leading-none">{house.doubleBeds ?? "-"}</span>
                      <span className="text-[10px] text-muted-foreground uppercase mt-1">Double</span>
                    </div>
                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                      <span className="text-lg font-bold leading-none">{house.babyBeds ?? "-"}</span>
                      <span className="text-[10px] text-muted-foreground uppercase mt-1">Baby</span>
                    </div>
                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                      <Bath className="h-5 w-5 mb-1 text-muted-foreground" />
                      <span className="text-lg font-bold leading-none">{house.bathrooms ?? "-"}</span>
                      <span className="text-[10px] text-muted-foreground uppercase mt-1">Baths</span>
                    </div>
                    {house.entryCode && (
                      <div className="col-span-2 bg-card border border-border/50 rounded-lg p-3 flex items-center justify-between">
                        <span className="text-sm font-medium">Entry Code</span>
                        <span className="font-mono font-semibold tracking-widest text-primary">
                          {house.entryCode}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col h-full">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Notes
                  </h4>
                  <div className="flex-1 flex flex-col gap-3">
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add access codes, special instructions, or cleaning preferences..."
                      className="flex-1 min-h-[160px] resize-none bg-amber-50/50 border-amber-200/50 focus-visible:ring-amber-500/30"
                    />
                    <Button
                      onClick={handleSaveNotes}
                      disabled={updateNotes.isPending || notesValue === (house.notes || "")}
                      className="w-full"
                    >
                      {updateNotes.isPending ? "Saving..." : "Save Notes"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ── Edit Modal ──────────────────────────────────────────────────────── */

function EditHouseModal({
  houseId,
  onClose,
}: {
  houseId: number;
  onClose: () => void;
}) {
  const { data: house, isLoading } = useGetHouse(houseId, {
    query: { enabled: !!houseId, queryKey: getGetHouseQueryKey(houseId) },
  });
  const updateHouse = useUpdateHouse();
  const deleteHouse = useDeleteHouse();
  const qc = useQueryClient();

  const [form, setForm] = useState<HouseFormState>(emptyForm());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (house) {
      setForm({
        name: house.name,
        mapLink: house.mapLink || "",
        ownerName: house.ownerName,
        ownerPhone: house.ownerPhone || "",
        ownerEmail: house.ownerEmail || "",
        notes: house.notes || "",
        singleBeds: house.singleBeds != null ? String(house.singleBeds) : "",
        doubleBeds: house.doubleBeds != null ? String(house.doubleBeds) : "",
        babyBeds: house.babyBeds != null ? String(house.babyBeds) : "",
        bathrooms: house.bathrooms != null ? String(house.bathrooms) : "",
        entryCode: house.entryCode || "",
        status: (house.status as StatusValue) || "active",
      });
    }
  }, [house]);

  const set = (key: keyof HouseFormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = () => {
    updateHouse.mutate(
      {
        id: houseId,
        data: {
          name: form.name,
          mapLink: form.mapLink || null,
          ownerName: form.ownerName,
          ownerPhone: form.ownerPhone || null,
          ownerEmail: form.ownerEmail || null,
          notes: form.notes || null,
          singleBeds: form.singleBeds ? parseInt(form.singleBeds) : null,
          doubleBeds: form.doubleBeds ? parseInt(form.doubleBeds) : null,
          babyBeds: form.babyBeds ? parseInt(form.babyBeds) : null,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
          entryCode: form.entryCode || null,
          status: form.status,
        },
      },
      {
        onSuccess: () => {
          toast.success("Property updated");
          qc.invalidateQueries({ queryKey: getListHousesQueryKey() });
          qc.invalidateQueries({ queryKey: getGetHouseQueryKey(houseId) });
          qc.invalidateQueries({ queryKey: getGetHouseStatsQueryKey() });
          onClose();
        },
        onError: () => toast.error("Failed to update property"),
      }
    );
  };

  const handleDelete = () => setShowDeleteConfirm(true);

  const handleConfirmDelete = () => {
    deleteHouse.mutate(
      { id: houseId },
      {
        onSuccess: () => {
          toast.success("Property deleted");
          qc.invalidateQueries({ queryKey: getListHousesQueryKey() });
          qc.invalidateQueries({ queryKey: getGetHouseStatsQueryKey() });
          setShowDeleteConfirm(false);
          onClose();
        },
        onError: () => {
          toast.error("Failed to delete property");
          setShowDeleteConfirm(false);
        },
      }
    );
  };

  return (
    <>
    <Dialog open={!!houseId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden bg-[#fafaf9] max-h-[90vh] flex flex-col">
        <div className="bg-amber-500/10 p-6 border-b border-amber-200/60 shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-600" />
              Edit Property
            </DialogTitle>
            <DialogDescription className="text-foreground/70">
              {isLoading ? "Loading..." : house?.name}
            </DialogDescription>
          </DialogHeader>
        </div>

        {isLoading || !house ? (
          <div className="p-6 space-y-4 flex-1">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            <Section title="Property Info">
              <Field label="Property Name">
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-500" /> Active
                        </span>
                      </SelectItem>
                      <SelectItem value="inactive">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-muted-foreground" /> Inactive
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Entry Code">
                  <Input value={form.entryCode} onChange={(e) => set("entryCode", e.target.value)} placeholder="e.g. 1234#" className="font-mono" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Single Beds">
                  <Input type="number" min="0" step="1" value={form.singleBeds} onChange={(e) => set("singleBeds", e.target.value)} placeholder="0" />
                </Field>
                <Field label="Double Beds">
                  <Input type="number" min="0" step="1" value={form.doubleBeds} onChange={(e) => set("doubleBeds", e.target.value)} placeholder="0" />
                </Field>
                <Field label="Baby Beds">
                  <Input type="number" min="0" step="1" value={form.babyBeds} onChange={(e) => set("babyBeds", e.target.value)} placeholder="0" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bathrooms">
                  <Input type="number" min="0" step="1" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} placeholder="e.g. 2" />
                </Field>
              </div>
            </Section>

            <Section title="Location">
              <Field label="Google Maps Link">
                <Input
                  value={form.mapLink}
                  onChange={(e) => set("mapLink", e.target.value)}
                  placeholder="Paste any Google Maps link here"
                />
              </Field>
              <p className="text-xs text-muted-foreground px-1">
                Open Google Maps, drop a pin, tap Share, copy link, paste here.
              </p>
              {form.mapLink && (
                <button
                  type="button"
                  onClick={() => window.open(form.mapLink, "_blank")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors"
                >
                  <ExternalLink className="h-3 w-3" /> Test link
                </button>
              )}
            </Section>

            <Section title="Owner Details">
              <Field label="Owner Name">
                <Input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone">
                  <Input value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} placeholder="Optional" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} placeholder="Optional" />
                </Field>
              </div>
            </Section>

            <Section title="Notes">
              <Textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Access codes, special instructions..."
                className="min-h-[100px] resize-none bg-amber-50/50 border-amber-200/50"
              />
            </Section>
          </div>
        )}

        <div className="p-4 border-t border-border/50 flex justify-between items-center gap-3 bg-[#fafaf9] shrink-0">
          <Button
            variant="outline"
            onClick={handleDelete}
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={updateHouse.isPending || !form.name}
              className="min-w-[100px]"
            >
              {updateHouse.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Delete confirmation dialog */}
    <Dialog open={showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(false)}>
      <DialogContent className="sm:max-w-[400px] bg-[#fafaf9]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Property?
          </DialogTitle>
          <DialogDescription className="pt-1">
            This will permanently delete <span className="font-semibold text-foreground">{house?.name}</span> and all its information. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDelete}
            disabled={deleteHouse.isPending}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {deleteHouse.isPending ? "Deleting..." : "Yes, delete it"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

/* ── Add Modal ───────────────────────────────────────────────────────── */

function AddHouseModal({ onClose }: { onClose: () => void }) {
  const createHouse = useCreateHouse();
  const qc = useQueryClient();
  const [form, setForm] = useState<HouseFormState>(emptyForm());

  const set = (key: keyof HouseFormState, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleCreate = () => {
    createHouse.mutate(
      {
        data: {
          name: form.name,
          mapLink: form.mapLink || null,
          ownerName: form.ownerName,
          ownerPhone: form.ownerPhone || null,
          ownerEmail: form.ownerEmail || null,
          notes: form.notes || null,
          singleBeds: form.singleBeds ? parseInt(form.singleBeds) : null,
          doubleBeds: form.doubleBeds ? parseInt(form.doubleBeds) : null,
          babyBeds: form.babyBeds ? parseInt(form.babyBeds) : null,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
          entryCode: form.entryCode || null,
          status: form.status,
        },
      },
      {
        onSuccess: () => {
          toast.success("Property added");
          qc.invalidateQueries({ queryKey: getListHousesQueryKey() });
          qc.invalidateQueries({ queryKey: getGetHouseStatsQueryKey() });
          onClose();
        },
        onError: () => toast.error("Failed to add property"),
      }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden bg-[#fafaf9] max-h-[90vh] flex flex-col">
        <div className="bg-primary/5 p-6 border-b border-border shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add New Property
            </DialogTitle>
            <DialogDescription className="text-foreground/70">
              Fill in the property details below.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <Section title="Property Info">
            <Field label="Property Name *">
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Johnson Residence" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" /> Active
                      </span>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-muted-foreground" /> Inactive
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Entry Code">
                <Input value={form.entryCode} onChange={(e) => set("entryCode", e.target.value)} placeholder="e.g. 1234#" className="font-mono" />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Single Beds">
                <Input type="number" min="0" step="1" value={form.singleBeds} onChange={(e) => set("singleBeds", e.target.value)} placeholder="0" />
              </Field>
              <Field label="Double Beds">
                <Input type="number" min="0" step="1" value={form.doubleBeds} onChange={(e) => set("doubleBeds", e.target.value)} placeholder="0" />
              </Field>
              <Field label="Baby Beds">
                <Input type="number" min="0" step="1" value={form.babyBeds} onChange={(e) => set("babyBeds", e.target.value)} placeholder="0" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Bathrooms">
                <Input type="number" min="0" step="1" value={form.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} placeholder="e.g. 2" />
              </Field>
            </div>
          </Section>

          <Section title="Location">
            <Field label="Google Maps Link">
              <Input
                value={form.mapLink}
                onChange={(e) => set("mapLink", e.target.value)}
                placeholder="Paste any Google Maps link here"
              />
            </Field>
            <p className="text-xs text-muted-foreground px-1">
              Open Google Maps, drop a pin, tap Share, copy link, paste here.
            </p>
            {form.mapLink && (
              <button
                type="button"
                onClick={() => window.open(form.mapLink, "_blank")}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-md transition-colors"
              >
                <ExternalLink className="h-3 w-3" /> Test link
              </button>
            )}
          </Section>

          <Section title="Owner Details">
            <Field label="Owner Name">
              <Input value={form.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="e.g. Jane Smith" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone">
                <Input value={form.ownerPhone} onChange={(e) => set("ownerPhone", e.target.value)} placeholder="Optional" />
              </Field>
              <Field label="Email">
                <Input type="email" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} placeholder="Optional" />
              </Field>
            </div>
          </Section>

          <Section title="Notes">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Access codes, special instructions..."
              className="min-h-[100px] resize-none bg-amber-50/50 border-amber-200/50"
            />
          </Section>
        </div>

        <div className="p-4 border-t border-border/50 flex justify-end gap-3 bg-[#fafaf9] shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={createHouse.isPending || !form.name}
            className="min-w-[120px]"
          >
            {createHouse.isPending ? "Adding..." : "Add Property"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Small helpers ───────────────────────────────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-3 bg-white rounded-xl border border-border/50 p-4 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
