import { Layout } from "@/components/layout";
import { useListHouses } from "@workspace/api-client-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export default function MapPage() {
  const { data: houses, isLoading } = useListHouses();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <Layout><div className="h-full bg-muted/20" /></Layout>;

  return (
    <Layout>
      <div className="h-full w-full flex flex-col relative">
        {/* Map Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-[400] p-4 pointer-events-none">
          <Card className="pointer-events-auto max-w-sm w-full shadow-lg border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="p-4">
              <h1 className="text-lg font-bold">Property Map</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isLoading ? "Loading locations..." : `${houses?.length || 0} active locations`}
              </p>
            </div>
          </Card>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p>Loading map data...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 z-[0]">
            <MapContainer
              center={[39.5, -98.35]}
              zoom={4}
              style={{ height: "100%", width: "100%" }}
              className="z-0"
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              
              {houses?.map((house) => (
                <Marker 
                  key={house.id} 
                  position={[house.latitude, house.longitude]}
                >
                  <Popup className="rounded-xl overflow-hidden shadow-lg border-0 p-0">
                    <div className="min-w-[200px]">
                      <div className="bg-primary/10 px-3 py-2 border-b border-border">
                        <h3 className="font-bold text-foreground">{house.name}</h3>
                      </div>
                      <div className="p-3 space-y-3">
                        <p className="text-sm text-muted-foreground leading-tight">
                          {house.address}<br/>
                          {house.city}, {house.state} {house.zipCode}
                        </p>
                        <div className="flex justify-end pt-1">
                          <Link href={`/houses`} className="block w-full">
                            <Button size="sm" variant="secondary" className="w-full h-8 text-xs gap-1.5">
                              View Details <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </Layout>
  );
}