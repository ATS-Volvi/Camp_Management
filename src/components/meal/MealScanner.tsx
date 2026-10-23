import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useScanMeal, MealType } from "@/hooks/useMealManagement";
import { CheckCircle2, AlertTriangle, Camera, CameraOff } from "lucide-react";
import { toast } from "sonner";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

function detectMeal(): MealType {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  return "dinner";
}

interface ScanResult {
  status: "ordered" | "unauthorized" | "duplicate" | "error";
  name: string;
  empCode: string;
  preference?: string | null;
  message?: string;
  ts: number;
}

export default function MealScanner() {
  const [meal, setMeal] = useState<MealType>(detectMeal());
  const [active, setActive] = useState(false);
  const [last, setLast] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<ScanResult[]>([]);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "meal-qr-scanner";
  const lastDecodedRef = useRef<{ id: string; ts: number } | null>(null);

  const scan = useScanMeal();

  const playBeep = (ok: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = ok ? 880 : 220;
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  };

  const handleDecoded = async (decoded: string) => {
    // throttle duplicate decodes within 2.5s
    const now = Date.now();
    if (lastDecodedRef.current && lastDecodedRef.current.id === decoded && now - lastDecodedRef.current.ts < 2500) {
      return;
    }
    lastDecodedRef.current = { id: decoded, ts: now };

    // Accept either raw uuid or JSON {employee_id}
    let employee_id = decoded.trim();
    try {
      const parsed = JSON.parse(decoded);
      if (parsed?.employee_id) employee_id = parsed.employee_id;
    } catch {}

    try {
      const res = await scan.mutateAsync({ employee_id, meal_type: meal });
      const r: ScanResult = {
        status: res.duplicate
          ? "duplicate"
          : res.is_ordered
            ? "ordered"
            : "unauthorized",
        name: (res.employee as any).name,
        empCode: (res.employee as any).employee_id,
        preference: res.preference,
        ts: now,
      };
      setLast(r);
      setRecent((p) => [r, ...p].slice(0, 8));
      playBeep(res.is_ordered && !res.duplicate);
    } catch (e: any) {
      const r: ScanResult = { status: "error", name: "Unknown", empCode: "—", message: e.message, ts: now };
      setLast(r);
      setRecent((p) => [r, ...p].slice(0, 8));
      playBeep(false);
      toast.error(e.message);
    }
  };

  const start = async () => {
    if (scannerRef.current) return;
    const html5 = new Html5Qrcode(containerId);
    scannerRef.current = html5;
    try {
      await html5.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        handleDecoded,
        () => {}
      );
      setActive(true);
    } catch (e: any) {
      toast.error("Camera error: " + e.message);
      scannerRef.current = null;
    }
  };

  const stop = async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      await s.stop();
      await s.clear();
    } catch {}
    scannerRef.current = null;
    setActive(false);
  };

  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>QR Meal Scanner</CardTitle>
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">Meal</Label>
                <Select value={meal} onValueChange={(v) => setMeal(v as MealType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TYPES.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m[0].toUpperCase() + m.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {active ? (
                <Button variant="destructive" onClick={stop}>
                  <CameraOff className="mr-2 h-4 w-4" /> Stop
                </Button>
              ) : (
                <Button onClick={start}>
                  <Camera className="mr-2 h-4 w-4" /> Start Scanner
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div id={containerId} className="rounded-lg overflow-hidden bg-black/90 mx-auto" style={{ maxWidth: 480 }} />
          {!active && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Press <strong>Start Scanner</strong> and grant camera access.
            </p>
          )}

          {last && (
            <div
              className={`mt-4 rounded-lg p-4 border-2 ${
                last.status === "ordered"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : last.status === "unauthorized"
                    ? "border-orange-500 bg-orange-500/10"
                    : last.status === "duplicate"
                      ? "border-yellow-500 bg-yellow-500/10"
                      : "border-destructive bg-destructive/10"
              }`}
            >
              <div className="flex items-center gap-3">
                {last.status === "ordered" ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                )}
                <div className="flex-1">
                  <div className="font-semibold text-lg">{last.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {last.empCode} · {meal}
                    {last.preference ? ` · ${last.preference === "veg" ? "Veg" : "Non-Veg"}` : ""}
                  </div>
                </div>
                <Badge
                  variant={last.status === "ordered" ? "default" : "destructive"}
                  className={
                    last.status === "ordered"
                      ? "bg-emerald-600 hover:bg-emerald-600"
                      : last.status === "duplicate"
                        ? "bg-yellow-600 hover:bg-yellow-600"
                        : ""
                  }
                >
                  {last.status === "ordered"
                    ? "✓ Ordered"
                    : last.status === "unauthorized"
                      ? "⚠ Not Ordered"
                      : last.status === "duplicate"
                        ? "Already Scanned"
                        : "Error"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Scans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-muted-foreground">No scans yet.</p>}
          {recent.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-sm border-b last:border-0 pb-2">
              <div>
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.empCode}</div>
              </div>
              <Badge
                variant="outline"
                className={
                  r.status === "ordered"
                    ? "border-emerald-500 text-emerald-700 dark:text-emerald-400"
                    : r.status === "unauthorized"
                      ? "border-orange-500 text-orange-700 dark:text-orange-400"
                      : r.status === "duplicate"
                        ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                        : "border-destructive text-destructive"
                }
              >
                {r.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
