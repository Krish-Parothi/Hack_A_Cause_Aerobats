import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { GradeBadge, GradeBadgeOutline } from "@/components/GradeBadge";
import { gradeColor } from "@/lib/gradeColor";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Toilet as ToiletIcon, AlertTriangle, TrendingUp, Activity, Droplets, Power, Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Toilet {
  id: string; name: string; address: string; latitude: number; longitude: number;
  cleanliness_score: number; cleanliness_grade: string; is_operational: boolean;
  water_available: boolean; total_inspections: number; last_updated: string;
}

interface Inspection {
  id: string; toilet_id: string; calculated_score: number; created_at: string;
  litter_count: number; wet_floor_detected: boolean; overflow_detected: boolean;
}

export default function DashboardPage() {
  const { role } = useAuth();
  const [toilets, setToilets] = useState<Toilet[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newToilet, setNewToilet] = useState({ name: "", address: "", latitude: "", longitude: "" });

  const fetchData = useCallback(async () => {
    const [{ data: t }, { data: i }] = await Promise.all([
      supabase.from("toilets").select("*").order("name"),
      supabase.from("toilet_inspections").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setToilets((t as Toilet[]) || []);
    setInspections((i as Inspection[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "toilets" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "toilet_inspections" }, () => fetchData())
      .subscribe();
    return () => { clearInterval(interval); supabase.removeChannel(channel); };
  }, [fetchData]);

  if (role !== "admin") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Admin access required.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const total = toilets.length;
  const gradeA = toilets.filter((t) => t.cleanliness_grade === "A").length;
  const gradeD = toilets.filter((t) => t.cleanliness_grade === "D").length;
  const avgScore = total ? toilets.reduce((s, t) => s + Number(t.cleanliness_score), 0) / total : 0;

  const gradeDist = ["A", "B", "C", "D"].map((g) => ({
    name: `Grade ${g}`,
    value: toilets.filter((t) => t.cleanliness_grade === g).length,
    color: gradeColor(g),
  }));

  const inspByToilet = toilets.map((t) => ({
    name: t.name.length > 12 ? t.name.slice(0, 12) + "…" : t.name,
    inspections: t.total_inspections,
  }));

  const trendData = inspections
    .slice(0, 20)
    .reverse()
    .map((i, idx) => ({ idx, score: Number(i.calculated_score) }));

  const alertToilets = toilets.filter((t) => t.cleanliness_grade === "D");

  const toggleField = async (id: string, field: "is_operational" | "water_available", value: boolean) => {
    const { error } = await supabase.from("toilets").update({ [field]: value }).eq("id", id);
    if (error) toast.error(error.message);
    else fetchData();
  };

  const addToilet = async () => {
    const { error } = await supabase.from("toilets").insert({
      name: newToilet.name,
      address: newToilet.address,
      latitude: parseFloat(newToilet.latitude),
      longitude: parseFloat(newToilet.longitude),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Toilet added!");
      setAddOpen(false);
      setNewToilet({ name: "", address: "", latitude: "", longitude: "" });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Real-time monitoring • Auto-refreshing</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Toilet</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add New Toilet</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={newToilet.name} onChange={(e) => setNewToilet({ ...newToilet, name: e.target.value })} /></div>
              <div><Label>Address</Label><Input value={newToilet.address} onChange={(e) => setNewToilet({ ...newToilet, address: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Latitude</Label><Input type="number" step="any" value={newToilet.latitude} onChange={(e) => setNewToilet({ ...newToilet, latitude: e.target.value })} /></div>
                <div><Label>Longitude</Label><Input type="number" step="any" value={newToilet.longitude} onChange={(e) => setNewToilet({ ...newToilet, longitude: e.target.value })} /></div>
              </div>
              <Button className="w-full" onClick={addToilet} disabled={!newToilet.name || !newToilet.address}>Add Toilet</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-primary/10 p-3"><ToiletIcon className="h-6 w-6 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total Toilets</p><p className="text-2xl font-bold">{total}</p></div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-grade-a/10 p-3"><TrendingUp className="h-6 w-6 text-grade-a" /></div>
            <div><p className="text-sm text-muted-foreground">Grade A</p><p className="text-2xl font-bold">{gradeA}</p></div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-grade-d/10 p-3"><AlertTriangle className="h-6 w-6 text-grade-d" /></div>
            <div><p className="text-sm text-muted-foreground">Grade D (Alert)</p><p className="text-2xl font-bold">{gradeD}</p></div>
          </CardContent>
        </Card>
        <Card className="animate-fade-in">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-primary/10 p-3"><Activity className="h-6 w-6 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Avg Score</p><p className="text-2xl font-bold">{avgScore.toFixed(0)}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Grade Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={gradeDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {gradeDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Inspections by Toilet</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={inspByToilet}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="inspections" fill="hsl(168, 80%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Cleanliness Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="idx" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="hsl(168, 80%, 36%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alertToilets.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Maintenance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {alertToilets.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-3">
                  <GradeBadge grade="D" size="sm" />
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">Score: {Number(t.cleanliness_score).toFixed(0)}</p>
                  </div>
                </div>
                <GradeBadgeOutline grade="D" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Toilet Controls */}
      <Card>
        <CardHeader><CardTitle>Toilet Controls</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {toilets.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
                <GradeBadge grade={t.cleanliness_grade} size="sm" />
                <div className="flex-1 min-w-[120px]">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(new Date(t.last_updated), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Power className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Operational</span>
                  <Switch checked={t.is_operational} onCheckedChange={(v) => toggleField(t.id, "is_operational", v)} />
                </div>
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Water</span>
                  <Switch checked={t.water_available} onCheckedChange={(v) => toggleField(t.id, "water_available", v)} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Inspections */}
      <Card>
        <CardHeader><CardTitle>Recent Inspections</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {inspections.slice(0, 10).map((insp) => {
              const toilet = toilets.find((t) => t.id === insp.toilet_id);
              return (
                <div key={insp.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{toilet?.name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      Litter: {insp.litter_count} • Wet: {insp.wet_floor_detected ? "Yes" : "No"} • Overflow: {insp.overflow_detected ? "Yes" : "No"}
                    </p>
                  </div>
                  <p className="font-mono font-bold">{Number(insp.calculated_score).toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(insp.created_at), { addSuffix: true })}
                  </p>
                </div>
              );
            })}
            {inspections.length === 0 && <p className="text-muted-foreground text-sm">No inspections yet.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
