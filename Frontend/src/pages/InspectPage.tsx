import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Camera, Sparkles, Loader2 } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

interface Toilet { id: string; name: string; }

export default function InspectPage() {
  const navigate = useNavigate();
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [toiletId, setToiletId] = useState("");
  const [score, setScore] = useState(100);
  const [newFacilityName, setNewFacilityName] = useState("");
  const [newFacilityLat, setNewFacilityLat] = useState("");
  const [newFacilityLng, setNewFacilityLng] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get("http://localhost:8000/facilities").then(res => {
      // Convert INT ID to String to appease Shadcn UI Typescript
      const stringified = res.data.map((f: any) => ({ ...f, id: String(f.id) }));
      setToilets(stringified);
    }).catch(console.error);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max file size is 2MB"); return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const analyzeWithAI = async () => {
    if (!imageFile) return;
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      const res = await axios.post("http://localhost:8000/gemini-analyze", formData);
      const data = res.data.gemini;

      setScore(res.data.score ?? 100);
      setImagePreview(`data:image/jpeg;base64,${res.data.image_base64}`);

      toast.success("AI analysis complete! Fields auto-filled.", {
        description: `Backend Score: ${res.data.score ?? 100}`
      });
    } catch (err: any) {
      toast.error("AI analysis failed: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toiletId) return;
    setSubmitting(true);

    try {
      let targetId = toiletId;

      if (toiletId === "add_new") {
        if (!newFacilityName || !newFacilityLat || !newFacilityLng) {
          toast.error("Please fill out all new facility location details.");
          setSubmitting(false);
          return;
        }

        const createRes = await axios.post("http://localhost:8000/facilities", {
          name: newFacilityName,
          lat: parseFloat(newFacilityLat),
          lng: parseFloat(newFacilityLng)
        });

        targetId = String(createRes.data.id);
        setToilets(prev => [...prev, { id: targetId, name: createRes.data.name }]);
      }

      await axios.put(`http://localhost:8000/facilities/${targetId}/inspect`, {
        score: score
      });

      toast.success(toiletId === "add_new" ? "New facility created and scored!" : "Inspection submitted! Score updated.");
      setScore(100);
      setNewFacilityName("");
      setNewFacilityLat("");
      setNewFacilityLng("");
      setImageFile(null);
      setImagePreview(null);

      if (toiletId === "add_new") {
        setToiletId(targetId);
      }

      // Navigate to the precise facility details screen right after
      setTimeout(() => {
        navigate(`/facility/${targetId}`);
      }, 500);
    } catch (err: any) {
      toast.error("Submit failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 pt-12 pb-24 scale-[1.25] transform origin-top">
      <div>
        <h1 className="text-3xl font-bold">New Inspection</h1>
        <p className="text-muted-foreground">Submit a cleanliness inspection report</p>
      </div>

      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" /> Inspection Form</CardTitle>
          <CardDescription>Upload an image and use AI to auto-detect issues</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Select Toilet</Label>
              <Select value={toiletId} onValueChange={setToiletId}>
                <SelectTrigger><SelectValue placeholder="Choose a toilet..." /></SelectTrigger>
                <SelectContent>
                  {toilets.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                  <SelectItem value="add_new" className="font-semibold text-blue-600 border-t mt-1 pt-2">+ Add New Toilet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {toiletId === "add_new" && (
              <div className="space-y-4 p-4 border rounded-md bg-slate-50 animate-fade-in">
                <div className="space-y-2">
                  <Label>Facility Name</Label>
                  <Input placeholder="E.g. Smart City Park Restroom" value={newFacilityName} onChange={e => setNewFacilityName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Latitude</Label>
                    <Input placeholder="21.14" value={newFacilityLat} onChange={e => setNewFacilityLat(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Longitude</Label>
                    <Input placeholder="79.08" value={newFacilityLng} onChange={e => setNewFacilityLng(e.target.value)} />
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" className="w-full" onClick={() => {
                  toast.info("Fetching mock location...");
                  setTimeout(() => {
                    const mockLat = "21.1458";
                    const mockLng = "79.0882";
                    setNewFacilityLat(mockLat);
                    setNewFacilityLng(mockLng);
                    toast.success("Mock Zero Mile location acquired!");
                  }, 500);
                }}>
                  Use Simulated Location
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label>Inspection Image</Label>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-accent/50"
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-80 rounded-lg object-contain bg-black/5" />
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload (max 2MB)</span>
                  </>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              {imageFile && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={analyzeWithAI}
                  disabled={analyzing}
                >
                  {analyzing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing with AI...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Analyze with AI (Auto-fill)</>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="score">Estimated Score</Label>
              <Input
                id="score"
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-muted-foreground">Automatically calculated by AI or overridden manually</p>
            </div>

            <Button type="submit" className="w-full" disabled={!toiletId || submitting}>
              {submitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> Analysing hygiene conditions...</>
              ) : "Submit Inspection"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
