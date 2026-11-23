import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  SERVING_LINES,
  SIMULATED_RECENT_SCANS,
  ServingLineStatus,
  EmployeeMealScanRecord,
} from "@/data/enterpriseCateringSuiteData";
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ScanLine,
  Flame,
  Clock,
  Sparkles,
  KeyRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface DiningHallDigitalTwin3DProps {
  className?: string;
}

export default function DiningHallDigitalTwin3D({ className }: DiningHallDigitalTwin3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedLine, setSelectedLine] = useState<ServingLineStatus>(SERVING_LINES[1]); // Asian buffet (congested)
  const [testScans, setTestScans] = useState<EmployeeMealScanRecord[]>(SIMULATED_RECENT_SCANS);
  const [activeScanModal, setActiveScanModal] = useState<EmployeeMealScanRecord | null>(null);

  const simulateScan = (duplicate: boolean) => {
    const newScan: EmployeeMealScanRecord = duplicate
      ? {
          employeeId: "11009837",
          employeeName: "Rajesh Kumar",
          department: "PMTA",
          campId: "camp-01",
          scanTime: new Date().toLocaleTimeString(),
          mealSession: "Lunch",
          hasApprovedPackedLunch: true,
          packedLunchRef: `PL-${new Date().getFullYear()}-0842`,
          scanResult: "blocked_duplicate",
        }
      : {
          employeeId: `1100${Math.floor(1000 + Math.random() * 9000)}`,
          employeeName: "Sultan Al-Shammari",
          department: "HERD",
          campId: "camp-01",
          scanTime: new Date().toLocaleTimeString(),
          mealSession: "Lunch",
          hasApprovedPackedLunch: false,
          scanResult: "granted",
        };

    setTestScans((prev) => [newScan, ...prev.slice(0, 5)]);
    setActiveScanModal(newScan);

    if (duplicate) {
      toast.error("ZERO-DUPLICATE SHIELD: Scan Blocked!", {
        description: `${newScan.employeeName} already has an approved packed lunch.`,
      });
    } else {
      toast.success("Meal Scan Granted", {
        description: `Verified entitlement for ${newScan.employeeName}.`,
      });
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08111e);
    scene.fog = new THREE.FogExp2(0x08111e, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 24, 32);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 15;
    controls.maxDistance = 65;
    controls.target.set(0, 2, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(15, 30, 20);
    scene.add(dirLight);

    // Floor of Mess Hall Facility
    const floorGeo = new THREE.PlaneGeometry(36, 26);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.2 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const grid = new THREE.GridHelper(36, 18, 0x06b6d4, 0x1e293b);
    grid.position.y = 0.01;
    scene.add(grid);

    // 4 Serving Line Turnstiles & Buffet Counters
    const lineMeshes: THREE.Mesh[] = [];
    const lineMap = new Map<number, ServingLineStatus>();

    SERVING_LINES.forEach((line, idx) => {
      const zPos = (idx - 1.5) * 5.5;

      // Serving Counter Table
      const counterGeo = new THREE.BoxGeometry(16, 1.2, 1.8);
      const counterMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 });
      const counter = new THREE.Mesh(counterGeo, counterMat);
      counter.position.set(-2, 0.6, zPos);
      scene.add(counter);

      // Queue Heat-Pillar at turnstile entry (Height = Queue Count, Color = status)
      const queueHeight = Math.max(1.0, line.queueCount * 0.22);
      const isCongested = line.status === "congested";
      const isBusy = line.status === "busy";
      const pillarColor = isCongested ? 0xef4444 : isBusy ? 0xf59e0b : 0x10b981;

      const pillarGeo = new THREE.CylinderGeometry(1.0, 1.2, queueHeight, 24);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: pillarColor,
        emissive: pillarColor,
        emissiveIntensity: isCongested ? 0.45 : 0.2,
        roughness: 0.3,
        metalness: 0.3,
      });

      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(8, queueHeight / 2, zPos);
      scene.add(pillar);

      // Wireframe glow
      const wireGeo = new THREE.EdgesGeometry(pillarGeo);
      const wire = new THREE.LineSegments(wireGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
      pillar.add(wire);

      lineMeshes.push(pillar);
      lineMap.set(pillar.id, line);
    });

    // Raycast on Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(lineMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const line = lineMap.get(hit.id);
        if (line) {
          setSelectedLine(line);
        }
      }
    };

    container.addEventListener("click", onClick);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Pulsing congested line
      lineMeshes.forEach((mesh) => {
        const line = lineMap.get(mesh.id);
        if (line?.status === "congested") {
          mesh.scale.set(1.0 + Math.sin(t * 3.5) * 0.05, 1.0, 1.0 + Math.sin(t * 3.5) * 0.05);
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("click", onClick);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Top Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0c2340] text-white shadow-sm border border-[#fe932c]/30">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#fe932c]" />
            <h3 className="text-base font-bold tracking-tight">
              3D Dining Hall Digital Twin & Zero-Duplicate Shield
            </h3>
            <Badge variant="outline" className="text-[10px] bg-[#fe932c]/20 text-[#fe932c] border-[#fe932c]/40 font-bold uppercase">
              Turnstile & Queue Twin
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Real-time heat-pillars indicate queue wait times across 4 buffet counters. Automatically intercepts double meal claims (packed lunch + mess hall).
          </p>
        </div>

        {/* Simulator Scanners */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => simulateScan(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            Simulate Duplicate Scan
          </Button>
          <Button
            size="sm"
            onClick={() => simulateScan(false)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Simulate Normal Scan
          </Button>
        </div>
      </div>

      {/* Main 3D Stage + Intercept Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 3D Isometric Hall Stage */}
        <div className="lg:col-span-8 rounded-xl border border-border/80 bg-slate-950 overflow-hidden relative shadow-md">
          <div ref={mountRef} className="w-full h-[460px]" />

          {/* Legend */}
          <div className="absolute top-3 left-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs space-y-1.5 backdrop-blur-md text-white pointer-events-none">
            <span className="font-bold text-[11px] block uppercase text-slate-400">Queue Wait Times</span>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Line 2 (Asian Buffet): 42 in queue (&gt;7m wait)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Line 4 (Express): 28 in queue (~4m wait)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Lines 1 & 3: Optimal (&lt;2.5m wait)</span>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-white">
            <span>Focused Counter: </span>
            <strong className="text-[#fe932c]">{selectedLine.lineName}</strong> ({selectedLine.activeServerStaff})
          </div>
        </div>

        {/* Scan Log & Shield Intercept Card */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm text-foreground">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              <h4 className="text-sm font-bold text-foreground">
                Turnstile Scan Stream
              </h4>
            </div>
            <Badge variant="outline" className="text-[10px] font-mono">
              Live RFID / QR
            </Badge>
          </div>

          {/* Active Scan Intercept Alert (Modal Banner) */}
          {activeScanModal && (
            <div
              className={`p-3 rounded-lg border text-xs animate-in zoom-in-95 duration-200 ${
                activeScanModal.scanResult === "blocked_duplicate"
                  ? "bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300"
                  : "bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {activeScanModal.scanResult === "blocked_duplicate" ? (
                  <>
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                    <span>DUPLICATE MEAL INTERCEPTED</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>ENTITLEMENT CONFIRMED</span>
                  </>
                )}
              </div>

              <p className="text-[11px] leading-relaxed">
                <strong>{activeScanModal.employeeName}</strong> (#{activeScanModal.employeeId}) &bull; {activeScanModal.department}
              </p>

              {activeScanModal.hasApprovedPackedLunch && (
                <div className="mt-2 p-2 rounded bg-card border border-border text-[10px] space-y-1">
                  <div className="text-rose-600 dark:text-rose-400 font-semibold">
                    Already received Field Packed Lunch at 05:30 AM today!
                  </div>
                  <div className="text-muted-foreground font-mono">
                    Requisition Ref: {activeScanModal.packedLunchRef}
                  </div>
                  <div className="pt-1 text-primary flex items-center gap-1 font-bold">
                    <KeyRound className="h-3 w-3" />
                    <span>Requires Supervisor PIN override to issue 2nd plate</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stream of Recent Scans */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Recent Serving Line Scans
            </span>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {testScans.map((sc, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                    sc.scanResult === "blocked_duplicate"
                      ? "border-rose-500/30 bg-rose-500/5 font-semibold"
                      : "border-border/50 bg-background"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          sc.scanResult === "blocked_duplicate" ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                      />
                      <strong className="text-foreground">{sc.employeeName}</strong>
                      <span className="text-muted-foreground text-[10px]">({sc.department})</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block ml-3.5">
                      {sc.scanTime} &bull; {sc.mealSession}
                    </span>
                  </div>

                  <span
                    className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      sc.scanResult === "blocked_duplicate"
                        ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                        : "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {sc.scanResult === "blocked_duplicate" ? "BLOCKED" : "GRANTED"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
