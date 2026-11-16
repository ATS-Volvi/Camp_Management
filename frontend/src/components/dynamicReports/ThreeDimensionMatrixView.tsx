import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PivotMatrixResult, ReportConfig, ChartType } from "@/lib/dynamicReports/types";
import {
  Box,
  Compass,
  Download,
  Eye,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Sparkles,
  Share2,
  Layers,
  Palette,
  Hexagon,
  Circle,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

interface ThreeDimensionMatrixViewProps {
  matrix: PivotMatrixResult;
  config: ReportConfig;
  onChartTypeChange?: (type: ChartType) => void;
  className?: string;
}

type TowerShape = "box" | "cylinder" | "hexagon";
type ColorMode = "heatmap" | "series";
type ViewAngle = "iso" | "top" | "front" | "side";

interface HoveredPillarInfo {
  rowName: string;
  colName: string;
  value: number;
  formatted: string;
  percentage: number;
  x: number;
  y: number;
}

const SERIES_COLORS = [
  0x2563eb, // blue
  0xf97316, // orange
  0x10b981, // emerald
  0x8b5cf6, // violet
  0xec4899, // pink
  0x06b6d4, // cyan
  0xeab308, // amber
  0x64748b, // slate
];

// Color interpolation for heatmap (cool cobalt -> teal -> amber -> coral red)
function getHeatmapColor(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  const color = new THREE.Color();
  if (clamped < 0.33) {
    // 0x2563eb (blue) to 0x06b6d4 (cyan)
    const ratio = clamped / 0.33;
    color.lerpColors(new THREE.Color(0x2563eb), new THREE.Color(0x06b6d4), ratio);
  } else if (clamped < 0.66) {
    // 0x06b6d4 (cyan) to 0xf59e0b (amber)
    const ratio = (clamped - 0.33) / 0.33;
    color.lerpColors(new THREE.Color(0x06b6d4), new THREE.Color(0xf59e0b), ratio);
  } else {
    // 0xf59e0b (amber) to 0xef4444 (coral red)
    const ratio = (clamped - 0.66) / 0.34;
    color.lerpColors(new THREE.Color(0xf59e0b), new THREE.Color(0xef4444), ratio);
  }
  return color;
}

function createTextSprite(text: string, color = "#94a3b8", fontSize = 24): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const display = text.length > 16 ? text.slice(0, 14) + "…" : text;
  ctx.fillText(display, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(3.2, 0.8, 1);
  return sprite;
}

export default function ThreeDimensionMatrixView({
  matrix,
  config,
  onChartTypeChange,
  className = "",
}: ThreeDimensionMatrixViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Pillar meshes registry for raycasting
  const pillarsGroupRef = useRef<THREE.Group | null>(null);
  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
  const originalEmissiveRef = useRef<THREE.Color>(new THREE.Color(0, 0, 0));

  // Visual Controls
  const [towerShape, setTowerShape] = useState<TowerShape>("box");
  const [colorMode, setColorMode] = useState<ColorMode>("heatmap");
  const [heightScale, setHeightScale] = useState<number>(1.2);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredPillar, setHoveredPillar] = useState<HoveredPillarInfo | null>(null);
  const [graphMode, setGraphMode] = useState<"towers" | "network">(
    config.chartType === "3d_network" ? "network" : "towers"
  );

  const { chartData, chartSeriesKeys } = matrix;
  const grandTotalRaw = matrix.grandTotal?.raw || 1;

  // Max value calculation for normalization
  const maxVal = useMemo(() => {
    let m = 0;
    if (!chartData || chartData.length === 0) return 1;
    for (const row of chartData) {
      for (const key of chartSeriesKeys) {
        const val = Number(row[key]) || 0;
        if (val > m) m = val;
      }
    }
    return m > 0 ? m : 1;
  }, [chartData, chartSeriesKeys]);

  // Main Three.js Scene Setup & Re-render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x090d16); // High-tech deep slate navy
    scene.fog = new THREE.FogExp2(0x090d16, 0.015);

    // 2. Setup Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 480;
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    cameraRef.current = camera;
    camera.position.set(22, 18, 26);

    // 3. Setup WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clear old canvases
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going below floor
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(25, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 1.5, 60);
    pointLight.position.set(-15, 20, -15);
    scene.add(pointLight);

    const amberFillLight = new THREE.PointLight(0xf59e0b, 1.0, 50);
    amberFillLight.position.set(15, 12, 15);
    scene.add(amberFillLight);

    // 6. Build 3D Objects (Towers or Network)
    const pillarsGroup = new THREE.Group();
    pillarsGroupRef.current = pillarsGroup;
    scene.add(pillarsGroup);

    if (graphMode === "towers") {
      buildTowersGraph(pillarsGroup);
    } else {
      buildNetworkGraph(pillarsGroup);
    }

    // 7. Raycasting for Mouse Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(pillarsGroup.children, true);

      const hit = intersects.find((i) => i.object.userData && i.object.userData.isInteractable);
      if (hit) {
        const mesh = hit.object as THREE.Mesh;
        if (hoveredMeshRef.current !== mesh) {
          // Restore previous
          if (hoveredMeshRef.current && (hoveredMeshRef.current.material as THREE.MeshStandardMaterial)) {
            (hoveredMeshRef.current.material as THREE.MeshStandardMaterial).emissive.copy(
              originalEmissiveRef.current
            );
          }
          // Highlight current
          hoveredMeshRef.current = mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          originalEmissiveRef.current.copy(mat.emissive);
          mat.emissive.setHex(0x38bdf8);
        }

        const data = mesh.userData;
        setHoveredPillar({
          rowName: data.rowName,
          colName: data.colName,
          value: data.value,
          formatted: data.formatted,
          percentage: data.percentage,
          x: event.clientX,
          y: event.clientY,
        });
      } else {
        if (hoveredMeshRef.current && (hoveredMeshRef.current.material as THREE.MeshStandardMaterial)) {
          (hoveredMeshRef.current.material as THREE.MeshStandardMaterial).emissive.copy(
            originalEmissiveRef.current
          );
          hoveredMeshRef.current = null;
        }
        setHoveredPillar(null);
      }
    };

    const handlePointerLeave = () => {
      if (hoveredMeshRef.current && (hoveredMeshRef.current.material as THREE.MeshStandardMaterial)) {
        (hoveredMeshRef.current.material as THREE.MeshStandardMaterial).emissive.copy(
          originalEmissiveRef.current
        );
        hoveredMeshRef.current = null;
      }
      setHoveredPillar(null);
    };

    renderer.domElement.addEventListener("mousemove", handlePointerMove);
    renderer.domElement.addEventListener("mouseleave", handlePointerLeave);

    // 8. Responsive Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // 9. Animation Loop
    let isRunning = true;
    const animate = () => {
      if (!isRunning) return;
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 10. Cleanup
    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("mousemove", handlePointerMove);
      renderer.domElement.removeEventListener("mouseleave", handlePointerLeave);
      renderer.dispose();
      controls.dispose();
      scene.clear();
    };
  }, [chartData, chartSeriesKeys, towerShape, colorMode, heightScale, maxVal, graphMode]);

  // Sync autoRotate state with OrbitControls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Function to build 3D Towers Grid
  function buildTowersGraph(group: THREE.Group) {
    if (!chartData || chartData.length === 0 || chartSeriesKeys.length === 0) return;

    const numRows = chartData.length;
    const numCols = chartSeriesKeys.length;
    const spacingX = 2.4;
    const spacingZ = 2.4;
    const maxPillarHeight = 12 * heightScale;
    const pillarWidth = 1.6;

    const totalWidthX = numRows * spacingX;
    const totalDepthZ = numCols * spacingZ;

    // Floor Base Slab
    const slabGeo = new THREE.BoxGeometry(totalWidthX + 4, 0.4, totalDepthZ + 4);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -0.2, 0);
    slab.receiveShadow = true;
    group.add(slab);

    // Glowing Matrix Grid on floor
    const gridHelper = new THREE.GridHelper(
      Math.max(totalWidthX, totalDepthZ) + 4,
      Math.max(numRows, numCols) + 2,
      0x38bdf8,
      0x1e293b
    );
    gridHelper.position.set(0, 0.02, 0);
    group.add(gridHelper);

    // Row Axis Labels (X-axis)
    chartData.forEach((row, r) => {
      const x = (r - (numRows - 1) / 2) * spacingX;
      const z = ((numCols - 1) / 2) * spacingZ + 2.5;
      const sprite = createTextSprite(row.name, "#93c5fd", 22);
      sprite.position.set(x, 0.3, z);
      group.add(sprite);
    });

    // Column Axis Labels (Z-axis)
    chartSeriesKeys.forEach((colKey, c) => {
      const z = (c - (numCols - 1) / 2) * spacingZ;
      const x = -((numRows - 1) / 2) * spacingX - 2.5;
      const sprite = createTextSprite(colKey, "#fed7aa", 22);
      sprite.position.set(x, 0.3, z);
      group.add(sprite);
    });

    // Build Pillars
    chartData.forEach((row, r) => {
      const rowName = row.name;
      const x = (r - (numRows - 1) / 2) * spacingX;

      chartSeriesKeys.forEach((colKey, c) => {
        const z = (c - (numCols - 1) / 2) * spacingZ;
        const val = Number(row[colKey]) || 0;
        const normalized = val / maxVal;
        const h = Math.max(0.15, normalized * maxPillarHeight);

        // Geometry based on selected shape
        let geo: THREE.BufferGeometry;
        if (towerShape === "cylinder") {
          geo = new THREE.CylinderGeometry(pillarWidth * 0.45, pillarWidth * 0.48, h, 24);
        } else if (towerShape === "hexagon") {
          geo = new THREE.CylinderGeometry(pillarWidth * 0.5, pillarWidth * 0.5, h, 6);
        } else {
          geo = new THREE.BoxGeometry(pillarWidth, h, pillarWidth);
        }

        // Color computation
        let pillarColor: THREE.Color;
        if (colorMode === "heatmap") {
          pillarColor = getHeatmapColor(normalized);
        } else {
          pillarColor = new THREE.Color(SERIES_COLORS[c % SERIES_COLORS.length]);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: pillarColor,
          roughness: 0.35,
          metalness: 0.3,
          emissive: normalized > 0.85 ? new THREE.Color(pillarColor).multiplyScalar(0.2) : new THREE.Color(0, 0, 0),
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, h / 2, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const percentage = grandTotalRaw > 0 ? (val / grandTotalRaw) * 100 : 0;
        mesh.userData = {
          isInteractable: true,
          rowName,
          colName: colKey,
          value: val,
          formatted: val.toLocaleString(),
          percentage,
        };

        group.add(mesh);

        // Glowing cap or pedestal for prominent values
        if (val > 0) {
          const capGeo = new THREE.CylinderGeometry(pillarWidth * 0.52, pillarWidth * 0.52, 0.08, 16);
          const capMat = new THREE.MeshBasicMaterial({
            color: pillarColor,
            transparent: true,
            opacity: 0.8,
          });
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.set(x, h + 0.04, z);
          group.add(cap);
        }
      });
    });
  }

  // Function to build 3D Force-Directed Network Graph
  function buildNetworkGraph(group: THREE.Group) {
    if (!chartData || chartData.length === 0 || chartSeriesKeys.length === 0) return;

    // Center Node: Hub / Aggregate
    const hubGeo = new THREE.SphereGeometry(2.2, 32, 32);
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x0284c7,
    });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(0, 0, 0);
    hub.userData = {
      isInteractable: true,
      rowName: "Dynamic Studio Model",
      colName: "Central Hub",
      value: grandTotalRaw,
      formatted: grandTotalRaw.toLocaleString(),
      percentage: 100,
    };
    group.add(hub);

    const hubLabel = createTextSprite("CAMP HUB", "#38bdf8", 26);
    hubLabel.position.set(0, 3.2, 0);
    group.add(hubLabel);

    // Primary Nodes (Row categories in an outer ring)
    const numRows = chartData.length;
    const ringRadius = 14;

    const rowPositions: Record<string, THREE.Vector3> = {};

    chartData.forEach((row, i) => {
      const angle = (i / numRows) * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;
      const y = Math.sin(angle * 2) * 2; // subtle wave

      const pos = new THREE.Vector3(x, y, z);
      rowPositions[row.name] = pos;

      // Row aggregate sum
      let rowSum = 0;
      for (const k of chartSeriesKeys) {
        rowSum += Number(row[k]) || 0;
      }
      const radius = Math.max(0.8, Math.min(2.0, (rowSum / maxVal) * 1.8));

      const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.3,
        metalness: 0.4,
        emissive: 0x065f46,
      });
      const node = new THREE.Mesh(sphereGeo, sphereMat);
      node.position.copy(pos);
      node.userData = {
        isInteractable: true,
        rowName: row.name,
        colName: "Row Category",
        value: rowSum,
        formatted: rowSum.toLocaleString(),
        percentage: (rowSum / grandTotalRaw) * 100,
      };
      group.add(node);

      // Label
      const label = createTextSprite(row.name, "#6ee7b7", 22);
      label.position.set(x, y + radius + 1.2, z);
      group.add(label);

      // Link to central hub
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(x * 0.5, y + 2, z * 0.5),
        pos
      );
      const points = curve.getPoints(20);
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x0284c7,
        transparent: true,
        opacity: 0.4,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      group.add(line);
    });

    // Secondary Satellite Nodes (Columns/Measures radiating from Rows)
    chartData.forEach((row) => {
      const parentPos = rowPositions[row.name];
      if (!parentPos) return;

      chartSeriesKeys.forEach((colKey, cIndex) => {
        const val = Number(row[colKey]) || 0;
        if (val <= 0) return;

        const subAngle = (cIndex / chartSeriesKeys.length) * Math.PI * 2;
        const subDist = 4.2;
        const childPos = new THREE.Vector3(
          parentPos.x + Math.cos(subAngle) * subDist,
          parentPos.y + (cIndex % 2 === 0 ? 1.8 : -1.8),
          parentPos.z + Math.sin(subAngle) * subDist
        );

        const satRadius = Math.max(0.4, (val / maxVal) * 1.0);
        const satGeo = new THREE.SphereGeometry(satRadius, 16, 16);
        const satMat = new THREE.MeshStandardMaterial({
          color: SERIES_COLORS[cIndex % SERIES_COLORS.length],
          roughness: 0.4,
          metalness: 0.3,
        });
        const satMesh = new THREE.Mesh(satGeo, satMat);
        satMesh.position.copy(childPos);
        satMesh.userData = {
          isInteractable: true,
          rowName: row.name,
          colName: colKey,
          value: val,
          formatted: val.toLocaleString(),
          percentage: (val / grandTotalRaw) * 100,
        };
        group.add(satMesh);

        // Connecting filament line
        const filamentGeo = new THREE.BufferGeometry().setFromPoints([parentPos, childPos]);
        const filamentMat = new THREE.LineBasicMaterial({
          color: SERIES_COLORS[cIndex % SERIES_COLORS.length],
          transparent: true,
          opacity: 0.5,
        });
        const filament = new THREE.Line(filamentGeo, filamentMat);
        group.add(filament);
      });
    });
  }

  // Camera presets
  const setCameraAngle = (angle: ViewAngle) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (angle === "iso") {
      camera.position.set(22, 18, 26);
    } else if (angle === "top") {
      camera.position.set(0, 36, 0.01);
    } else if (angle === "front") {
      camera.position.set(0, 6, 32);
    } else if (angle === "side") {
      camera.position.set(32, 6, 0);
    }
    controls.target.set(0, 2, 0);
    controls.update();
  };

  // Snapshot PNG Export
  const handleSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `3d-dynamic-report-${config.dataset}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      className={`relative bg-[#090d16] border border-border/80 rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${
        isFullscreen ? "fixed inset-2 z-50 rounded-2xl flex flex-col" : "w-full"
      } ${className}`}
    >
      {/* 3D Top Header & Controls Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-200 z-10">
        {/* Left: Title & Mode Switcher */}
        <div className="flex items-center gap-2">
          <Box size={16} className="text-[#38bdf8]" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            3D Interactive Studio
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-2 py-0 border-sky-500/40 text-sky-400 bg-sky-950/40"
          >
            WebGL 360°
          </Badge>

          {/* Mode Switcher: Towers vs Network */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 ml-2">
            <Button
              size="sm"
              variant={graphMode === "towers" ? "default" : "ghost"}
              onClick={() => {
                setGraphMode("towers");
                if (onChartTypeChange) onChartTypeChange("3d_matrix");
              }}
              className="h-6 px-2 text-[11px] gap-1 bg-sky-600 hover:bg-sky-500 text-white"
              title="3D Isometric Towers Grid"
            >
              <Box size={12} /> 3D Towers
            </Button>
            <Button
              size="sm"
              variant={graphMode === "network" ? "default" : "ghost"}
              onClick={() => {
                setGraphMode("network");
                if (onChartTypeChange) onChartTypeChange("3d_network");
              }}
              className="h-6 px-2 text-[11px] gap-1 hover:text-white"
              title="3D Force-Directed Constellation Graph"
            >
              <Share2 size={12} /> 3D Network
            </Button>
          </div>
        </div>

        {/* Right: Camera Angles, Tower Options & Utilities */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Camera Angles */}
          <div className="flex items-center bg-slate-800/60 rounded-md p-0.5 border border-slate-700/60">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCameraAngle("iso")}
              className="h-6 px-1.5 text-[10px] text-slate-300 hover:text-white"
              title="Isometric 3D"
            >
              Iso
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCameraAngle("top")}
              className="h-6 px-1.5 text-[10px] text-slate-300 hover:text-white"
              title="Top Heatmap Plan"
            >
              Top
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCameraAngle("front")}
              className="h-6 px-1.5 text-[10px] text-slate-300 hover:text-white"
              title="Front Horizon"
            >
              Front
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCameraAngle("side")}
              className="h-6 px-1.5 text-[10px] text-slate-300 hover:text-white"
              title="Side Profile"
            >
              Side
            </Button>
          </div>

          {/* Tower Shapes (only in towers mode) */}
          {graphMode === "towers" && (
            <div className="flex items-center bg-slate-800/60 rounded-md p-0.5 border border-slate-700/60">
              <Button
                size="sm"
                variant={towerShape === "box" ? "secondary" : "ghost"}
                onClick={() => setTowerShape("box")}
                className="h-6 w-6 p-0"
                title="Square Towers"
              >
                <Square size={12} />
              </Button>
              <Button
                size="sm"
                variant={towerShape === "cylinder" ? "secondary" : "ghost"}
                onClick={() => setTowerShape("cylinder")}
                className="h-6 w-6 p-0"
                title="Cylinder Pillars"
              >
                <Circle size={12} />
              </Button>
              <Button
                size="sm"
                variant={towerShape === "hexagon" ? "secondary" : "ghost"}
                onClick={() => setTowerShape("hexagon")}
                className="h-6 w-6 p-0"
                title="Hexagonal Prisms"
              >
                <Hexagon size={12} />
              </Button>
            </div>
          )}

          {/* Color Mode Switcher */}
          {graphMode === "towers" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setColorMode(colorMode === "heatmap" ? "series" : "heatmap")}
              className="h-6 px-2 text-[10px] font-medium bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
              title="Toggle Heatmap vs Series Colors"
            >
              <Palette size={11} className="mr-1 text-amber-400" />
              {colorMode === "heatmap" ? "Heatmap" : "Series"}
            </Button>
          )}

          {/* Auto Rotate Toggle */}
          <Button
            size="sm"
            variant={autoRotate ? "default" : "outline"}
            onClick={() => setAutoRotate(!autoRotate)}
            className={`h-6 px-2 text-[10px] gap-1 font-medium ${
              autoRotate
                ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
            }`}
            title="Toggle Continuous 360° Orbit Presentation"
          >
            {autoRotate ? <Pause size={10} /> : <Play size={10} />}
            Orbit
          </Button>

          {/* Snapshot PNG */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSnapshot}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Capture High-Res 3D Image"
          >
            <Download size={13} />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-6 w-6 p-0 text-slate-300 hover:text-white hover:bg-slate-800"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D Studio"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </Button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className={`w-full relative cursor-grab active:cursor-grabbing ${
          isFullscreen ? "flex-1 min-h-[500px]" : "h-[420px]"
        }`}
      />

      {/* Height Scale Elevation Slider Overlay */}
      {graphMode === "towers" && (
        <div className="absolute bottom-3 left-4 bg-slate-900/85 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-slate-300 z-10">
          <Sliders size={12} className="text-sky-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Elevation:
          </span>
          <Slider
            value={[heightScale]}
            min={0.4}
            max={2.5}
            step={0.1}
            onValueChange={([val]) => setHeightScale(val)}
            className="w-20"
          />
          <span className="text-[10px] font-mono text-sky-300">{heightScale.toFixed(1)}x</span>
        </div>
      )}

      {/* Gesture Guide Hint Overlay */}
      <div className="absolute bottom-3 right-4 hidden sm:flex items-center gap-2 bg-slate-900/70 backdrop-blur-xs border border-slate-800 px-2.5 py-1 rounded-md text-[10px] text-slate-400 pointer-events-none z-10">
        <span>Left-click: Orbit</span>
        <span>•</span>
        <span>Right-click: Pan</span>
        <span>•</span>
        <span>Wheel: Zoom</span>
      </div>

      {/* Floating Raycaster Glass HUD Tooltip */}
      {hoveredPillar && (
        <div
          className="fixed pointer-events-none z-50 p-2.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-sky-500/50 shadow-2xl text-white text-xs max-w-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${hoveredPillar.x}px`,
            top: `${hoveredPillar.y}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
            <span className="font-bold text-sky-400 truncate max-w-[140px]">
              {hoveredPillar.rowName}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono">
              {hoveredPillar.percentage.toFixed(1)}% Total
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px] pt-0.5">
            <span className="text-slate-400 truncate pr-2">{hoveredPillar.colName}:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              {hoveredPillar.formatted}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}