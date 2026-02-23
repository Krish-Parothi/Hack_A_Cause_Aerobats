import { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { GradeBadge } from "@/components/GradeBadge";
import { Button } from "@/components/ui/button";
import { Navigation, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA";

const GRADE_COLORS: Record<string, string> = {
  A: '#27AE60', B: '#82E0AA', C: '#F4D03F', D: '#E67E22', F: '#C0392B'
};

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [toilets, setToilets] = useState<any[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [finding, setFinding] = useState(false);

  const findNearbyLocations = async () => {
    setFinding(true);
    // Simulate Nagpur location grab
    setTimeout(async () => {
      const mockLat = 21.1458;
      const mockLng = 79.0882;
      setUserPos({ lat: mockLat, lng: mockLng });

      try {
        const res = await axios.get("http://localhost:8000/facilities");
        // Add artificial distances
        const withDistance = res.data.map((t: any) => ({ ...t, distance: getDistanceKm(mockLat, mockLng, t.lat, t.lng) }))
          .filter((t: any) => t.distance <= 5)
          .sort((a: any, b: any) => a.distance - b.distance);

        setToilets(withDistance);

        if (mapContainer.current) {
          if (!map.current) {
            map.current = new mapboxgl.Map({
              container: mapContainer.current,
              style: "mapbox://styles/mapbox/streets-v12",
              center: [mockLng, mockLat],
              zoom: 13,
            });
          } else {
            map.current.flyTo({ center: [mockLng, mockLat], zoom: 13 });
          }

          // Remove existing
          const markers = document.getElementsByClassName('mapboxgl-marker');
          while (markers.length > 0) { markers[0].parentNode?.removeChild(markers[0]); }

          // Add User Pin
          const userContainer = document.createElement("div");
          userContainer.className = "w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-xl animate-pulse";
          new mapboxgl.Marker({ element: userContainer }).setLngLat([mockLng, mockLat]).addTo(map.current);

          // Add Toilet Pins
          withDistance.forEach((f: any) => {
            const pin = document.createElement("div");
            pin.className = "w-6 h-6 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-[10px] font-bold";
            pin.style.backgroundColor = GRADE_COLORS[f.grade] || '#000';
            pin.textContent = f.grade;
            new mapboxgl.Marker({ element: pin }).setLngLat([f.lng, f.lat]).addTo(map.current!);
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setFinding(false);
      }
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto transform scale-[1.2] origin-top pt-8 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Find Nearby Toilets</h1>
          <p className="text-muted-foreground">Locate closest public facilities organized by distance and grade</p>
        </div>
        <Button onClick={findNearbyLocations} disabled={finding} className="mt-4 md:mt-0 shadow-md">
          {finding ? "Locating..." : "Find Near Me"}
        </Button>
      </div>

      <div className="h-[400px] rounded-xl overflow-hidden shadow-lg border-4 border-white bg-slate-100 relative">
        {!userPos && !finding && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-slate-50/80 backdrop-blur-sm">
            <div className="text-center p-6 bg-white rounded-xl shadow-xl max-w-sm">
              <MapPin className="h-10 w-10 text-blue-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg">Location Required</h3>
              <p className="text-sm text-slate-500 mb-4">Click the button above to authorize geolocation and scan the surrounding perimeter.</p>
              <Button onClick={findNearbyLocations}>Scan Perimeter</Button>
            </div>
          </div>
        )}
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      {toilets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {toilets.map((t) => (
            <Card key={t.id} className="animate-fade-in hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: GRADE_COLORS[t.grade] || '#ccc' }}>
              <CardContent className="flex items-center gap-4 p-5">
                <GradeBadge grade={t.grade} score={t.score} size="md" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{t.name}</h3>
                  <p className="text-sm text-blue-600 font-medium">{t.distance?.toFixed(2)} km away</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize font-medium">{t.status} facility</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="flex flex-col items-center">
                    <p className="text-2xl font-black leading-none">{Number(t.score).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Score</p>
                  </div>
                  <Link to={`/facility/${t.id}`}>
                    <Button size="sm" variant="outline" className="text-xs h-7 px-3">View</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
