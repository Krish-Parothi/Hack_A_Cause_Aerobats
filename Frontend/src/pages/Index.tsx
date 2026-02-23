import React, { useEffect, useState, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { GradeBadge } from "@/components/GradeBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, MapPin, Navigation, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Initialize Mapbox with a token
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ;

const GRADE_COLORS = {
  A: '#27AE60', B: '#82E0AA', C: '#F4D03F', D: '#E67E22', F: '#C0392B'
};

export default function Index() {
  const getDistance = (lat, lng) => {
    const R = 6371;
    const dLat = (lat - 21.1458) * Math.PI / 180;
    const dLon = (lng - 79.0882) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(21.1458 * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  const mapContainer = useRef(null);
  const map = useRef(null);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const [nearby, setNearby] = useState({});
  const [addOpen, setAddOpen] = useState(false);
  const [newToilet, setNewToilet] = useState({ name: "", lat: "", lng: "", placeSearch: "" });
  const [locationStatus, setLocationStatus] = useState("");

  const getCurrentLocation = () => {
    setLocationStatus("Mocking location...");
    setTimeout(() => {
      // Hardcode exact Zero Mile location
      const mockLat = "21.1458";
      const mockLng = "79.0882";

      setNewToilet(prev => ({
        ...prev,
        lat: mockLat,
        lng: mockLng
      }));
      setLocationStatus("Mock location (Zero Mile) obtained successfully! ✓");
    }, 500);
  };

  const searchLocation = async () => {
    if (!newToilet.placeSearch) return;
    setLocationStatus("Searching...");
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newToilet.placeSearch)}`);
      if (res.data && res.data.length > 0) {
        setNewToilet(prev => ({
          ...prev,
          lat: res.data[0].lat,
          lng: res.data[0].lon
        }));
        setLocationStatus(`Found: ${res.data[0].display_name.split(',')[0]} ✓`);
      } else {
        setLocationStatus("Place not found. Try a different search.");
      }
    } catch (e) {
      setLocationStatus("Error searching location.");
    }
  };

  useEffect(() => {
    fetchFacilities();
    const interval = setInterval(fetchFacilities, 5000);

    // Listen for custom toast events
    const observer = (e) => toast(`Clicked Map Pin: ${e.detail.name}`, { description: `Current Grade: ${e.detail.grade}` });
    window.addEventListener('toast-trigger', observer);

    return () => {
      clearInterval(interval);
      window.removeEventListener('toast-trigger', observer);
    }
  }, []);

  useEffect(() => {
    if (!loading && facilities.length > 0 && mapContainer.current && !map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'raster-tiles': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [
            {
              id: 'simple-tiles',
              type: 'raster',
              source: 'raster-tiles',
              minzoom: 0,
              maxzoom: 22
            }
          ]
        },
        center: [79.0882, 21.1458],
        zoom: 13.5
      });

      map.current.on('load', () => {
        addMarkers(facilities);
      });
    }
  }, [loading, facilities]);

  const addMarkers = (data, pulsingId = null) => {
    if (!map.current) return;

    // For simplicity, just add markers without managing removing old ones 
    // since we use a basic implementation
    data.forEach(f => {
      // Create container
      const container = document.createElement("div");
      container.className = "flex flex-col items-center mapboxgl-marker z-10 hover:z-50 transition-all";
      container.onclick = () => {
        window.dispatchEvent(new CustomEvent('toast-trigger', { detail: { name: f.name, grade: f.grade } }));
      };

      // Pin element
      const pin = document.createElement("div");
      pin.className = "w-6 h-6 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform flex-shrink-0 relative z-20";
      pin.style.backgroundColor = GRADE_COLORS[f.grade] || '#000';

      if (pulsingId === f.id) {
        pin.className += " animate-pulse ring-4 ring-red-500/50";
      }

      // Label element
      const label = document.createElement("div");
      label.className = "bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded shadow-sm text-[10px] font-bold mt-1 text-slate-800 border truncate max-w-[120px]";
      label.style.borderColor = GRADE_COLORS[f.grade] || '#ccc';
      label.textContent = f.name;

      container.appendChild(pin);
      container.appendChild(label);

      new mapboxgl.Marker({ element: container })
        .setLngLat([f.lng, f.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
            `<div class="p-2 min-w-[150px]">
              <h3 class="font-bold text-sm mb-1">${f.name}</h3>
              <div class="flex items-center gap-2 mb-1">
                 <span class="font-bold border px-2 rounded" style="color: ${GRADE_COLORS[f.grade]}; border-color: ${GRADE_COLORS[f.grade]}">Grade ${f.grade}</span>
                 <span class="text-xs font-bold ${f.status === 'open' ? 'text-green-600' : 'text-red-600'}">${f.status.toUpperCase()}</span>
              </div>
              <p class="text-xs text-slate-500">Score: ${f.score}/100</p>
            </div>`
          )
        )
        .addTo(map.current);
    });
  };

  const fetchFacilities = async () => {
    try {
      const res = await axios.get("http://localhost:8000/facilities");
      setFacilities(res.data);
      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleScan = async (e, facilityId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(facilityId);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`http://localhost:8000/detect/${facilityId}`, formData);
      const newScoreData = res.data;

      // Update facility in current state
      setFacilities(prev => {
        const next = prev.map(f => f.id === facilityId ? {
          ...f,
          score: newScoreData.score,
          grade: newScoreData.grade,
          method: newScoreData.method,
          image_base64: typeof newScoreData.image_base64 === "string" ? newScoreData.image_base64 : newScoreData.detections,
          detections: Array.isArray(newScoreData.detections) ? newScoreData.detections : newScoreData.image_base64
        } : f);

        // Let's re-render markers by removing all existing elements with mapboxgl-marker class
        // (A bit hacky but works for demo)
        const markers = document.getElementsByClassName('mapboxgl-marker');
        while (markers.length > 0) { markers[0].parentNode.removeChild(markers[0]); }

        // Delay slight to allow state to settle
        const pulsingId = (newScoreData.grade === 'D' || newScoreData.grade === 'F') ? facilityId : null;
        setTimeout(() => addMarkers(next, pulsingId), 100);
        return next;
      });

      if (newScoreData.grade === 'D' || newScoreData.grade === 'F') {
        const facLocation = facilities.find(f => f.id === facilityId);
        fetchNearby(facilityId, newScoreData, facLocation?.lat, facLocation?.lng);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setUploading(null);
      // reset file input
      e.target.value = '';
    }
  };

  const fetchNearby = async (id, scoreData, lat, lng) => {
    try {
      const res = await axios.get(`http://localhost:8000/facilities/nearby/${id}`);
      // Get top 2 suitable alternatives
      const alternatives = res.data.filter(f => f.grade === 'A' || f.grade === 'B' || f.grade === 'C').slice(0, 2);

      // Switch to Map View instantly
      mapContainer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (lat && lng && map.current) {
        let html = `
          <div class="w-[280px] p-2">
            <div class="text-red-600 font-extrabold mb-3 pb-2 border-b text-sm leading-tight uppercase tracking-tight">
              ⚠️ This facility is rated ${scoreData.grade} — Find a cleaner option
            </div>
            <div class="space-y-2">
        `;

        alternatives.forEach(n => {
          html += `
             <div class="bg-white border rounded p-2 flex justify-between items-center shadow-sm">
               <div class="flex flex-col pr-2">
                 <span class="font-bold text-[13px] text-slate-800 leading-tight">${n.name}</span>
                 <span class="text-[11px] text-slate-500 flex items-center gap-1 mt-1">Grade <b style="color:${GRADE_COLORS[n.grade] || '#000'}">${n.grade}</b> &bull; ${n.distance?.toFixed(2)}km</span>
               </div>
               <a href="https://www.google.com/maps/dir/?api=1&destination=${n.lat},${n.lng}" target="_blank" class="bg-blue-50 text-blue-600 px-3 py-2 rounded-md font-bold text-xs shrink-0 hover:bg-blue-100 transition-colors">Navigate</a>
             </div>
           `;
        });

        html += `</div></div>`;

        new mapboxgl.Popup({ closeButton: true, maxWidth: '320px' })
          .setLngLat([lng, lat])
          .setHTML(html)
          .addTo(map.current);
      }

    } catch (e) {
      console.error(e);
    }
  };

  const deleteFacility = async (id) => {
    try {
      await axios.delete(`http://localhost:8000/facilities/${id}`);
      setFacilities(prev => {
        const next = prev.filter(f => f.id !== id);
        const markers = document.getElementsByClassName('mapboxgl-marker');
        // Refresh pins
        while (markers.length > 0) { markers[0].parentNode.removeChild(markers[0]); }
        setTimeout(() => addMarkers(next), 100);
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">SmartSan Facilities</h1>
          <p className="text-muted-foreground">Nagpur live hygiene monitoring</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 md:mt-0 gap-2"><Plus className="h-4 w-4" /> Add Toilet</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register New Facility</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Facility Name</Label>
                <Input placeholder="e.g. Nagpur Main Station Toilet" value={newToilet.name} onChange={(e) => setNewToilet({ ...newToilet, name: e.target.value })} />
              </div>

              <div className="space-y-2 border-t pt-4 mt-4">
                <Label className="text-base font-semibold">Location Setup</Label>
                <p className="text-sm text-slate-500 mb-2">How would you like to set the location?</p>

                <Button variant="outline" className="w-full flex gap-2 justify-center" onClick={getCurrentLocation}>
                  <MapPin size={16} /> Use My Current Location
                </Button>

                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">OR</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Search place name..."
                    value={newToilet.placeSearch}
                    onChange={(e) => setNewToilet({ ...newToilet, placeSearch: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                  />
                  <Button variant="secondary" onClick={searchLocation}>Search</Button>
                </div>

                {locationStatus && (
                  <p className={`text-sm mt-2 ${locationStatus.includes('✓') ? 'text-green-600 font-medium' : 'text-slate-600'}`}>
                    {locationStatus}
                  </p>
                )}
              </div>

              <Button className="w-full mt-6" disabled={!newToilet.name || !newToilet.lat || !newToilet.lng} onClick={async () => {
                const latNum = parseFloat(newToilet.lat);
                const lngNum = parseFloat(newToilet.lng);

                const isDuplicate = facilities.some(f =>
                  (Math.abs(f.lat - latNum) < 0.001 && Math.abs(f.lng - lngNum) < 0.001) ||
                  (f.name.toLowerCase() === newToilet.name.toLowerCase())
                );

                if (isDuplicate) {
                  setLocationStatus("Error: A facility already exists at this exact location!");
                  return;
                }

                try {
                  const res = await axios.post("http://localhost:8000/facilities", {
                    name: newToilet.name,
                    lat: latNum,
                    lng: lngNum
                  });
                  setFacilities(prev => [...prev, res.data]);
                  setAddOpen(false); // Close the popup upon success
                  setNewToilet({ name: "", lat: "", lng: "", placeSearch: "" });
                  setLocationStatus("");

                  // Reload the map to show the new pin
                  const markers = document.getElementsByClassName('mapboxgl-marker');
                  while (markers.length > 0) { markers[0].parentNode.removeChild(markers[0]); }
                  setTimeout(() => addMarkers([...facilities, res.data]), 100);

                } catch (e) {
                  console.error(e);
                  setLocationStatus("Error saving facility. Please try again.");
                }
              }}>Submit Facility</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl overflow-hidden shadow-lg h-[400px] bg-slate-100 relative">
        <div ref={mapContainer} className="w-full h-full" />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {facilities.map((f) => (
          <Card key={f.id} className="overflow-hidden transition-all hover:shadow-lg animate-fade-in relative border-t-4" style={{ borderTopColor: GRADE_COLORS[f.grade] || '#ccc' }}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <h3 className="font-semibold text-lg leading-tight">{f.name}</h3>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 hover:text-red-700 hover:bg-red-50 flex-shrink-0 mt-1" onClick={(e) => { e.preventDefault(); deleteFacility(f.id); }}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mb-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded-full text-white font-medium ${f.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}>
                      {f.status.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500 flex flex-wrap items-center gap-1">
                      <MapPin size={14} /> {getDistance(f.lat, f.lng)} km from Zero Mile
                    </span>
                  </div>
                  {f.method && (
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block mt-1 animate-fade-in">
                      {f.method}
                    </div>
                  )}
                </div>
                <div className="transition-transform duration-500 hover:scale-105">
                  <GradeBadge grade={f.grade} score={f.score} size="md" />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-4">
                <div className="flex gap-2 relative group overflow-hidden rounded-md">
                  <Button className="w-full flex gap-2 relative z-0 transition-all group-hover:bg-primary/90" variant="default" disabled={uploading === f.id}>
                    {uploading === f.id ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                    ) : (
                      <Camera size={16} />
                    )}
                    {uploading === f.id ? "Analyzing Image..." : "Scan Toilet"}
                  </Button>
                  <input
                    type="file"
                    onChange={(e) => handleScan(e, f.id)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    accept="image/*"
                    disabled={uploading === f.id}
                  />
                </div>

                <Link to={`/display/${f.id}`} className="w-full">
                  <Button variant="outline" className="w-full text-slate-600 hover:bg-slate-50 border-slate-200">View Public Display</Button>
                </Link>
              </div>

              {f.image_base64 && (
                <div className="mt-4 rounded border p-2 bg-slate-50 animate-fade-in shadow-inner">
                  <h4 className="text-sm font-semibold mb-2 text-slate-700">Scan Results:</h4>
                  <img src={`data:image/jpeg;base64,${f.image_base64}`} alt="Toilet Scan Result" className="w-full h-auto rounded-md object-cover mb-2" />

                  {f.detections && f.detections.length > 0 ? (
                    <div className="bg-white p-2 rounded text-xs border border-slate-200">
                      <strong className="text-slate-800 block mb-1">Issues Detected ({f.detections.length}):</strong>
                      <ul className="list-disc pl-4 text-slate-600 space-y-1">
                        {f.detections.map((d, i) => (
                          <li key={i}>
                            <span className="font-semibold">{d.class}</span>
                            <span className="text-slate-400 ml-1">({(d.confidence * 100).toFixed(0)}%)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="bg-green-50 text-green-700 p-2 rounded text-xs border border-green-100 font-medium">
                      ✓ No hygiene issues detected!
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 mb-4 text-center text-sm text-slate-500 border-t pt-6 max-w-2xl mx-auto">
        <p className="font-semibold text-slate-700 text-base mb-1">Nagpur Smart City Mission &bull; Swachh Bharat Abhiyan</p>
        <p>SmartSan Ecosystem Pilot - Nagpur Municipal Corporation</p>
      </div>
    </div>
  );
}
