import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ENTERPRISE_RECIPES,
  scaleRecipe,
  DishRecipeMaster,
  ScaledRecipeResult,
} from "@/data/enterpriseCateringSuiteData";
import {
  Utensils,
  Flame,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Layers,
  ChefHat,
  Printer,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface CulinaryReactor3DProps {
  className?: string;
}

export default function CulinaryReactor3D({ className }: CulinaryReactor3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<DishRecipeMaster>(ENTERPRISE_RECIPES[0]);
  const [pax, setPax] = useState<number>(1280); // Default 1,280 workers

  const scaled = useMemo(() => {
    return scaleRecipe(selectedRecipe, pax);
  }, [selectedRecipe, pax]);

  const hasAnyShortage = useMemo(() => {
    return scaled.ingredients.some((i) => i.hasStockShortage);
  }, [scaled]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 16, 28);

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
    controls.maxDistance = 50;
    controls.target.set(0, 5, 0);

    // 2. Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(10, 25, 15);
    scene.add(dirLight);

    const reactorLight = new THREE.PointLight(0x06b6d4, 2.0, 30);
    reactorLight.position.set(0, 8, 0);
    scene.add(reactorLight);

    // 3. Reactor Vessel (Translucent Glass Cooking Deg / Cylinder)
    const vesselRadius = 6.0;
    const vesselHeight = 14.0;

    const glassGeo = new THREE.CylinderGeometry(vesselRadius, vesselRadius, vesselHeight, 32, 1, true);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      side: THREE.DoubleSide,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.y = vesselHeight / 2;
    scene.add(glassMesh);

    // Vessel Metal Rim & Base
    const rimGeo = new THREE.TorusGeometry(vesselRadius, 0.25, 16, 48);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.2 });

    const topRim = new THREE.Mesh(rimGeo, metalMat);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = vesselHeight;
    scene.add(topRim);

    const baseRim = new THREE.Mesh(rimGeo, metalMat);
    baseRim.rotation.x = Math.PI / 2;
    baseRim.position.y = 0;
    scene.add(baseRim);

    // Bottom heating burner platform
    const burnerGeo = new THREE.CylinderGeometry(vesselRadius * 1.15, vesselRadius * 1.25, 1.2, 32);
    const burnerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.4 });
    const burner = new THREE.Mesh(burnerGeo, burnerMat);
    burner.position.y = -0.6;
    scene.add(burner);

    // 4. Stacked Volumetric Ingredient Layers inside the vessel
    const layerMeshes: THREE.Mesh[] = [];
    let currentY = 0.2;

    const totalWeight = scaled.ingredients.reduce((a, b) => a + b.scaledQty, 0);

    scaled.ingredients.forEach((ing) => {
      // Layer height proportional to scaled weight
      const fraction = ing.scaledQty / (totalWeight || 1);
      const layerHeight = Math.max(0.6, fraction * (vesselHeight - 2.0));
      const radius = vesselRadius - 0.25;

      const layerGeo = new THREE.CylinderGeometry(radius, radius, layerHeight, 32);
      const hexColor = parseInt(ing.bom.colorHex.replace("#", "0x"), 16);

      const layerMat = new THREE.MeshStandardMaterial({
        color: ing.hasStockShortage ? 0xef4444 : hexColor,
        roughness: 0.4,
        metalness: 0.2,
        emissive: ing.hasStockShortage ? 0xef4444 : hexColor,
        emissiveIntensity: ing.hasStockShortage ? 0.4 : 0.1,
      });

      const layerMesh = new THREE.Mesh(layerGeo, layerMat);
      layerMesh.position.set(0, currentY + layerHeight / 2, 0);
      scene.add(layerMesh);

      // Wireframe overlay if shortage
      if (ing.hasStockShortage) {
        const wireGeo = new THREE.WireframeGeometry(layerGeo);
        const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        const wire = new THREE.LineSegments(wireGeo, wireMat);
        layerMesh.add(wire);
      }

      layerMeshes.push(layerMesh);
      currentY += layerHeight + 0.1;
    });

    // 5. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Slow gentle rotation of vessel
      glassMesh.rotation.y = t * 0.08;

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
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [selectedRecipe, scaled]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Dynamic Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0c2340] text-white shadow-sm border border-[#fe932c]/30">
        <div>
          <div className="flex items-center gap-2">
            <ChefHat className="h-5 w-5 text-[#fe932c]" />
            <h3 className="text-base font-bold tracking-tight">
              3D Recipe BOM Scaler & Kitchen Prep Volumetrics
            </h3>
            <Badge variant="outline" className="text-[10px] bg-[#fe932c]/20 text-[#fe932c] border-[#fe932c]/40 font-bold uppercase">
              Culinary Reactor
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Dynamically scales standard recipe Bill of Materials (BOM) to forecasted headcount. Highlights stock collisions in real-time.
          </p>
        </div>

        {/* Recipe Selector */}
        <div className="flex items-center gap-2">
          {ENTERPRISE_RECIPES.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedRecipe(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRecipe.id === r.id
                  ? "bg-[#fe932c] text-slate-950 font-bold shadow-xs"
                  : "bg-slate-900/80 text-slate-300 border border-slate-700 hover:text-white"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: 3D Vessel Stage + Scaled Prep Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 3D Vessel Stage */}
        <div className="lg:col-span-6 rounded-xl border border-border/80 bg-slate-950 overflow-hidden relative shadow-md">
          <div ref={mountRef} className="w-full h-[460px]" />

          {/* Pax Slider Overlay */}
          <div className="absolute top-3 left-3 right-3 p-3 rounded-xl bg-slate-900/95 border border-slate-700/80 text-xs backdrop-blur-md text-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-[#fe932c]" />
                Scale to Forecasted Headcount:
              </span>
              <span className="text-base font-mono font-black text-[#fe932c]">
                {pax.toLocaleString()} Pax
              </span>
            </div>
            <Slider
              min={100}
              max={2500}
              step={20}
              value={[pax]}
              onValueChange={(val) => setPax(val[0])}
              className="cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>100 Pax (Base)</span>
              <span>1,000 Pax</span>
              <span>2,500 Pax (Max Camp Shift)</span>
            </div>
          </div>

          {/* Collision Alert Banner */}
          {hasAnyShortage && (
            <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-lg bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2 backdrop-blur-md">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 animate-pulse" />
              <span>
                <strong>Stock Collision Detected!</strong> Some ingredients scale beyond current warehouse stock. Look for pulsing red layers.
              </span>
            </div>
          )}
        </div>

        {/* Scaled Kitchen Prep & Station Allocation Sheet */}
        <div className="lg:col-span-6 rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm text-foreground">
          <div className="flex items-start justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {selectedRecipe.cuisine} &bull; {selectedRecipe.mealSession}
              </span>
              <h4 className="text-base font-bold text-foreground">
                {selectedRecipe.name} ({selectedRecipe.arabicName})
              </h4>
              <span className="text-xs text-muted-foreground">
                Prep: {selectedRecipe.prepTimeMinutes}m &bull; Cook: {selectedRecipe.cookingTimeMinutes}m
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Scaled Batch Cost</span>
              <span className="text-xl font-bold font-mono text-primary">
                SAR {scaled.totalCostSAR.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                SAR {scaled.costPerPersonSAR.toFixed(2)} / person
              </span>
            </div>
          </div>

          {/* Scaled Ingredients Table */}
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-[10px] uppercase">
                  <th className="pb-1.5 text-left">Ingredient</th>
                  <th className="pb-1.5 text-left">Station</th>
                  <th className="pb-1.5 text-right">Required</th>
                  <th className="pb-1.5 text-right">Stock</th>
                  <th className="pb-1.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-mono">
                {scaled.ingredients.map((ing) => (
                  <tr key={ing.bom.ingredientId} className={ing.hasStockShortage ? "bg-rose-500/10 text-rose-700 dark:text-rose-300 font-bold" : ""}>
                    <td className="py-1.5 font-sans font-medium">{ing.bom.name}</td>
                    <td className="py-1.5 text-muted-foreground font-sans text-[10px]">{ing.bom.prepStation}</td>
                    <td className="py-1.5 text-right font-bold text-foreground">{ing.scaledQty} {ing.bom.unit}</td>
                    <td className="py-1.5 text-right text-muted-foreground">{ing.bom.warehouseStock} {ing.bom.unit}</td>
                    <td className="py-1.5 text-right">
                      {ing.hasStockShortage ? (
                        <span className="text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                          Short -{ing.shortageQty} {ing.bom.unit}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">
                          Available
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kitchen Station Workload Distribution */}
          <div className="pt-2 border-t border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1.5">
              Kitchen Station Workload Allocation
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              {scaled.stationWorkload.map((st) => (
                <div key={st.station} className="p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block truncate">{st.station}</span>
                  <span className="font-mono font-bold text-foreground">{st.totalWeightKg} kg</span>
                  <span className="text-[9px] text-muted-foreground block">({st.itemCount} items)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2 flex justify-end">
            <Button
              size="sm"
              className="bg-[#0c2340] text-white hover:bg-[#0c2340]/90 dark:bg-primary dark:text-primary-foreground text-xs gap-1.5 font-bold shadow-xs"
              onClick={() => alert(`Kitchen Batch Sheet for ${pax} portions sent to Chef Station Printers!`)}
            >
              <Printer className="h-3.5 w-3.5 text-[#fe932c]" />
              Print Kitchen Station Worksheets
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
