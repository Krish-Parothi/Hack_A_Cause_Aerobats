import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { GradeBadge } from "@/components/GradeBadge";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "lucide-react";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN || "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA";

const GRADE_COLORS: Record<string, string> = {
    A: '#27AE60', B: '#82E0AA', C: '#F4D03F', D: '#E67E22', F: '#C0392B'
};

export default function PublicDisplay() {
    const { facilityId } = useParams();
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    const [facility, setFacility] = useState<any>(null);
    const [facilities, setFacilities] = useState<any[]>([]);
    const [nearestClean, setNearestClean] = useState<any>(null);

    const fetchData = async () => {
        try {
            const res = await axios.get("http://localhost:8000/facilities");
            const data = res.data;
            setFacilities(data);

            const current = data.find((f: any) => String(f.id) === facilityId);
            setFacility(current);

            if (current && (current.grade === 'D' || current.grade === 'F')) {
                const nearbyRes = await axios.get(`http://localhost:8000/facilities/nearby/${facilityId}`);
                const cleanNearby = nearbyRes.data.filter((f: any) => f.grade === 'A' || f.grade === 'B' || f.grade === 'C');
                if (cleanNearby.length > 0) {
                    setNearestClean(cleanNearby[0]);
                } else {
                    setNearestClean(null);
                }
            } else {
                setNearestClean(null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [facilityId]);

    // Initialize map
    useEffect(() => {
        if (!mapContainer.current || !facility) return;

        if (!map.current) {
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: "mapbox://styles/mapbox/dark-v11",
                center: [facility.lng, facility.lat],
                zoom: 15,
                pitch: 45, // give it a cool 3D perspective
            });
        } else {
            // Re-center if the facility magically changes coordinates
            map.current.flyTo({ center: [facility.lng, facility.lat], zoom: 15 });
        }
    }, [facility]);

    // Plot markers
    useEffect(() => {
        if (!map.current || facilities.length === 0) return;

        // Clear existing markers securely
        const existing = document.getElementsByClassName('mapboxgl-marker');
        while (existing.length > 0) { existing[0].parentNode?.removeChild(existing[0]); }

        facilities.forEach(f => {
            const isCurrent = String(f.id) === facilityId;

            const container = document.createElement("div");
            container.className = `flex flex-col items-center mapboxgl-marker z-10 transition-all ${isCurrent ? "scale-125 z-50 animate-bounce" : "opacity-60 grayscale"}`;

            const pin = document.createElement("div");
            pin.className = "w-8 h-8 rounded-full border-4 border-white shadow-xl flex-shrink-0 relative z-20";
            pin.style.backgroundColor = GRADE_COLORS[f.grade] || '#444';

            if (isCurrent && (f.grade === 'D' || f.grade === 'F')) {
                pin.className += " ring-8 ring-red-500/80 animate-pulse";
            }

            const label = document.createElement("div");
            label.className = "bg-white/10 backdrop-blur-md px-3 py-1 rounded shadow-lg text-[12px] font-black mt-1 text-white border truncate max-w-[150px]";
            label.style.borderColor = GRADE_COLORS[f.grade] || '#555';
            label.textContent = f.name;

            container.appendChild(pin);
            container.appendChild(label);

            new mapboxgl.Marker({ element: container })
                .setLngLat([f.lng, f.lat])
                .addTo(map.current!);
        });
    }, [facilities, facilityId]);

    if (!facility) return <div className="flex justify-center items-center h-screen bg-slate-900"><div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;

    return (
        <div className="relative w-full h-screen overflow-hidden bg-slate-900 text-white flex flex-col">
            {/* Map Container as Background */}
            <div ref={mapContainer} className="absolute inset-0 z-0 opacity-80" />

            {/* Gradient Overlay for Readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/90 via-transparent to-slate-950/90 z-10 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-transparent to-transparent z-10 pointer-events-none" />

            {/* Content HUD */}
            <div className="relative z-20 p-8 md:p-12 flex flex-col h-full pointer-events-none">
                {/* Header Section */}
                <div className="w-full max-w-2xl transform transition-all duration-700 animate-slide-up">
                    <div className="inline-block bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 text-blue-300 font-bold tracking-widest text-sm mb-4 backdrop-saturate-150">
                        LIVE MONITORING &bull; ZERO MILE NODE
                    </div>
                    <h1 className="text-5xl lg:text-7xl font-black mb-4 drop-shadow-2xl leading-tight text-white">{facility.name}</h1>
                    <div className="flex items-center gap-4 border-l-4 border-blue-500 pl-4 py-1">
                        <span className="text-slate-300 text-lg uppercase tracking-wide font-semibold">Live Score Hub</span>
                        <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
                    </div>
                </div>

                {/* Score Widget */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-3xl shadow-2xl mt-12 w-fit transform transition-all hover:scale-105 pointer-events-auto">
                    <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">Current Hygiene Rating</h2>
                    <div className="flex items-center gap-6">
                        <GradeBadge grade={facility.grade} score={facility.score} size="xl" />
                        <div className="flex flex-col gap-2 border-l border-white/20 pl-6 py-2">
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-xs uppercase font-bold tracking-widest w-16">Status</span>
                                <span className={`text-sm font-bold px-3 py-1 rounded-full ${facility.status === 'open' ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-red-500/20 text-red-300 border border-red-500/50'}`}>
                                    {facility.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-xs uppercase font-bold tracking-widest w-16">Method</span>
                                <span className="text-sm font-semibold text-blue-200">{facility.method || 'System Verified'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Section and Alerts */}
                <div className="mt-auto pointer-events-auto">
                    {nearestClean && (
                        <div className="mb-6 bg-red-600/90 backdrop-blur-md rounded-2xl p-4 sm:p-6 border-b-4 border-red-800 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-slide-up transform hover:bg-red-600 transition-all origin-bottom">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse"><Navigation className="text-white" /></div>
                                <div>
                                    <h3 className="text-white font-black text-xl lg:text-2xl drop-shadow-md">ATTENTION: UNSANITARY CONDITIONS</h3>
                                    <p className="text-red-100 mt-1 font-medium">Please proceed to alternative pristine facility: <strong className="text-white">{nearestClean.name}</strong> • <span className="text-white bg-red-800/50 px-2 py-0.5 rounded font-bold">Grade {nearestClean.grade}</span></p>
                                </div>
                            </div>
                            <div className="text-center bg-black/30 rounded-xl px-6 py-3 border border-white/20 w-full sm:w-auto shrink-0 shadow-inner">
                                <div className="text-red-200 text-xs font-bold uppercase tracking-widest mb-1">Distance</div>
                                <div className="text-white font-black text-3xl">{(nearestClean.distance || 0).toFixed(2)}<span className="text-lg text-red-200 font-bold">km</span></div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-sm font-medium">SmartSan Digital Twin Protocol v2.1</span>
                            <span className="text-slate-500 text-xs font-semibold tracking-wide">Nagpur Municipal Corporation • Swachh Bharat Abhiyan</span>
                        </div>
                        <div className="text-right flex flex-col">
                            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Last System Sync</span>
                            <span className="text-blue-300 font-mono text-xl">{new Date().toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
