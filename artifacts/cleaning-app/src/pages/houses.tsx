import { Layout } from "@/components/layout";
import { useListHouses, useGetHouseStats, useGetHouse, getGetHouseQueryKey, useUpdateHouseNotes } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, BedDouble, Bath, Activity, CalendarDays } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function HousesPage() {
  const { data: houses, isLoading } = useListHouses();
  const { data: stats } = useGetHouseStats();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);

  const filteredHouses = houses?.filter(h => {
    const matchesSearch = h.name.toLowerCase().includes(search.toLowerCase()) || 
                          h.address.toLowerCase().includes(search.toLowerCase()) ||
                          h.ownerName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || h.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
            <p className="text-muted-foreground mt-1">Manage and view all cleaning locations.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-primary text-primary-foreground border-none">
            <CardContent className="p-4">
              <div className="text-primary-foreground/80 text-sm font-medium mb-1">Total Properties</div>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-1.5"><Activity size={14}/> Active</div>
              <div className="text-3xl font-bold text-foreground">{stats?.active || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-1.5"><CalendarDays size={14}/> Weekly</div>
              <div className="text-3xl font-bold text-foreground">{stats?.weekly || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-muted-foreground text-sm font-medium mb-1 flex items-center gap-1.5"><CalendarDays size={14}/> Bi-weekly</div>
              <div className="text-3xl font-bold text-foreground">{stats?.biweekly || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search properties, addresses, owners..." 
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
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-[200px] rounded-xl" />
            ))}
          </div>
        ) : filteredHouses?.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed">
            <div className="bg-secondary w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
              <Activity className="text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No properties found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHouses?.map(house => (
              <Card 
                key={house.id} 
                className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedHouseId(house.id)}
              >
                <CardContent className="p-0">
                  <div className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 pr-2">
                        <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors truncate">{house.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">{house.ownerName}</p>
                      </div>
                      <Badge variant="outline" className={cn(
                        "capitalize shrink-0",
                        house.status === "active" ? "text-green-600 bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-900" : "text-muted-foreground bg-muted"
                      )}>
                        {house.status}
                      </Badge>
                    </div>

                    <div className="flex items-start gap-2 text-sm text-foreground/80 bg-secondary/50 p-2.5 rounded-lg">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                      <span className="leading-snug">{house.address}, {house.city}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border/50">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5" title="Bedrooms">
                          <BedDouble className="h-4 w-4" /> {house.bedrooms || '-'}
                        </span>
                        <span className="flex items-center gap-1.5" title="Bathrooms">
                          <Bath className="h-4 w-4" /> {house.bathrooms || '-'}
                        </span>
                      </div>
                      <Badge variant="secondary" className="font-normal">{house.cleaningFrequency}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>

      {selectedHouseId && (
        <HouseDetailModal 
          houseId={selectedHouseId} 
          onClose={() => setSelectedHouseId(null)} 
        />
      )}
    </Layout>
  );
}

function HouseDetailModal({ houseId, onClose }: { houseId: number, onClose: () => void }) {
  const { data: house, isLoading } = useGetHouse(houseId, {
    query: { enabled: !!houseId, queryKey: getGetHouseQueryKey(houseId) }
  });
  const updateNotes = useUpdateHouseNotes();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [notesValue, setNotesValue] = useState("");

  useEffect(() => {
    if (house?.notes) {
      setNotesValue(house.notes);
    }
  }, [house?.notes]);

  const handleSaveNotes = () => {
    updateNotes.mutate({
      id: houseId,
      data: { notes: notesValue }
    }, {
      onSuccess: () => {
        toast({ title: "Notes saved successfully" });
        qc.setQueryData(getGetHouseQueryKey(houseId), (old: any) => 
          old ? { ...old, notes: notesValue } : old
        );
      },
      onError: () => {
        toast({ title: "Failed to save notes", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={!!houseId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        {isLoading || !house ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-[200px] w-full mt-4" />
          </div>
        ) : (
          <>
            <div className="bg-primary/5 p-6 border-b border-border">
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-2xl font-bold text-foreground mb-1">{house.name}</DialogTitle>
                    <DialogDescription className="text-base text-foreground/80 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" /> {house.address}, {house.city}, {house.state} {house.zipCode}
                    </DialogDescription>
                  </div>
                  <Badge className="capitalize text-sm px-3 py-1 bg-primary text-primary-foreground">{house.status}</Badge>
                </div>
              </DialogHeader>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Owner Details</h4>
                  <div className="bg-secondary/30 rounded-lg p-3 space-y-2 border border-border/50">
                    <p className="font-medium text-foreground">{house.ownerName}</p>
                    {house.ownerPhone && <p className="text-sm text-muted-foreground">{house.ownerPhone}</p>}
                    {house.ownerEmail && <p className="text-sm text-muted-foreground">{house.ownerEmail}</p>}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Property Specs</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                      <BedDouble className="h-5 w-5 mb-1 text-muted-foreground" />
                      <span className="text-lg font-bold leading-none">{house.bedrooms || '-'}</span>
                      <span className="text-[10px] text-muted-foreground uppercase mt-1">Beds</span>
                    </div>
                    <div className="bg-card border border-border/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                      <Bath className="h-5 w-5 mb-1 text-muted-foreground" />
                      <span className="text-lg font-bold leading-none">{house.bathrooms || '-'}</span>
                      <span className="text-[10px] text-muted-foreground uppercase mt-1">Baths</span>
                    </div>
                    <div className="col-span-2 bg-card border border-border/50 rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm font-medium">Frequency</span>
                      <Badge variant="secondary" className="capitalize">{house.cleaningFrequency}</Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="flex flex-col h-full">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notes</h4>
                  <div className="flex-1 flex flex-col gap-3">
                    <Textarea 
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add property access codes, special instructions, or cleaning preferences..."
                      className="flex-1 min-h-[160px] resize-none bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/50 dark:border-amber-900/50 focus-visible:ring-amber-500/30"
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