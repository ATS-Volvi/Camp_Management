import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ComputedIngredientStatus } from "@/data/pantryCommandData";
import { Maximize2, RotateCcw, Eye, Compass, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PantrySkyline3DProps {
  ingredients: ComputedIngredientStatus[];
  onSelectIngredient: (item: ComputedIngredientStatus) => void;
  selectedIngredientId?: string | null;
}

export default function PantrySkyline3D({
  ingredients,
  onSelectIngredient,
  selectedIngredientId,
}: PantrySkyline3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<{
    item: ComputedIngredientStatus;
    x: number;
    y: number;
  } | null>(null);

  // Keep ref to latest props for Three.js render loop without recreating scene
  const ingredientsRef = useRef(ingredients);
  ingredientsRef.current = ingredients;

  const selectedIdRef = useRef(selectedIngredientId);
  selectedIdRef.current = selectedIngredientId;

  const controlsRef = useRef<OrbitControls | null>(null);
  const resetCameraRef = useRef<() => void>(() => {});

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#080c16");
    scene.fog = new THREE.FogExp2("#080c16", 0.018);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 36);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // --- 2. Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Do not go below floor
    controls.minDistance = 12;
    controls.maxDistance = 65;
    controls.target.set(0, 4, 0);
    controlsRef.current = controls;

    resetCameraRef.current = () => {
      camera.position.set(0, 18, 36);
      controls.target.set(0, 4, 0);
      controls.update();
    };

    // --- 3. Lights ---
    const ambientLight = new THREE.AmbientLight("#38bdf8", 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight("#ffffff", 1.2);
    dirLight.position.set(15, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.bias = -0.0001;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight("#06b6d4", 1.0);
    rimLight.position.set(-20, 15, -20);
    scene.add(rimLight);

    const pointLight = new THREE.PointLight("#10b981", 1.5, 40);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);

    // --- 4. Futuristic Floor Platform ---
    const floorGeo = new THREE.CylinderGeometry(24, 25, 0.8, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: "#0f172a",
      roughness: 0.6,
      metalness: 0.4,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.4;
    floor.receiveShadow = true;
    scene.add(floor);

    // Glowing Platform Rim Ring
    const rimGeo = new THREE.TorusGeometry(24.2, 0.15, 16, 100);
    const rimMat = new THREE.MeshBasicMaterial({ color: "#06b6d4" });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.05;
    scene.add(rim);

    // Cyber Grid
    const grid = new THREE.GridHelper(44, 44, "#06b6d4", "#1e293b");
    grid.position.y = 0.02;
    scene.add(grid);

    // --- 5. Translucent Floating Threshold Plane ---
    const THRESHOLD_HEIGHT_Y = 5.0 * 1.1; // ~5 days of cover scaled
    const planeGeo = new THREE.PlaneGeometry(36, 18);
    const planeMat = new THREE.MeshStandardMaterial({
      color: "#38bdf8",
      transparent: true,
      opacity: 0.28,
      roughness: 0.1,
      metalness: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const thresholdPlane = new THREE.Mesh(planeGeo, planeMat);
    thresholdPlane.rotation.x = Math.PI / 2;
    thresholdPlane.position.set(0, THRESHOLD_HEIGHT_Y, 0);
    scene.add(thresholdPlane);

    // Edge Line for Threshold Plane
    const edgeGeo = new THREE.EdgesGeometry(planeGeo);
    const edgeMat = new THREE.LineBasicMaterial({ color: "#38bdf8", linewidth: 2 });
    const planeEdges = new THREE.LineSegments(edgeGeo, edgeMat);
    planeEdges.rotation.x = Math.PI / 2;
    planeEdges.position.set(0, THRESHOLD_HEIGHT_Y, 0);
    scene.add(planeEdges);

    // --- 6. 14 Ingredient Towers (2 Rows of 7) ---
    const towerMeshes: Map<string, {
      mesh: THREE.Mesh;
      baseMesh: THREE.Mesh;
      wireframe: THREE.LineSegments;
      targetHeight: number;
      currentHeight: number;
      item: ComputedIngredientStatus;
      baseColor: string;
      emissiveColor: string;
    }> = new Map();

    const TOWER_WIDTH = 2.0;
    const TOWER_DEPTH = 2.0;
    const SPACING_X = 4.2;
    const SPACING_Z = 6.2;
    const START_X = -((7 - 1) * SPACING_X) / 2; // centered
    const ROW_Z = [-SPACING_Z / 2, SPACING_Z / 2];

    ingredientsRef.current.forEach((ing, index) => {
      const row = Math.floor(index / 7);
      const col = index % 7;
      const posX = START_X + col * SPACING_X;
      const posZ = ROW_Z[row];

      // Circular pedestal base
      const baseGeo = new THREE.CylinderGeometry(1.5, 1.6, 0.3, 32);
      const baseMat = new THREE.MeshStandardMaterial({ color: "#1e293b", roughness: 0.5, metalness: 0.5 });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.set(posX, 0.15, posZ);
      scene.add(baseMesh);

      // Tower Geometry (Box)
      const initialHeight = Math.max(0.4, ing.daysOfCoverLeft * 1.1);
      const boxGeo = new THREE.BoxGeometry(TOWER_WIDTH, 1, TOWER_DEPTH);
      boxGeo.translate(0, 0.5, 0); // origin at base

      let baseColor = "#10b981";
      let emissiveColor = "#059669";
      if (ing.status === "red") {
        baseColor = "#ef4444";
        emissiveColor = "#dc2626";
      } else if (ing.status === "amber") {
        baseColor = "#f59e0b";
        emissiveColor = "#d97706";
      }

      const boxMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        emissive: emissiveColor,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.3,
      });

      const towerMesh = new THREE.Mesh(boxGeo, boxMat);
      towerMesh.position.set(posX, 0.3, posZ);
      towerMesh.scale.y = initialHeight;
      towerMesh.castShadow = true;
      towerMesh.receiveShadow = true;
      towerMesh.userData = { ingredientId: ing.item.id };
      scene.add(towerMesh);

      // Wireframe highlight on top
      const wireGeo = new THREE.EdgesGeometry(boxGeo);
      const wireMat = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.15 });
      const wireframe = new THREE.LineSegments(wireGeo, wireMat);
      wireframe.position.copy(towerMesh.position);
      wireframe.scale.copy(towerMesh.scale);
      scene.add(wireframe);

      towerMeshes.set(ing.item.id, {
        mesh: towerMesh,
        baseMesh,
        wireframe,
        targetHeight: initialHeight,
        currentHeight: initialHeight,
        item: ing,
        baseColor,
        emissiveColor,
      });
    });

    // --- 7. Raycasting for Interaction ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-999, -999);
    let hoveredMesh: THREE.Mesh | null = null;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allMeshes = Array.from(towerMeshes.values()).map((v) => v.mesh);
      const intersects = raycaster.intersectObjects(allMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const id = hit.userData.ingredientId;
        const liveItem = ingredientsRef.current.find((i) => i.item.id === id);
        if (liveItem) {
          hoveredMesh = hit;
          setHoveredItem({
            item: liveItem,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
          container.style.cursor = "pointer";
          return;
        }
      }

      hoveredMesh = null;
      setHoveredItem(null);
      container.style.cursor = "default";
    };

    const handleClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allMeshes = Array.from(towerMeshes.values()).map((v) => v.mesh);
      const intersects = raycaster.intersectObjects(allMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const id = hit.userData.ingredientId;
        const liveItem = ingredientsRef.current.find((i) => i.item.id === id);
        if (liveItem) {
          onSelectIngredient(liveItem);

          // Focus camera towards clicked tower
          const targetPos = new THREE.Vector3();
          hit.getWorldPosition(targetPos);
          controls.target.lerp(targetPos, 0.8);
        }
      }
    };

    container.addEventListener("mousemove", handlePointerMove);
    container.addEventListener("click", handleClick);

    // --- 8. Resize Observer ---
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // --- 9. Animation Render Loop ---
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      controls.update();

      // Dynamic update of towers based on current simulation state
      const currentItems = ingredientsRef.current;
      const currentSelectedId = selectedIdRef.current;

      currentItems.forEach((ing) => {
        const entry = towerMeshes.get(ing.item.id);
        if (!entry) return;

        // Target height interpolation
        const targetH = Math.max(0.4, ing.daysOfCoverLeft * 1.1);
        entry.currentHeight += (targetH - entry.currentHeight) * 0.12;
        entry.mesh.scale.y = entry.currentHeight;
        entry.wireframe.scale.y = entry.currentHeight;

        // Color updates
        const mat = entry.mesh.material as THREE.MeshStandardMaterial;
        let targetColor = "#10b981";
        let targetEmissive = "#059669";
        let emissiveIntensity = 0.35;

        if (ing.status === "red") {
          targetColor = "#ef4444";
          targetEmissive = "#dc2626";
          // Dramatic pulsing red shader effect!
          emissiveIntensity = 0.35 + 0.65 * Math.abs(Math.sin(time * 5.0));
        } else if (ing.status === "amber") {
          targetColor = "#f59e0b";
          targetEmissive = "#d97706";
          emissiveIntensity = 0.3 + 0.2 * Math.sin(time * 2.5);
        }

        mat.color.set(targetColor);
        mat.emissive.set(targetEmissive);
        mat.emissiveIntensity = emissiveIntensity;

        // Highlight selected or hovered tower
        const isSelected = currentSelectedId === ing.item.id;
        const isHovered = hoveredMesh === entry.mesh;

        if (isSelected || isHovered) {
          entry.wireframe.material.opacity = 0.85;
          entry.wireframe.material.color.set("#ffffff");
          entry.mesh.scale.x = THREE.MathUtils.lerp(entry.mesh.scale.x, 1.15, 0.2);
          entry.mesh.scale.z = THREE.MathUtils.lerp(entry.mesh.scale.z, 1.15, 0.2);
        } else {
          entry.wireframe.material.opacity = 0.15;
          entry.wireframe.material.color.set(targetColor);
          entry.mesh.scale.x = THREE.MathUtils.lerp(entry.mesh.scale.x, 1.0, 0.2);
          entry.mesh.scale.z = THREE.MathUtils.lerp(entry.mesh.scale.z, 1.0, 0.2);
        }
      });

      // Gently pulse threshold plane
      thresholdPlane.position.y = THRESHOLD_HEIGHT_Y + Math.sin(time * 1.2) * 0.08;
      planeEdges.position.y = thresholdPlane.position.y;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handlePointerMove);
      container.removeEventListener("click", handleClick);
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onSelectIngredient]);

  return (
    <div className="relative w-full h-[460px] md:h-[540px] rounded-2xl overflow-hidden border border-cyan-500/20 bg-slate-950/80 shadow-2xl backdrop-blur-xl">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Interactive HUD Overlay */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <div className="px-3 py-1.5 rounded-lg bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 text-xs font-mono text-cyan-300 flex items-center gap-2">
          <Compass className="h-3.5 w-3.5 text-cyan-400 animate-spin" style={{ animationDuration: "12s" }} />
          <span>3D PANTRY SKYLINE</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => resetCameraRef.current()}
          className="h-8 text-xs bg-slate-900/80 backdrop-blur-md border-white/10 hover:border-cyan-500/40 text-slate-300 gap-1.5"
          title="Reset Camera View"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset View
        </Button>
      </div>

      {/* Legend & Threshold Plane Indicator */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 z-10 text-[11px] font-mono bg-slate-900/85 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10">
        <span className="text-slate-400 font-semibold mr-1">STATUS:</span>
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          &gt; Safe Buffer
        </span>
        <span className="flex items-center gap-1.5 text-amber-400 ml-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
          Near Threshold
        </span>
        <span className="flex items-center gap-1.5 text-rose-400 ml-2">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_#ef4444]" />
          Below Threshold (Buy Today)
        </span>
        <span className="border-l border-white/20 pl-2 ml-2 flex items-center gap-1.5 text-cyan-300">
          <span className="w-3 h-0.5 bg-cyan-400 shadow-[0_0_6px_#38bdf8]" />
          Threshold Plane (5d)
        </span>
      </div>

      {/* Mouse Hover Glass Tooltip */}
      {hoveredItem && (
        <div
          className="pointer-events-none absolute z-20 px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-xs shadow-2xl transition-transform"
          style={{
            left: `${Math.min(hoveredItem.x + 15, (mountRef.current?.clientWidth || 800) - 210)}px`,
            top: `${Math.max(hoveredItem.y - 70, 15)}px`,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold text-white text-sm flex items-center gap-1.5">
              <span>{hoveredItem.item.item.icon}</span>
              {hoveredItem.item.item.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                hoveredItem.item.status === "red"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : hoveredItem.item.status === "amber"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              }`}
            >
              {hoveredItem.item.status === "red" ? "CRITICAL" : hoveredItem.item.status === "amber" ? "LOW" : "OPTIMAL"}
            </span>
          </div>

          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[11px]">
            <span className="text-slate-400">Stock Cover:</span>
            <span className="text-right font-bold text-cyan-300">{hoveredItem.item.daysOfCoverLeft} Days</span>

            <span className="text-slate-400">Threshold:</span>
            <span className="text-right text-slate-300">{hoveredItem.item.effectiveThreshold} Days</span>

            <span className="text-slate-400">Burn Rate:</span>
            <span className="text-right text-slate-300">{hoveredItem.item.effectiveDailyUsage} {hoveredItem.item.item.unit}/day</span>

            <span className="text-slate-400">Supplier:</span>
            <span className="text-right text-slate-300 truncate max-w-[100px]">{hoveredItem.item.item.supplierName}</span>
          </div>

          <div className="mt-1 pt-1 border-t border-white/10 text-[10px] text-cyan-400 flex items-center justify-between">
            <span>{hoveredItem.item.urgencyLabel}</span>
            <span className="text-slate-400">Click for details &rarr;</span>
          </div>
        </div>
      )}
    </div>
  );
}
