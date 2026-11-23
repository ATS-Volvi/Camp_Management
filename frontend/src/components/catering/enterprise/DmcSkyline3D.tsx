import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PROJECT_DMC_DATA, ProjectDmcRecord } from "@/data/enterpriseCateringSuiteData";
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Info,
  ShieldAlert,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DmcSkyline3DProps {
  onSelectProject?: (project: ProjectDmcRecord) => void;
  className?: string;
}

export default function DmcSkyline3D({ onSelectProject, className }: DmcSkyline3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectDmcRecord>(PROJECT_DMC_DATA[0]);
  const [selectedSession, setSelectedSession] = useState<"breakfast" | "lunch" | "dinner" | "fieldPack" | "overall">("overall");
  const [budgetCeiling, setBudgetCeiling] = useState<number>(19.5); // SAR contractual ceiling
  const [hoveredTower, setHoveredTower] = useState<{
    project: ProjectDmcRecord;
    sessionName: string;
    cph: number;
    variance: number;
  } | null>(null);

  // Stats
  const avgCph = useMemo(() => {
    const total = PROJECT_DMC_DATA.reduce((acc, p) => acc + p.overallCphSAR, 0);
    return Number((total / PROJECT_DMC_DATA.length).toFixed(2));
  }, []);

  const overBudgetCount = useMemo(() => {
    return PROJECT_DMC_DATA.filter((p) => p.overallCphSAR > budgetCeiling).length;
  }, [budgetCeiling]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d);
    scene.fog = new THREE.FogExp2(0x0a101d, 0.015);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(22, 20, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Prevent under-floor looking
    controls.minDistance = 10;
    controls.maxDistance = 55;
    controls.target.set(0, 3, 0);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(20, 35, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const cyanPoint = new THREE.PointLight(0x06b6d4, 1.5, 40);
    cyanPoint.position.set(-15, 12, -15);
    scene.add(cyanPoint);

    const amberPoint = new THREE.PointLight(0xfe932c, 1.8, 40);
    amberPoint.position.set(15, 10, 15);
    scene.add(amberPoint);

    // 3. Ground Grid
    const gridHelper = new THREE.GridHelper(36, 18, 0xfe932c, 0x1e293b);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Subtle dark circular platform
    const platformGeo = new THREE.CylinderGeometry(19, 19, 0.4, 32);
    const platformMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.2;
    platform.receiveShadow = true;
    scene.add(platform);

    // 4. Floating Budget Ceiling Plane
    const ceilingHeight = budgetCeiling * 0.45; // scale factor
    const ceilingGeo = new THREE.PlaneGeometry(32, 24);
    const ceilingMat = new THREE.MeshPhysicalMaterial({
      color: 0xfe932c,
      transparent: true,
      opacity: 0.22,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      side: THREE.DoubleSide,
    });
    const ceilingPlane = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingPlane.rotation.x = -Math.PI / 2;
    ceilingPlane.position.y = ceilingHeight;
    scene.add(ceilingPlane);

    // Wireframe perimeter line for budget plane
    const ceilingEdges = new THREE.EdgesGeometry(ceilingGeo);
    const ceilingLine = new THREE.LineSegments(
      ceilingEdges,
      new THREE.LineBasicMaterial({ color: 0xfe932c, linewidth: 2 })
    );
    ceilingLine.rotation.x = -Math.PI / 2;
    ceilingLine.position.y = ceilingHeight;
    scene.add(ceilingLine);

    // 5. Build Towers
    // X-Axis = Projects (5 projects)
    // Z-Axis = Meal Sessions (4 sessions: Breakfast, Lunch, Dinner, FieldPack)
    const sessions = [
      { key: "breakfast", label: "Breakfast", zOffset: -6 },
      { key: "lunch", label: "Lunch", zOffset: -2 },
      { key: "dinner", label: "Dinner", zOffset: 2 },
      { key: "fieldPack", label: "Field Pack", zOffset: 6 },
    ] as const;

    const towerMeshes: THREE.Mesh[] = [];
    const interactiveDataMap = new Map<number, { project: ProjectDmcRecord; sessionName: string; cph: number; variance: number }>();

    PROJECT_DMC_DATA.forEach((proj, pIdx) => {
      const xPos = (pIdx - 2) * 5.5;

      sessions.forEach((sess) => {
        const cph = proj.sessions[sess.key].cph;
        const towerHeight = Math.max(0.4, cph * 0.75);
        const zPos = sess.zOffset;

        const isOverBudget = cph > budgetCeiling / 3.0; // Per-session threshold heuristic
        const color = isOverBudget ? 0xef4444 : 0x10b981; // Red vs Emerald

        const geo = new THREE.BoxGeometry(2.0, towerHeight, 2.0);
        const mat = new THREE.MeshStandardMaterial({
          color,
          roughness: 0.3,
          metalness: 0.4,
          emissive: isOverBudget ? 0xef4444 : 0x10b981,
          emissiveIntensity: isOverBudget ? 0.35 : 0.15,
        });

        const tower = new THREE.Mesh(geo, mat);
        tower.position.set(xPos, towerHeight / 2, zPos);
        tower.castShadow = true;
        tower.receiveShadow = true;
        scene.add(tower);

        // Edge wireframe for clean blueprint look
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({ color: isOverBudget ? 0xfca5a5 : 0xa7f3d0, transparent: true, opacity: 0.5 })
        );
        tower.add(line);

        towerMeshes.push(tower);
        interactiveDataMap.set(tower.id, {
          project: proj,
          sessionName: sess.label,
          cph,
          variance: Number((cph - (budgetCeiling / 3.0)).toFixed(2)),
        });
      });
    });

    // 6. Raycasting for hover & click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(towerMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const data = interactiveDataMap.get(hit.id);
        if (data) {
          setHoveredTower(data);
          container.style.cursor = "pointer";
          return;
        }
      }
      setHoveredTower(null);
      container.style.cursor = "default";
    };

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(towerMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const data = interactiveDataMap.get(hit.id);
        if (data) {
          setSelectedProject(data.project);
          onSelectProject?.(data.project);
        }
      }
    };

    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("click", onClick);

    // 7. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Subtle breathing pulse for budget ceiling
      ceilingPlane.position.y = ceilingHeight + Math.sin(elapsedTime * 2.0) * 0.08;
      ceilingLine.position.y = ceilingPlane.position.y;

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
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("click", onClick);
      renderer.dispose();
      scene.clear();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [budgetCeiling, onSelectProject]);

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Dynamic Reports Style Top Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0c2340] text-white shadow-sm border border-[#fe932c]/30">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[#fe932c]" />
            <h3 className="text-base font-bold tracking-tight">
              3D Food Cost & DMC Skyline (CPH vs Budget Ceiling)
            </h3>
            <Badge variant="outline" className="text-[10px] bg-[#fe932c]/20 text-[#fe932c] border-[#fe932c]/40 font-bold uppercase">
              Financial Digital Twin
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Visualizes <strong>Direct Material Cost Per Head (CPH)</strong> per project across all meal sessions.
            Towers breaching the translucent amber plane represent <strong>contract cost overruns</strong>.
          </p>
        </div>

        {/* Budget Ceiling Slider Control */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-xs">
          <div className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5 text-[#fe932c]" />
            <span className="text-slate-300 font-semibold">Budget Cap:</span>
            <span className="font-mono font-bold text-[#fe932c] text-sm">
              SAR {budgetCeiling.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={25}
            step={0.5}
            value={budgetCeiling}
            onChange={(e) => setBudgetCeiling(parseFloat(e.target.value))}
            className="w-24 accent-[#fe932c] cursor-pointer"
          />
        </div>
      </div>

      {/* Hero 3D Stage + Interactive Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 3D Canvas Container */}
        <div className="lg:col-span-8 rounded-xl border border-border/80 bg-slate-950 overflow-hidden relative shadow-md">
          <div ref={mountRef} className="w-full h-[460px]" />

          {/* Interactive Legend Overlay */}
          <div className="absolute top-3 left-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs space-y-1.5 backdrop-blur-md pointer-events-none text-white">
            <span className="font-bold text-[11px] block uppercase text-slate-400">3D Matrix Dimensions</span>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Tower Height: Actual CPH in SAR</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-4 bg-[#fe932c]/50 border border-[#fe932c]" />
              <span>Translucent Plane: SAR {budgetCeiling.toFixed(2)} Cap</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span>Red Pulse: Over Budget (&gt; Cap)</span>
            </div>
          </div>

          {/* Hover Tooltip Overlay */}
          {hoveredTower && (
            <div className="absolute bottom-4 left-4 p-3 rounded-xl bg-slate-900/95 border border-[#fe932c] text-white text-xs shadow-2xl backdrop-blur-md animate-in fade-in duration-150 pointer-events-none max-w-[280px]">
              <div className="font-bold text-sm text-[#fe932c] flex items-center justify-between">
                <span>{hoveredTower.project.projectName}</span>
                <span className="text-[10px] text-slate-400">({hoveredTower.project.projectCode})</span>
              </div>
              <div className="mt-1 space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Session:</span>
                  <strong className="text-white">{hoveredTower.sessionName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Session CPH:</span>
                  <strong className="text-white font-mono">SAR {hoveredTower.cph.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-700">
                  <span>Daily Overall CPH:</span>
                  <span className={`font-mono font-bold ${hoveredTower.project.overallCphSAR > budgetCeiling ? "text-rose-400" : "text-emerald-400"}`}>
                    SAR {hoveredTower.project.overallCphSAR.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Camera Reset Controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
              Left Click: Orbit · Right Click: Pan · Scroll: Zoom
            </span>
          </div>
        </div>

        {/* Selected Project Deep-Dive Panel */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm text-foreground">
          <div className="flex items-start justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {selectedProject.contractClient}
              </span>
              <h4 className="text-base font-bold text-foreground mt-0.5">
                {selectedProject.projectName}
              </h4>
              <Badge variant="outline" className="text-[10px] mt-1 font-mono font-semibold">
                {selectedProject.headcount} Workers On Site
              </Badge>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Daily CPH</span>
              <span
                className={`text-2xl font-black font-mono ${
                  selectedProject.overallCphSAR > budgetCeiling
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                SAR {selectedProject.overallCphSAR.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Variance Alert Banner */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
              selectedProject.overallCphSAR > budgetCeiling
                ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
            }`}
          >
            {selectedProject.overallCphSAR > budgetCeiling ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            )}
            <div>
              <strong className="block font-semibold">
                {selectedProject.overallCphSAR > budgetCeiling
                  ? `Over Budget by +SAR ${(selectedProject.overallCphSAR - budgetCeiling).toFixed(2)} / head`
                  : `Under Budget by SAR ${(budgetCeiling - selectedProject.overallCphSAR).toFixed(2)} / head`}
              </strong>
              <span className="text-[11px] opacity-80">
                Top Cost Driver: <strong>{selectedProject.topCostDriver}</strong>
              </span>
            </div>
          </div>

          {/* Session Cost Breakdown */}
          <div className="space-y-2">
            <span className="text-[11px] uppercase font-bold text-muted-foreground block">
              Direct Material Cost by Meal Session
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-muted-foreground text-[10px] block">Breakfast</span>
                <span className="font-mono font-bold text-foreground">SAR {selectedProject.sessions.breakfast.cph.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground block">SAR {selectedProject.sessions.breakfast.totalCostSAR.toLocaleString()} total</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-muted-foreground text-[10px] block">Lunch</span>
                <span className="font-mono font-bold text-foreground">SAR {selectedProject.sessions.lunch.cph.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground block">SAR {selectedProject.sessions.lunch.totalCostSAR.toLocaleString()} total</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-muted-foreground text-[10px] block">Dinner</span>
                <span className="font-mono font-bold text-foreground">SAR {selectedProject.sessions.dinner.cph.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground block">SAR {selectedProject.sessions.dinner.totalCostSAR.toLocaleString()} total</span>
              </div>
              <div className="p-2 rounded-lg bg-muted/40 border border-border/50">
                <span className="text-muted-foreground text-[10px] block">Field Pack</span>
                <span className="font-mono font-bold text-foreground">SAR {selectedProject.sessions.fieldPack.cph.toFixed(2)}</span>
                <span className="text-[10px] text-muted-foreground block">SAR {selectedProject.sessions.fieldPack.totalCostSAR.toLocaleString()} total</span>
              </div>
            </div>
          </div>

          {/* Grand Total */}
          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-muted-foreground">Total Daily DMC:</span>
            <span className="text-base font-bold font-mono text-primary">
              SAR {selectedProject.totalDailyDmcSAR.toLocaleString()} / day
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            💡 Click any other tower in the 3D skyline to instantly inspect project direct food material costing.
          </p>
        </div>
      </div>
    </div>
  );
}
