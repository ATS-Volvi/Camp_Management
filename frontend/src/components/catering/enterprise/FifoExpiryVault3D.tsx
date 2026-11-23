import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  INVENTORY_BATCH_LOTS,
  InventoryBatchLot,
} from "@/data/enterpriseCateringSuiteData";
import {
  Recycle,
  AlertTriangle,
  Clock,
  Sparkles,
  Thermometer,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  PackageCheck,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FifoExpiryVault3DProps {
  className?: string;
}

export default function FifoExpiryVault3D({ className }: FifoExpiryVault3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedBatch, setSelectedBatch] = useState<InventoryBatchLot>(INVENTORY_BATCH_LOTS[0]);
  const [rescuedBatchId, setRescuedBatchId] = useState<string | null>(null);

  const handleApplyRecipeRescue = (batch: InventoryBatchLot) => {
    setRescuedBatchId(batch.lotId);
    toast.success(`Smart Recipe Rescue Scheduled!`, {
      description: `${batch.remainingQty} ${batch.unit} of ${batch.ingredientName} assigned to tomorrow's menu: ${batch.suggestedRescueRecipe}.`,
    });
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070e1b);
    scene.fog = new THREE.FogExp2(0x070e1b, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 12;
    controls.maxDistance = 60;
    controls.target.set(0, 4, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(15, 25, 20);
    scene.add(dirLight);

    // Chiller cyan cold light
    const coldLight = new THREE.PointLight(0x06b6d4, 2.0, 35);
    coldLight.position.set(-10, 8, 0);
    scene.add(coldLight);

    // Warehouse Floor Grid
    const grid = new THREE.GridHelper(36, 18, 0x06b6d4, 0x1e293b);
    scene.add(grid);

    // Build 3D Storage Rack Bays
    const rackBays = [
      { name: "Walk-in Chiller 1", x: -10, color: 0x06b6d4 },
      { name: "Walk-in Chiller 2", x: -3.5, color: 0x0ea5e9 },
      { name: "Deep Freeze A", x: 3.5, color: 0x3b82f6 },
      { name: "Dry Pantry 3", x: 10, color: 0xeab308 },
    ];

    const crateMeshes: THREE.Mesh[] = [];
    const crateMap = new Map<number, InventoryBatchLot>();

    rackBays.forEach((bay, bIdx) => {
      // 3D Metal Rack Frame
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
      const postGeo = new THREE.BoxGeometry(0.3, 10, 0.3);

      [-1.5, 1.5].forEach((zOff) => {
        [-2.0, 2.0].forEach((xOff) => {
          const post = new THREE.Mesh(postGeo, frameMat);
          post.position.set(bay.x + xOff, 5, zOff);
          scene.add(post);
        });
      });

      // Horizontal Shelves
      [1.5, 4.5, 7.5].forEach((yLvl) => {
        const shelfGeo = new THREE.BoxGeometry(4.3, 0.15, 3.2);
        const shelf = new THREE.Mesh(shelfGeo, frameMat);
        shelf.position.set(bay.x, yLvl, 0);
        scene.add(shelf);
      });

      // Place matching inventory crates on shelves
      const matchingBatches = INVENTORY_BATCH_LOTS.filter((l) => l.storageZone.includes(bay.name.split(" ")[0]) || bIdx === 0);
      matchingBatches.forEach((batch, cIdx) => {
        const yPos = 1.5 + (cIdx * 3.0) + 0.6;
        const crateGeo = new THREE.BoxGeometry(2.4, 1.2, 2.0);

        const isCritical = batch.status === "critical_rescue";
        const isWarning = batch.status === "warning";
        const crateColor = isCritical ? 0xef4444 : isWarning ? 0xf59e0b : 0x10b981;

        const crateMat = new THREE.MeshStandardMaterial({
          color: crateColor,
          emissive: crateColor,
          emissiveIntensity: isCritical ? 0.4 : 0.15,
          roughness: 0.4,
          metalness: 0.3,
        });

        const crate = new THREE.Mesh(crateGeo, crateMat);
        crate.position.set(bay.x, yPos, 0);
        scene.add(crate);

        // Wireframe edges
        const edges = new THREE.EdgesGeometry(crateGeo);
        const wire = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 }));
        crate.add(wire);

        crateMeshes.push(crate);
        crateMap.set(crate.id, batch);
      });
    });

    // Raycast on Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(crateMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const batch = crateMap.get(hit.id);
        if (batch) {
          setSelectedBatch(batch);
        }
      }
    };

    container.addEventListener("click", onClick);

    // Animation loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Pulse critical crates
      crateMeshes.forEach((mesh) => {
        const batch = crateMap.get(mesh.id);
        if (batch?.status === "critical_rescue") {
          mesh.scale.setScalar(1.0 + Math.sin(t * 4.0) * 0.03);
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
            <Recycle className="h-5 w-5 text-[#fe932c]" />
            <h3 className="text-base font-bold tracking-tight">
              3D FIFO Freshness Depletion Vault & AI Recipe Rescue
            </h3>
            <Badge variant="outline" className="text-[10px] bg-[#fe932c]/20 text-[#fe932c] border-[#fe932c]/40 font-bold uppercase">
              HACCP Shelf-Life Control
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Monitors cold-chain chillers and perishable lot expiry in real-time. Suggests instant <strong>Recipe Rescue</strong> actions to prevent food wastage before expiry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-rose-600 text-white font-mono text-xs animate-pulse">
            2 Batches Need Rescue (&lt;48h)
          </Badge>
        </div>
      </div>

      {/* Main 3D Stage + Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 3D Warehouse Stage */}
        <div className="lg:col-span-8 rounded-xl border border-border/80 bg-slate-950 overflow-hidden relative shadow-md">
          <div ref={mountRef} className="w-full h-[460px]" />

          {/* Legend Overlay */}
          <div className="absolute top-3 left-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs space-y-1.5 backdrop-blur-md text-white pointer-events-none">
            <span className="font-bold text-[11px] block uppercase text-slate-400">Shelf-Life Status</span>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Critical: &lt;48 Hours to Expiry</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Warning: 3–5 Days Remaining</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Fresh: &gt;7 Days Remaining</span>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-white">
            <span>Inspecting Lot: </span>
            <strong className="text-[#fe932c]">{selectedBatch.lotId}</strong> &bull; {selectedBatch.ingredientName}
          </div>
        </div>

        {/* Batch Inspection & Recipe Rescue Card */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm text-foreground">
          <div className="flex items-start justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {selectedBatch.storageZone} &bull; {selectedBatch.category}
              </span>
              <h4 className="text-base font-bold text-foreground">
                {selectedBatch.ingredientName}
              </h4>
              <span className="text-xs text-muted-foreground font-mono">
                {selectedBatch.lotId}
              </span>
            </div>

            <Badge
              className={
                selectedBatch.status === "critical_rescue"
                  ? "bg-rose-600 text-white font-mono text-[10px]"
                  : "bg-emerald-600 text-white font-mono text-[10px]"
              }
            >
              {selectedBatch.hoursUntilExpiry < 48 ? `${selectedBatch.hoursUntilExpiry}H LEFT` : "SAFE"}
            </Badge>
          </div>

          {/* HACCP & Lot Passport */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier / Invoice:</span>
              <strong className="text-foreground">{selectedBatch.supplierName} ({selectedBatch.invoiceRef})</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Received Date:</span>
              <span className="font-mono text-foreground">{selectedBatch.receivedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Expiry Date:</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{selectedBatch.expiryDate}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-border/40">
              <span className="text-muted-foreground flex items-center gap-1">
                <Thermometer className="h-3.5 w-3.5 text-cyan-500" />
                Chiller Cold Log:
              </span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                +{selectedBatch.haccpChillerTempC}°C (HACCP Compliant)
              </span>
            </div>
          </div>

          {/* Remaining Quantity */}
          <div className="p-2.5 rounded-lg border border-border/60 bg-background flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Remaining Stock in Batch:</span>
            <span className="text-base font-black font-mono text-foreground">
              {selectedBatch.remainingQty} / {selectedBatch.initialQty} {selectedBatch.unit}
            </span>
          </div>

          {/* Smart Recipe Rescue Recommendation */}
          {selectedBatch.suggestedRescueRecipe && (
            <div className="p-3 rounded-lg bg-[#fe932c]/10 border border-[#fe932c]/30 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-[#fe932c]">
                <Sparkles className="h-4 w-4" />
                <span>AI Recipe Rescue Recommendation</span>
              </div>
              <p className="text-foreground text-[11px] leading-relaxed">
                Consume remaining {selectedBatch.remainingQty} {selectedBatch.unit} before expiry by pairing with:
              </p>
              <div className="p-2 rounded bg-card border border-border font-bold text-xs text-primary">
                🍽️ {selectedBatch.suggestedRescueRecipe}
              </div>

              {rescuedBatchId === selectedBatch.lotId ? (
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Scheduled into Production Plan! Zero waste achieved.</span>
                </div>
              ) : (
                <Button
                  onClick={() => handleApplyRecipeRescue(selectedBatch)}
                  size="sm"
                  className="w-full bg-[#fe932c] hover:bg-[#e68222] text-slate-950 font-bold text-xs gap-1.5 shadow-xs"
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  Apply Recipe Rescue to Tomorrow's Menu
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
