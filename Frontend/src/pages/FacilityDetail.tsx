import { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GradeBadge } from "@/components/GradeBadge";
import { ArrowLeft, Clock, MapPin, Navigation, Camera } from "lucide-react";
import axios from "axios";

const GRADE_COLORS: Record<string, string> = {
    A: '#27AE60', B: '#82E0AA', C: '#F4D03F', D: '#E67E22', F: '#C0392B'
};

export default function FacilityDetail() {
    const { facilityId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [facility, setFacility] = useState<any>(location.state?.facility || null);
    const [nearby, setNearby] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!facility) {
            axios.get("http://localhost:8000/facilities").then(res => {
                const found = res.data.find((f: any) => String(f.id) === facilityId);
                if (found) setFacility(found);
            }).catch(console.error);
        }
    }, [facility, facilityId]);

    useEffect(() => {
        if (facility && (facility.grade === 'D' || facility.grade === 'F')) {
            axios.get(`http://localhost:8000/facilities/nearby/${facilityId}`).then(res => {
                setNearby(res.data.filter((f: any) => f.grade === 'A' || f.grade === 'B' || f.grade === 'C').slice(0, 2));
            }).catch(console.error);
        }
    }, [facility, facilityId]);

    const handleScanAgain = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await axios.post(`http://localhost:8000/detect/${facilityId}`, formData);
            setFacility({
                ...facility,
                score: res.data.score,
                grade: res.data.grade,
                method: res.data.method,
                image_base64: res.data.image_base64,
                detections: res.data.detections
            });
            navigate(`/facility/${facilityId}`, {
                state: {
                    facility: {
                        ...facility,
                        score: res.data.score,
                        grade: res.data.grade,
                        method: res.data.method,
                        image_base64: res.data.image_base64,
                        detections: res.data.detections
                    }
                }, replace: true
            });
        } catch (err: any) {
            console.error(err);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    if (!facility) return <div className="text-center py-20 animate-pulse text-lg">Loading Facility Data...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in p-2">
            <Link to="/">
                <Button variant="ghost" className="gap-2 mb-2"><ArrowLeft size={16} /> Back to Map</Button>
            </Link>

            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                <div className="flex-1 space-y-4 text-center md:text-left">
                    <h1 className="text-3xl font-bold leading-tight">{facility.name}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-500">
                        <span className="flex items-center gap-1"><MapPin size={16} /> {facility.lat.toFixed(4)}, {facility.lng.toFixed(4)}</span>
                        <span className="flex items-center gap-1"><Clock size={16} /> {new Date().toLocaleTimeString()}</span>
                    </div>

                    <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                        <span className={`text-xs px-3 py-1 rounded-full text-white font-medium ${facility.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`}>
                            {facility.status.toUpperCase()}
                        </span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full border shadow-sm font-semibold">
                            {facility.method || "Inspection Verified"}
                        </span>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl shadow-inner border border-slate-200">
                    <GradeBadge grade={facility.grade} score={facility.score} size="lg" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button className="w-full text-lg h-14 bg-primary hover:bg-primary/90 shadow-md gap-2" disabled={uploading} onClick={() => fileRef.current?.click()}>
                    {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div> : <Camera size={20} />}
                    {uploading ? "Analyzing Request..." : "Scan Again"}
                </Button>
                <input type="file" className="hidden" ref={fileRef} accept="image/*" onChange={handleScanAgain} disabled={uploading} />

                <Link to={`/display/${facility.id}`}>
                    <Button variant="secondary" className="w-full text-lg h-14 shadow-sm border">Live Public Display</Button>
                </Link>
            </div>

            {facility.image_base64 && (
                <Card className="overflow-hidden border-2 border-slate-100 shadow-md">
                    <CardContent className="p-0">
                        <div className="bg-slate-50 border-b p-3">
                            <h3 className="font-semibold text-slate-700 flex items-center gap-2"><Camera size={18} /> Latest Scan Report</h3>
                        </div>
                        <img src={`data:image/jpeg;base64,${facility.image_base64}`} alt="Latest Facility Scan" className="w-full h-auto object-cover max-h-[80vh] bg-black/5" />
                    </CardContent>
                </Card>
            )}

            {(facility.grade === 'D' || facility.grade === 'F') && nearby.length > 0 && (
                <div className="p-5 mt-6 border-2 border-red-200 bg-red-50 rounded-xl shadow-sm">
                    <h3 className="text-red-700 font-bold text-lg mb-4 flex items-center gap-2">⚠️ Alternative Facilities Nearby</h3>
                    <div className="grid gap-3">
                        {nearby.map(n => (
                            <div key={n.id} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <span className="text-xl font-black w-8 text-center" style={{ color: GRADE_COLORS[n.grade] }}>{n.grade}</span>
                                    <div>
                                        <p className="font-semibold text-slate-800">{n.name}</p>
                                        <p className="text-sm text-slate-500">{n.distance?.toFixed(2)} km away</p>
                                    </div>
                                </div>
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${n.lat},${n.lng}`} target="_blank" rel="noreferrer" className="bg-blue-50 text-blue-600 p-3 rounded-lg hover:bg-blue-100 transition-colors">
                                    <Navigation size={20} />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
