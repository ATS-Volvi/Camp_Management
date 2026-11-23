import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CAMP_CLUSTER_NODES,
  SAMPLE_TRANSFERS,
  CampClusterNode,
  InterCampTransferManifest,
} from "@/data/enterpriseCateringSuiteData";
import {
  Truck,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Maximize2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
  QrCode,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LogisticsRadar3DProps {
  onSelectCamp?: (camp: CampClusterNode) => void;
  className?: string;
}

export default function LogisticsRadar3D({ onSelectCamp, className }: LogisticsRadar3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedCamp, setSelectedCamp] = useState<CampClusterNode>(CAMP_CLUSTER_NODES[0]);
  const [transfers, setTransfers] = useState<InterCampTransferManifest[]>(SAMPLE_TRANSFERS);
  const [activeTransfer, setActiveTransfer] = useState<InterCampTransferManifest>(SAMPLE_TRANSFERS[0]);
  const [manifestDispatched, setManifestDispatched] = useState(false);

  const handleDispatchManifest = () => {
    setManifestDispatched(true);
    toast.success(`Waybill ${activeTransfer.transferNumber} Dispatched!`, {
      description: `Driver ${activeTransfer.driverName} dispatched to ${activeTransfer.destCamp.name}. Saves SAR ${activeTransfer.savingsVsSupplierSAR.toLocaleString()}.`,
    });
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070c18);
    scene.fog = new THREE.FogExp2(0x070c18, 0.012);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 32, 42);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 15;
    controls.maxDistance = 70;
    controls.target.set(0, 2, 0);

    // 2. Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(15, 30, 15);
    scene.add(dirLight);

    // 3. Desert Terrain Grid / Radar Rings
    const radarGrid = new THREE.PolarGridHelper(32, 8, 8, 64, 0x06b6d4, 0x1e293b);
    radarGrid.position.y = -0.05;
    scene.add(radarGrid);

    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x081120,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    // 4. Camp Node Markers & Cylinders
    const nodeMeshes: THREE.Mesh[] = [];
    const nodeMap = new Map<number, CampClusterNode>();

    CAMP_CLUSTER_NODES.forEach((camp) => {
      const [x, z] = camp.coords;
      const isDeficit = camp.oilDaysCover < 3.0;
      const isSurplus = camp.oilDaysCover > 10.0;
      const color = isDeficit ? 0xef4444 : isSurplus ? 0x10b981 : 0x06b6d4;

      // Base Pad
      const padGeo = new THREE.CylinderGeometry(2.2, 2.4, 0.4, 32);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.5,
        roughness: 0.5,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.position.set(x, 0.2, z);
      scene.add(pad);

      // Tower Height = Days of Cover
      const towerHeight = Math.max(1.0, camp.oilDaysCover * 0.7);
      const towerGeo = new THREE.CylinderGeometry(1.2, 1.2, towerHeight, 32);
      const towerMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: isDeficit ? 0.45 : 0.2,
        roughness: 0.3,
        metalness: 0.4,
      });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.set(x, 0.4 + towerHeight / 2, z);
      scene.add(tower);

      // Radar Beacon Ring at Top
      const beaconGeo = new THREE.TorusGeometry(1.6, 0.08, 16, 32);
      const beaconMat = new THREE.MeshBasicMaterial({ color, wireframe: true });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.rotation.x = Math.PI / 2;
      beacon.position.set(x, 0.4 + towerHeight, z);
      scene.add(beacon);

      nodeMeshes.push(tower);
      nodeMap.set(tower.id, camp);
    });

    // 5. Parabolic 3D Transfer Arcs between Camps
    // Arc 1: From Camp-04 (Rig Central) to Camp-01 (Tanajib Main)
    const p1 = new THREE.Vector3(CAMP_CLUSTER_NODES[3].coords[0], 2, CAMP_CLUSTER_NODES[3].coords[1]);
    const p2 = new THREE.Vector3(CAMP_CLUSTER_NODES[0].coords[0], 2, CAMP_CLUSTER_NODES[0].coords[1]);
    const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    midPoint.y += 10.0; // Arch peak

    const curve = new THREE.QuadraticBezierCurve3(p1, midPoint, p2);
    const points = curve.getPoints(50);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
    const curveMat = new THREE.LineDashedMaterial({
      color: 0xfe932c,
      linewidth: 3,
      scale: 1,
      dashSize: 1,
      gapSize: 0.5,
    });
    const arcLine = new THREE.Line(curveGeo, curveMat);
    arcLine.computeLineDistances();
    scene.add(arcLine);

    // Glowing Animated Transport Dot along the Curve
    const dotGeo = new THREE.SphereGeometry(0.6, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xfe932c });
    const transportDot = new THREE.Mesh(dotGeo, dotMat);
    scene.add(transportDot);

    // 6. Raycast on Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodeMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const camp = nodeMap.get(hit.id);
        if (camp) {
          setSelectedCamp(camp);
          onSelectCamp?.(camp);
        }
      }
    };

    container.addEventListener("click", onClick);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Animate transport vehicle dot along the parabolic arc (0 to 1 loop)
      const loopT = (t * 0.25) % 1.0;
      const pos = curve.getPoint(loopT);
      transportDot.position.copy(pos);

      // Rotate radar grid slowly
      radarGrid.rotation.y = t * 0.05;

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
  }, [onSelectCamp]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Top Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0c2340] text-white shadow-sm border border-[#fe932c]/30">
        <div>
          <div className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-[#fe932c]" />
            <h3 className="text-base font-bold tracking-tight">
              3D Inter-Camp Redistribution Radar & Transfer Waybills
            </h3>
            <Badge variant="outline" className="text-[10px] bg-[#fe932c]/20 text-[#fe932c] border-[#fe932c]/40 font-bold uppercase">
              Desert Logistics Radar
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Visualizes stock across regional camps in real-time. Automatically proposes <strong>Inter-Camp Stock Transfers</strong> to resolve deficits without paying emergency rush vendor fees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-600 text-white font-mono text-xs">
            ⚡ Estimated Regional Savings: SAR 3,550
          </Badge>
        </div>
      </div>

      {/* Main 3D Stage + Waybill Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 3D Radar Stage */}
        <div className="lg:col-span-8 rounded-xl border border-border/80 bg-slate-950 overflow-hidden relative shadow-md">
          <div ref={mountRef} className="w-full h-[460px]" />

          {/* Radar Legend Overlay */}
          <div className="absolute top-3 left-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs space-y-1.5 backdrop-blur-md pointer-events-none text-white">
            <span className="font-bold text-[11px] block uppercase text-slate-400">Inventory Status Legend</span>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Red Tower: Deficit (&lt;3 Days of Cover)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Green Tower: Surplus (&gt;10 Days of Cover)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-4 bg-[#fe932c] rounded-full" />
              <span>Parabolic Arc: Active Inter-Camp Transfer</span>
            </div>
          </div>

          {/* Selected Camp Chip */}
          <div className="absolute bottom-3 left-3 p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-white">
            <span>Selected Beacon: </span>
            <strong className="text-[#fe932c]">{selectedCamp.name}</strong> ({selectedCamp.occupancy} workers)
          </div>
        </div>

        {/* Transfer Waybill & Dispatch Manifest */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm text-foreground">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#fe932c]" />
              <div>
                <h4 className="text-sm font-bold text-foreground">
                  Automated Transfer Manifest
                </h4>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {activeTransfer.transferNumber}
                </span>
              </div>
            </div>

            <Badge
              className={
                manifestDispatched
                  ? "bg-emerald-600 text-white font-mono text-[10px]"
                  : "bg-[#fe932c] text-slate-950 font-mono text-[10px] font-bold"
              }
            >
              {manifestDispatched ? "WAYBILL DISPATCHED" : "PROPOSED TRANSFER"}
            </Badge>
          </div>

          {/* Route Overview Card */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">From (Surplus)</span>
                <strong className="text-foreground">{activeTransfer.sourceCamp.name}</strong>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block font-mono">
                  {activeTransfer.sourceCamp.oilDaysCover} Days Cover
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#fe932c] shrink-0" />
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block uppercase font-bold">To (Deficit)</span>
                <strong className="text-foreground">{activeTransfer.destCamp.name}</strong>
                <span className="text-[10px] text-rose-600 dark:text-rose-400 block font-mono">
                  {activeTransfer.destCamp.oilDaysCover} Days Cover (Critical)
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div>Distance: <strong>{activeTransfer.distanceKm} km</strong></div>
              <div className="text-right">Transit Time: <strong>~{activeTransfer.estimatedDriveMins} mins</strong></div>
            </div>
          </div>

          {/* Manifest Line Items */}
          <div className="space-y-1.5 text-xs">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
              Item to Relocate
            </span>
            <div className="p-2.5 rounded-lg border border-border/60 bg-background flex items-center justify-between">
              <div>
                <strong className="text-foreground block">{activeTransfer.item}</strong>
                <span className="text-[10px] text-muted-foreground">
                  Qty: {activeTransfer.qty} {activeTransfer.unit}
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="font-bold text-primary">SAR {activeTransfer.valueSAR}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                  Saves SAR {activeTransfer.savingsVsSupplierSAR}
                </span>
              </div>
            </div>
          </div>

          {/* Driver & Logistics Sign-off */}
          <div className="p-2.5 rounded-lg border border-border/50 bg-muted/20 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assigned Driver:</span>
              <strong className="text-foreground">{activeTransfer.driverName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Vehicle Plate:</span>
              <span className="font-mono font-semibold text-foreground">{activeTransfer.plateNumber}</span>
            </div>
          </div>

          {/* Dispatch Button */}
          {manifestDispatched ? (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Waybill issued. Driver tracking enabled on UHF Radio / GPS.</span>
            </div>
          ) : (
            <Button
              onClick={handleDispatchManifest}
              className="w-full bg-[#fe932c] hover:bg-[#e68222] text-slate-950 font-bold text-xs gap-2 shadow-xs transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              Dispatch Inter-Camp Waybill
            </Button>
          )}

          <p className="text-[10px] text-muted-foreground">
            💡 <strong>Why Inter-Camp Transfer?</strong> Resolves emergency stockouts in 38 mins instead of waiting 4 days for commercial Aramco suppliers.
          </p>
        </div>
      </div>
    </div>
  );
}
