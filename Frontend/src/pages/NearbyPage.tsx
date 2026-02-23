import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { GradeBadge } from "@/components/GradeBadge";
import { Button } from "@/components/ui/button";
import { Droplets, Power, Navigation, Loader2 } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Toilet {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cleanliness_score: number;
  cleanliness_grade: string;
  is_operational: boolean;
  water_available: boolean;
  distance?: number;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function NearbyPage() {
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locError, setLocError] = useState("");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError("Geolocation not supported");
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setLocError("Location access denied. Please enable it.");
        setLoading(false);
      }
    );
  }, []);

  useEffect(() => {
    if (!userPos) return;
    supabase.from("toilets").select("*").then(({ data }) => {
      if (!data) { setLoading(false); return; }
      const nearby = (data as Toilet[])
        .map((t) => ({ ...t, distance: getDistanceKm(userPos.lat, userPos.lng, t.latitude, t.longitude) }))
        .filter((t) => t.distance <= 2)
        .sort((a, b) => b.cleanliness_score - a.cleanliness_score || (a.distance - b.distance));
      setToilets(nearby);
      setLoading(false);
    });
  }, [userPos]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Getting your location...</p>
      </div>
    );
  }

  if (locError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <Navigation className="mb-3 h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">{locError}</h2>
        <p className="text-muted-foreground mt-1">We need your location to find nearby toilets.</p>
        <Button className="mt-4" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nearby Clean Toilets</h1>
        <p className="text-muted-foreground">Within 2km of your location • sorted by cleanliness</p>
      </div>

      {userPos && toilets.length > 0 && (
        <div className="h-[300px] rounded-xl overflow-hidden border">
          <MapContainer
            center={[userPos.lat, userPos.lng]}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {toilets.map((t) => (
              <Marker key={t.id} position={[t.latitude, t.longitude]}>
                <Popup>
                  <strong>{t.name}</strong><br />
                  Grade {t.cleanliness_grade} • {Number(t.cleanliness_score).toFixed(0)}/100
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {toilets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No toilets found within 2km.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {toilets.map((t) => (
            <Card key={t.id} className="animate-fade-in">
              <CardContent className="flex items-center gap-4 p-4">
                <GradeBadge grade={t.cleanliness_grade} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{t.name}</h3>
                  <p className="text-sm text-muted-foreground">{t.distance?.toFixed(1)} km away</p>
                  <div className="mt-1 flex gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Droplets className={`h-3 w-3 ${t.water_available ? "text-primary" : "text-destructive"}`} />
                      {t.water_available ? "Water" : "No Water"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Power className={`h-3 w-3 ${t.is_operational ? "text-primary" : "text-destructive"}`} />
                      {t.is_operational ? "Open" : "Closed"}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{Number(t.cleanliness_score).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">/100</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
