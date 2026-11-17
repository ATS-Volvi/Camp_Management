import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PivotMatrixResult, ReportConfig, ChartType } from "@/lib/dynamicReports/types";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  LineChart as LineIcon,
  ArrowLeft,
  ArrowUpDown,
  EyeOff,
  Filter,
  Download,
  Maximize2,
  Minimize2,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Layers,
  Palette,
  Hexagon,
  Circle,
  Square,
  RotateCcw,
  Hash,
  X,
  Check,
  Target,
  GitCompare,
  Users,
  AlertTriangle,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import DrilldownRecordsModal from "./DrilldownRecordsModal";

interface ThreeDimensionMatrixViewProps {
  matrix: PivotMatrixResult;
  config: ReportConfig;
  onChartTypeChange?: (type: ChartType) => void;
  onConfigChange?: (config: ReportConfig) => void;
  rawRecords?: Array<Record<string, any>>;
  className?: string;
}

type TowerShape = "box" | "cylinder" | "hexagon";
type ViewAngle = "iso" | "top" | "front" | "side";
type SortOrder = "none" | "desc" | "asc";

interface ActiveItemData {
  rowName: string;
  colName: string;
  value: number;
  formatted: string;
  percentage: number;
  rowDimId?: string;
  colDimId?: string;
  x?: number;
  y?: number;
  meshPosition?: THREE.Vector3;
}

const VIBRANT_PALETTE = [
  0x2563eb, // Cobalt Blue
  0xf97316, // Orange
  0x10b981, // Emerald Green
  0x8b5cf6, // Electric Violet
  0xec4899, // Hot Pink
  0x06b6d4, // Cyan
  0xeab308, // Amber Gold
  0x64748b, // Slate
];

const CSS_PALETTE = [
  "#2563eb",
  "#f97316",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#eab308",
  "#64748b",
];

function getVibrantHeatmapColor(t: number): THREE.Color {
  const clamped = Math.max(0, Math.min(1, t));
  const color = new THREE.Color();
  if (clamped < 0.35) {
    const ratio = clamped / 0.35;
    color.lerpColors(new THREE.Color(0x2563eb), new THREE.Color(0x06b6d4), ratio);
  } else if (clamped < 0.7) {
    const ratio = (clamped - 0.35) / 0.35;
    color.lerpColors(new THREE.Color(0x06b6d4), new THREE.Color(0xf97316), ratio);
  } else {
    const ratio = (clamped - 0.7) / 0.3;
    color.lerpColors(new THREE.Color(0xf97316), new THREE.Color(0xef4444), ratio);
  }
  return color;
}

function createTextSprite(
  text: string,
  color = "#0f172a",
  fontSize = 38,
  bgColor = "#ffffff",
  borderColor = "#94a3b8",
  options?: {
    scale?: [number, number];
    shadow?: boolean;
    borderWidth?: number;
    badgePadding?: number;
    maxChars?: number;
  }
): THREE.Sprite {
  // Use a crisp 640x160 high-DPI canvas for big, razor-sharp legibility
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const paddingX = options?.badgePadding ?? 22;
  const paddingY = 16;
  const cardWidth = canvas.width - paddingX * 2;
  const cardHeight = canvas.height - paddingY * 2;
  const radius = 32;

  // Draw background pill card
  if (bgColor && bgColor !== "transparent") {
    if (options?.shadow) {
      ctx.shadowColor = "rgba(15, 23, 42, 0.28)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 10;
    }
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(paddingX, paddingY, cardWidth, cardHeight, radius);
    ctx.fill();
  }

  // Draw crisp border outline
  if (borderColor && borderColor !== "transparent") {
    ctx.shadowColor = "transparent";
    ctx.lineWidth = options?.borderWidth ?? 4;
    ctx.strokeStyle = borderColor;
    ctx.beginPath();
    ctx.roundRect(paddingX, paddingY, cardWidth, cardHeight, radius);
    ctx.stroke();
  }

  // Reset shadow for crisp text rendering
  ctx.shadowColor = "transparent";

  // Typography with high-contrast bold font
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxLen = options?.maxChars ?? 24;
  const display = text.length > maxLen ? text.slice(0, maxLen - 1) + "…" : text;
  ctx.fillText(display, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(spriteMat);
  const [sx, sy] = options?.scale || [5.2, 1.3];
  sprite.scale.set(sx, sy, 1);
  return sprite;
}

export default function ThreeDimensionMatrixView({
  matrix,
  config,
  onChartTypeChange,
  onConfigChange,
  rawRecords = [],
  className = "",
}: ThreeDimensionMatrixViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Mesh group for raycasting
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const allMeshesRef = useRef<THREE.Mesh[]>([]);
  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
  const originalColorRef = useRef<THREE.Color>(new THREE.Color(0, 0, 0));
  const originalPosRef = useRef<THREE.Vector3>(new THREE.Vector3());

  // Mode
  const activeMode: "3d_bar" | "3d_line" | "3d_donut" =
    config.chartType === "3d_donut"
      ? "3d_donut"
      : config.chartType === "3d_line"
      ? "3d_line"
      : "3d_bar";

  // Visual Controls
  const [towerShape, setTowerShape] = useState<TowerShape>("box");
  const [useHeatmap, setUseHeatmap] = useState<boolean>(false);
  const [heightScale, setHeightScale] = useState<number>(1.2);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [showDataLabels, setShowDataLabels] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("none");
  const [activeSeriesFilter, setActiveSeriesFilter] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // FEATURE 1: Drilldown Records Drawer
  const [drilldownModalOpen, setDrilldownModalOpen] = useState<boolean>(false);

  // FEATURE 2: 3D Capacity / Budget Threshold Plane
  const [showThresholdPlane, setShowThresholdPlane] = useState<boolean>(false);
  const [thresholdValue, setThresholdValue] = useState<number>(100);

  // FEATURE 3: Multi-Pillar Comparison Mode
  const [isCompareMode, setIsCompareMode] = useState<boolean>(false);
  const [compareItemA, setCompareItemA] = useState<ActiveItemData | null>(null);
  const [compareItemB, setCompareItemB] = useState<ActiveItemData | null>(null);

  // Interactive Hover & Click Selection States
  const [hoveredInfo, setHoveredInfo] = useState<ActiveItemData | null>(null);
  const [selectedItem, setSelectedItem] = useState<ActiveItemData | null>(null);

  // Layman dataset-aware terminology mapping
  const datasetContext = useMemo(() => {
    switch (config.dataset) {
      case "inmates":
        return {
          unit: "People",
          limitName: "Capacity Limit",
          recordsName: "Inmate",
          recordsPlural: "Inmates List",
          categoryName: "Room Category",
          rowNameFallback: "Camp / Dept",
          entityOver: "Camps Over Limit",
          allWithin: "All camps within capacity limit",
        };
      case "billing":
        return {
          unit: "SAR",
          limitName: "Budget Limit",
          recordsName: "Charge",
          recordsPlural: "Billing Charges",
          categoryName: "Billing Category",
          rowNameFallback: "Camp / Company",
          entityOver: "Facilities Over Budget",
          allWithin: "All facilities within budget limit",
        };
      case "catering":
        return {
          unit: "Meals",
          limitName: "Meal Limit",
          recordsName: "Meal",
          recordsPlural: "Meal Records",
          categoryName: "Meal Type",
          rowNameFallback: "Mess / Kitchen",
          entityOver: "Kitchens Over Limit",
          allWithin: "All kitchens within meal limit",
        };
      case "movements":
        return {
          unit: "Movements",
          limitName: "Target Limit",
          recordsName: "Movement",
          recordsPlural: "Movement Logs",
          categoryName: "Movement Type",
          rowNameFallback: "Location / Gate",
          entityOver: "Locations Over Limit",
          allWithin: "All locations within target limit",
        };
      default:
        return {
          unit: "Units",
          limitName: "Target Limit",
          recordsName: "Record",
          recordsPlural: "Detailed List",
          categoryName: "Category",
          rowNameFallback: "Item",
          entityOver: "Items Over Limit",
          allWithin: "All items within limit",
        };
    }
  }, [config.dataset]);

  const { chartData: rawChartData, chartSeriesKeys } = matrix;
  const grandTotalRaw = matrix.grandTotal?.raw || 1;

  // Process & Sort Chart Data
  const chartData = useMemo(() => {
    if (!rawChartData || rawChartData.length === 0) return [];
    if (sortOrder === "none") return rawChartData;

    const copy = [...rawChartData];
    copy.sort((a, b) => {
      let sumA = 0;
      let sumB = 0;
      for (const k of chartSeriesKeys) {
        sumA += Number(a[k]) || 0;
        sumB += Number(b[k]) || 0;
      }
      return sortOrder === "desc" ? sumB - sumA : sumA - sumB;
    });
    return copy;
  }, [rawChartData, chartSeriesKeys, sortOrder]);

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

  // Auto-calibrate initial threshold value
  useEffect(() => {
    if (maxVal > 0) {
      setThresholdValue(Math.round(maxVal * 0.65));
    }
  }, [maxVal]);

  // Count items exceeding threshold
  const thresholdTelemetry = useMemo(() => {
    if (!showThresholdPlane || !chartData || chartData.length === 0) return { count: 0, totalExcess: 0 };
    let count = 0;
    let totalExcess = 0;
    for (const row of chartData) {
      for (const key of chartSeriesKeys) {
        const v = Number(row[key]) || 0;
        if (v > thresholdValue) {
          count++;
          totalExcess += v - thresholdValue;
        }
      }
    }
    return { count, totalExcess };
  }, [showThresholdPlane, chartData, chartSeriesKeys, thresholdValue]);

  // Filter raw records contributing to the selected 3D item (Feature 1)
  const matchingDrilldownRecords = useMemo(() => {
    if (!selectedItem || !rawRecords || rawRecords.length === 0) return [];
    const rowDim = config.rows[0];
    const colDim = config.columns[0];

    return rawRecords.filter((r) => {
      const matchRow = !rowDim || !selectedItem.rowName || String(r[rowDim]) === selectedItem.rowName;
      const matchCol = !colDim || !selectedItem.colName || String(r[colDim]) === selectedItem.colName;
      return matchRow && matchCol;
    });
  }, [selectedItem, rawRecords, config.rows, config.columns]);

  // Main Three.js Scene Setup & Re-render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Setup Scene with Crisp White / Studio Background
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf8fafc);
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.012);

    // 2. Setup Camera
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    cameraRef.current = camera;

    if (activeMode === "3d_donut") {
      camera.position.set(0, 24, 20);
    } else if (activeMode === "3d_line") {
      camera.position.set(22, 16, 24);
    } else {
      camera.position.set(20, 18, 24);
    }

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

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 5;
    controls.maxDistance = 100;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;

    // 5. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.4);
    mainLight.position.set(25, 45, 25);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.bias = -0.0005;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    rimLight.position.set(-25, 25, -20);
    scene.add(rimLight);

    const frontFillLight = new THREE.DirectionalLight(0xfef08a, 0.5);
    frontFillLight.position.set(0, 15, 30);
    scene.add(frontFillLight);

    // 6. Build Active 3D Geometry
    const objectsGroup = new THREE.Group();
    objectsGroupRef.current = objectsGroup;
    allMeshesRef.current = [];
    scene.add(objectsGroup);

    if (activeMode === "3d_bar") {
      build3DBarChart(objectsGroup);
    } else if (activeMode === "3d_line") {
      build3DLineChart(objectsGroup);
    } else if (activeMode === "3d_donut") {
      build3DDonutChart(objectsGroup);
    }

    // FEATURE 3: Draw 3D Comparison Arched Bridge
    if (isCompareMode && compareItemA?.meshPosition && compareItemB?.meshPosition) {
      buildComparisonArch(objectsGroup, compareItemA, compareItemB);
    }

    // 7. Raycasting & Interactive Listeners (Hover + Click)
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(objectsGroup.children, true);

      const hit = intersects.find((i) => i.object.userData && i.object.userData.isInteractable);
      if (hit) {
        const mesh = hit.object as THREE.Mesh;
        if (hoveredMeshRef.current !== mesh) {
          // Restore previous hovered mesh
          if (hoveredMeshRef.current && (hoveredMeshRef.current.material as THREE.MeshStandardMaterial)) {
            const prevMat = hoveredMeshRef.current.material as THREE.MeshStandardMaterial;
            prevMat.color.copy(originalColorRef.current);
            if (activeMode === "3d_donut" && hoveredMeshRef.current !== selectedMeshRef.current) {
              hoveredMeshRef.current.position.copy(originalPosRef.current);
            }
          }

          // Highlight current mesh
          hoveredMeshRef.current = mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          originalColorRef.current.copy(mat.color);
          originalPosRef.current.copy(mesh.position);

          mat.color.offsetHSL(0, 0.12, 0.18);

          // In 3D donut, gently pop outward
          if (activeMode === "3d_donut" && mesh.userData.radialDir) {
            const dir = mesh.userData.radialDir as THREE.Vector3;
            mesh.position.addScaledVector(dir, 1.2);
          }
        }

        const data = mesh.userData;
        setHoveredInfo({
          rowName: data.rowName,
          colName: data.colName,
          value: data.value,
          formatted: data.formatted,
          percentage: data.percentage,
          rowDimId: config.rows[0],
          colDimId: config.columns[0],
          x: event.clientX,
          y: event.clientY,
          meshPosition: mesh.position.clone(),
        });
      } else {
        if (hoveredMeshRef.current && (hoveredMeshRef.current.material as THREE.MeshStandardMaterial)) {
          const prevMat = hoveredMeshRef.current.material as THREE.MeshStandardMaterial;
          prevMat.color.copy(originalColorRef.current);
          if (activeMode === "3d_donut" && hoveredMeshRef.current !== selectedMeshRef.current) {
            hoveredMeshRef.current.position.copy(originalPosRef.current);
          }
          hoveredMeshRef.current = null;
        }
        setHoveredInfo(null);
      }
    };

    // Click handler for 3D selection & Compare Mode
    const selectedMeshRef = { current: null as THREE.Mesh | null };

    const handleClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(objectsGroup.children, true);

      const hit = intersects.find((i) => i.object.userData && i.object.userData.isInteractable);
      if (hit) {
        const mesh = hit.object as THREE.Mesh;
        const data = mesh.userData;
        const clickedItem: ActiveItemData = {
          rowName: data.rowName,
          colName: data.colName,
          value: data.value,
          formatted: data.formatted,
          percentage: data.percentage,
          rowDimId: config.rows[0],
          colDimId: config.columns[0],
          meshPosition: mesh.position.clone(),
        };

        // FEATURE 3: Comparison Mode Multi-Select
        if (isCompareMode) {
          if (!compareItemA) {
            setCompareItemA(clickedItem);
            toast.info(`Selected Item A: ${clickedItem.rowName} (${clickedItem.colName}). Now click a second pillar for Item B.`);
          } else if (!compareItemB) {
            setCompareItemB(clickedItem);
            toast.success(`Comparing ${compareItemA.rowName} vs ${clickedItem.rowName}`);
          } else {
            // Replace B
            setCompareItemB(clickedItem);
          }
          return;
        }

        // Standard Single Selection Mode: Dim other meshes
        allMeshesRef.current.forEach((m) => {
          const mat = m.material as THREE.MeshStandardMaterial;
          if (m === mesh) {
            mat.opacity = 1.0;
            mat.transparent = false;
          } else {
            mat.opacity = 0.25;
            mat.transparent = true;
          }
        });

        selectedMeshRef.current = mesh;
        setSelectedItem(clickedItem);
      } else {
        if (!isCompareMode) {
          // Clicked background: reset focus
          allMeshesRef.current.forEach((m) => {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.opacity = 1.0;
            mat.transparent = false;
          });
          selectedMeshRef.current = null;
          setSelectedItem(null);
        }
      }
    };

    const handlePointerLeave = () => {
      if (hoveredMeshRef.current && (hoveredMeshRef.current.material as THREE.MeshStandardMaterial)) {
        const prevMat = hoveredMeshRef.current.material as THREE.MeshStandardMaterial;
        prevMat.color.copy(originalColorRef.current);
        if (activeMode === "3d_donut") {
          hoveredMeshRef.current.position.copy(originalPosRef.current);
        }
        hoveredMeshRef.current = null;
      }
      setHoveredInfo(null);
    };

    renderer.domElement.addEventListener("mousemove", handlePointerMove);
    renderer.domElement.addEventListener("click", handleClick);
    renderer.domElement.addEventListener("mouseleave", handlePointerLeave);

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 460;
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
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("mouseleave", handlePointerLeave);
      renderer.dispose();
      controls.dispose();
      scene.clear();
    };
  }, [
    chartData,
    chartSeriesKeys,
    activeMode,
    towerShape,
    useHeatmap,
    heightScale,
    maxVal,
    showDataLabels,
    sortOrder,
    activeSeriesFilter,
    showThresholdPlane,
    thresholdValue,
    isCompareMode,
    compareItemA,
    compareItemB,
  ]);

  // Sync autoRotate state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // -------------------------------------------------------------
  // BUILDER 1: 3D Bar Chart (Interactive Towers + Threshold Plane)
  // -------------------------------------------------------------
  function build3DBarChart(group: THREE.Group) {
    if (!chartData || chartData.length === 0 || chartSeriesKeys.length === 0) return;

    const numRows = chartData.length;
    const numCols = chartSeriesKeys.length;
    const spacingX = 2.4;
    const spacingZ = 2.4;
    const maxPillarHeight = 11 * heightScale;
    const pillarWidth = 1.5;

    const totalWidthX = numRows * spacingX;
    const totalDepthZ = numCols * spacingZ;

    // Floor Pedestal
    const slabGeo = new THREE.BoxGeometry(totalWidthX + 6, 0.4, totalDepthZ + 6);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.05,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -0.2, 0);
    slab.receiveShadow = true;
    group.add(slab);

    // Grid
    const gridHelper = new THREE.GridHelper(
      Math.max(totalWidthX, totalDepthZ) + 6,
      Math.max(numRows, numCols) + 2,
      0x94a3b8,
      0xe2e8f0
    );
    gridHelper.position.set(0, 0.02, 0);
    group.add(gridHelper);

    // Row Labels (Camps / Departments)
    chartData.forEach((row, r) => {
      const x = (r - (numRows - 1) / 2) * spacingX;
      const z = ((numCols - 1) / 2) * spacingZ + 3.2;
      const sprite = createTextSprite(
        row.name,
        "#0f172a", // Dark navy / slate-950
        38,
        "#ffffff", // Crisp white pill
        "#94a3b8", // Crisp border
        { scale: [5.2, 1.3], shadow: true, borderWidth: 3.5, maxChars: 22 }
      );
      sprite.position.set(x, 0.55, z);
      group.add(sprite);
    });

    // Column Labels (Breakdown Series)
    chartSeriesKeys.forEach((colKey, c) => {
      const z = (c - (numCols - 1) / 2) * spacingZ;
      const x = -((numRows - 1) / 2) * spacingX - 3.2;
      const sprite = createTextSprite(
        colKey,
        "#0369a1", // Deep sky-700
        38,
        "#f0f9ff", // Crisp sky-50 pill
        "#38bdf8", // Sky-400 border
        { scale: [5.2, 1.3], shadow: true, borderWidth: 3.5, maxChars: 22 }
      );
      sprite.position.set(x, 0.55, z);
      group.add(sprite);
    });

    // FEATURE 2: 3D Horizontal Threshold / Capacity Plane
    if (showThresholdPlane) {
      const thresholdY = Math.max(0.2, (thresholdValue / maxVal) * maxPillarHeight);

      const planeGeo = new THREE.PlaneGeometry(totalWidthX + 6, totalDepthZ + 6);
      planeGeo.rotateX(-Math.PI / 2);
      const planeMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        roughness: 0.2,
      });
      const planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.position.set(0, thresholdY, 0);
      group.add(planeMesh);

      const edges = new THREE.EdgesGeometry(planeGeo);
      const wireMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
      const wire = new THREE.LineSegments(edges, wireMat);
      wire.position.set(0, thresholdY, 0);
      group.add(wire);

      // Capacity Limit label badge
      const ceilingSprite = createTextSprite(
        `${datasetContext.limitName.toUpperCase()}: ${thresholdValue.toLocaleString()} ${datasetContext.unit}`,
        "#ffffff",
        34,
        "#dc2626",
        "#ffffff",
        { scale: [6.0, 1.5], shadow: true, borderWidth: 4 }
      );
      ceilingSprite.position.set(-((numRows - 1) / 2) * spacingX - 3.8, thresholdY + 0.45, 0);
      group.add(ceilingSprite);
    }

    // Build Pillars
    chartData.forEach((row, r) => {
      const rowName = row.name;
      const x = (r - (numRows - 1) / 2) * spacingX;

      chartSeriesKeys.forEach((colKey, c) => {
        const isDimmedBySeries = activeSeriesFilter && activeSeriesFilter !== colKey;
        const z = (c - (numCols - 1) / 2) * spacingZ;
        const val = Number(row[colKey]) || 0;
        const normalized = val / maxVal;
        const h = Math.max(0.18, normalized * maxPillarHeight);

        let geo: THREE.BufferGeometry;
        if (towerShape === "cylinder") {
          geo = new THREE.CylinderGeometry(pillarWidth * 0.46, pillarWidth * 0.48, h, 28);
        } else if (towerShape === "hexagon") {
          geo = new THREE.CylinderGeometry(pillarWidth * 0.5, pillarWidth * 0.5, h, 6);
        } else {
          geo = new THREE.BoxGeometry(pillarWidth, h, pillarWidth);
        }

        // Color computation: if threshold is active and val > thresholdValue, color warning coral red
        let pillarColor: THREE.Color;
        const isExceeding = showThresholdPlane && val > thresholdValue;

        if (isExceeding) {
          pillarColor = new THREE.Color(0xef4444); // Warning Red
        } else if (useHeatmap) {
          pillarColor = getVibrantHeatmapColor(normalized);
        } else {
          pillarColor = new THREE.Color(VIBRANT_PALETTE[c % VIBRANT_PALETTE.length]);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: pillarColor,
          roughness: isExceeding ? 0.15 : 0.25,
          metalness: 0.15,
          transparent: Boolean(isDimmedBySeries),
          opacity: isDimmedBySeries ? 0.2 : 1.0,
          emissive: isExceeding ? new THREE.Color(0x7f1d1d) : new THREE.Color(0, 0, 0),
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

        allMeshesRef.current.push(mesh);
        group.add(mesh);

        // Optional 3D Floating Value Data Label or Alert Label
        if (showDataLabels && val > 0) {
          const labelSprite = createTextSprite(
            isExceeding
              ? `⚠️ ${val.toLocaleString()} ${datasetContext.unit}`
              : `${val.toLocaleString()} ${datasetContext.unit}`,
            isExceeding ? "#ffffff" : "#0f172a",
            34,
            isExceeding ? "#dc2626" : "#ffffff",
            isExceeding ? "#991b1b" : "#475569",
            { scale: [4.6, 1.2], shadow: true, borderWidth: 3.5 }
          );
          labelSprite.position.set(x, h + 1.25, z);
          group.add(labelSprite);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // BUILDER 2: 3D Line Chart (Interactive Tubes + Threshold)
  // -------------------------------------------------------------
  function build3DLineChart(group: THREE.Group) {
    if (!chartData || chartData.length === 0 || chartSeriesKeys.length === 0) return;

    const numRows = chartData.length;
    const numSeries = chartSeriesKeys.length;
    const spacingX = 2.8;
    const spacingZ = 3.2;
    const maxHeight = 10 * heightScale;

    const totalWidthX = numRows * spacingX;
    const totalDepthZ = numSeries * spacingZ;

    // Floor Pedestal
    const slabGeo = new THREE.BoxGeometry(totalWidthX + 6, 0.4, totalDepthZ + 6);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.05,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -0.2, 0);
    slab.receiveShadow = true;
    group.add(slab);

    // Grid
    const gridHelper = new THREE.GridHelper(
      Math.max(totalWidthX, totalDepthZ) + 6,
      Math.max(numRows, numSeries) + 2,
      0x94a3b8,
      0xe2e8f0
    );
    gridHelper.position.set(0, 0.02, 0);
    group.add(gridHelper);

    // Row Labels (Camps / Departments)
    chartData.forEach((row, r) => {
      const x = (r - (numRows - 1) / 2) * spacingX;
      const z = ((numSeries - 1) / 2) * spacingZ + 3.2;
      const sprite = createTextSprite(
        row.name,
        "#0f172a",
        38,
        "#ffffff",
        "#94a3b8",
        { scale: [5.2, 1.3], shadow: true, borderWidth: 3.5, maxChars: 22 }
      );
      sprite.position.set(x, 0.55, z);
      group.add(sprite);
    });

    // Column Labels (Series)
    chartSeriesKeys.forEach((colKey, s) => {
      const z = (s - (numSeries - 1) / 2) * spacingZ;
      const x = -((numRows - 1) / 2) * spacingX - 3.2;
      const sprite = createTextSprite(
        colKey,
        "#0369a1",
        38,
        "#f0f9ff",
        "#38bdf8",
        { scale: [5.2, 1.3], shadow: true, borderWidth: 3.5, maxChars: 22 }
      );
      sprite.position.set(x, 0.55, z);
      group.add(sprite);
    });

    // Threshold plane for line chart
    if (showThresholdPlane) {
      const thresholdY = Math.max(0.2, (thresholdValue / maxVal) * maxHeight);
      const planeGeo = new THREE.PlaneGeometry(totalWidthX + 6, totalDepthZ + 6);
      planeGeo.rotateX(-Math.PI / 2);
      const planeMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
      });
      const planeMesh = new THREE.Mesh(planeGeo, planeMat);
      planeMesh.position.set(0, thresholdY, 0);
      group.add(planeMesh);

      const edges = new THREE.EdgesGeometry(planeGeo);
      const wireMat = new THREE.LineBasicMaterial({ color: 0xef4444, linewidth: 2 });
      const wire = new THREE.LineSegments(edges, wireMat);
      wire.position.set(0, thresholdY, 0);
      group.add(wire);

      const ceilingSprite = createTextSprite(
        `${datasetContext.limitName.toUpperCase()}: ${thresholdValue.toLocaleString()} ${datasetContext.unit}`,
        "#ffffff",
        34,
        "#dc2626",
        "#ffffff",
        { scale: [6.0, 1.5], shadow: true, borderWidth: 4 }
      );
      ceilingSprite.position.set(-((numRows - 1) / 2) * spacingX - 3.8, thresholdY + 0.45, 0);
      group.add(ceilingSprite);
    }

    // Build Tubes
    chartSeriesKeys.forEach((colKey, sIndex) => {
      const isDimmed = activeSeriesFilter && activeSeriesFilter !== colKey;
      const z = (sIndex - (numSeries - 1) / 2) * spacingZ;
      const seriesColor = new THREE.Color(VIBRANT_PALETTE[sIndex % VIBRANT_PALETTE.length]);

      const points: THREE.Vector3[] = [];

      chartData.forEach((row, rIndex) => {
        const x = (rIndex - (numRows - 1) / 2) * spacingX;
        const val = Number(row[colKey]) || 0;
        const normalized = val / maxVal;
        const y = Math.max(0.2, normalized * maxHeight);
        const pt = new THREE.Vector3(x, y, z);
        points.push(pt);

        const isExceeding = showThresholdPlane && val > thresholdValue;

        // Data point sphere
        const sphereGeo = new THREE.SphereGeometry(0.42, 20, 20);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: isExceeding ? 0xef4444 : seriesColor,
          roughness: 0.2,
          metalness: 0.2,
          transparent: Boolean(isDimmed),
          opacity: isDimmed ? 0.25 : 1.0,
          emissive: isExceeding ? new THREE.Color(0x7f1d1d) : new THREE.Color(0, 0, 0),
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.copy(pt);
        sphere.castShadow = true;

        const percentage = grandTotalRaw > 0 ? (val / grandTotalRaw) * 100 : 0;
        sphere.userData = {
          isInteractable: true,
          rowName: row.name,
          colName: colKey,
          value: val,
          formatted: val.toLocaleString(),
          percentage,
        };

        allMeshesRef.current.push(sphere);
        group.add(sphere);

        // Drop line to floor
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, 0.05, z),
          new THREE.Vector3(x, y, z),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: isExceeding ? 0xef4444 : seriesColor,
          transparent: true,
          opacity: isDimmed ? 0.08 : 0.35,
        });
        const dropLine = new THREE.Line(lineGeo, lineMat);
        group.add(dropLine);

        // Optional 3D Floating Value Data Label
        if (showDataLabels && val > 0) {
          const labelSprite = createTextSprite(
            isExceeding
              ? `⚠️ ${val.toLocaleString()} ${datasetContext.unit}`
              : `${val.toLocaleString()} ${datasetContext.unit}`,
            isExceeding ? "#ffffff" : "#0f172a",
            34,
            isExceeding ? "#dc2626" : "#ffffff",
            isExceeding ? "#991b1b" : "#475569",
            { scale: [4.6, 1.2], shadow: true, borderWidth: 3.5 }
          );
          labelSprite.position.set(x, y + 1.25, z);
          group.add(labelSprite);
        }
      });

      // Spline Tube
      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.18, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: seriesColor,
          roughness: 0.2,
          metalness: 0.25,
          transparent: Boolean(isDimmed),
          opacity: isDimmed ? 0.2 : 1.0,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.castShadow = true;
        group.add(tubeMesh);
      }
    });
  }

  // -------------------------------------------------------------
  // BUILDER 3: 3D Donut Chart (Interactive Exploding Ring)
  // -------------------------------------------------------------
  function build3DDonutChart(group: THREE.Group) {
    if (!chartData || chartData.length === 0) return;

    const firstSeries = chartSeriesKeys[0];
    const items = chartData.map((d) => ({
      name: d.name,
      value: Math.max(0, Number(d[firstSeries]) || 0),
    }));

    const total = items.reduce((acc, curr) => acc + curr.value, 0) || 1;

    // Pedestal
    const baseCylinderGeo = new THREE.CylinderGeometry(14, 14.5, 0.4, 48);
    const baseCylinderMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.05,
    });
    const basePedestal = new THREE.Mesh(baseCylinderGeo, baseCylinderMat);
    basePedestal.position.set(0, -0.2, 0);
    basePedestal.receiveShadow = true;
    group.add(basePedestal);

    const innerRadius = 4.2;
    const outerRadius = 8.5;
    const extrudeDepth = 2.4 * heightScale;

    let currentAngle = 0;

    items.forEach((item, index) => {
      const slicePct = item.value / total;
      const sliceAngle = slicePct * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      const midAngle = (startAngle + endAngle) / 2;
      currentAngle = endAngle;

      if (sliceAngle <= 0.01) return;

      const shape = new THREE.Shape();
      shape.absarc(0, 0, outerRadius, startAngle, endAngle, false);
      shape.absarc(0, 0, innerRadius, endAngle, startAngle, true);
      shape.closePath();

      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth: extrudeDepth,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.08,
        bevelThickness: 0.08,
      };

      const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      geo.rotateX(-Math.PI / 2);

      const sliceColor = new THREE.Color(VIBRANT_PALETTE[index % VIBRANT_PALETTE.length]);
      const mat = new THREE.MeshStandardMaterial({
        color: sliceColor,
        roughness: 0.25,
        metalness: 0.15,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0.05, 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const radialDir = new THREE.Vector3(Math.cos(midAngle), 0, -Math.sin(midAngle));

      mesh.userData = {
        isInteractable: true,
        rowName: item.name,
        colName: firstSeries || "Value",
        value: item.value,
        formatted: item.value.toLocaleString(),
        percentage: slicePct * 100,
        radialDir,
      };

      allMeshesRef.current.push(mesh);
      group.add(mesh);

      // Label Billboard with crisp white badge
      const labelDist = outerRadius + 3.4;
      const lx = Math.cos(midAngle) * labelDist;
      const lz = -Math.sin(midAngle) * labelDist;
      const labelSprite = createTextSprite(
        `${item.name}: ${(slicePct * 100).toFixed(0)}%`,
        "#0f172a",
        36,
        "#ffffff",
        "#94a3b8",
        { scale: [5.2, 1.3], shadow: true, borderWidth: 3.5 }
      );
      labelSprite.position.set(lx, extrudeDepth * 0.75, lz);
      group.add(labelSprite);
    });

    // Center Hub Column with Total
    const centerGeo = new THREE.CylinderGeometry(innerRadius - 0.5, innerRadius - 0.5, extrudeDepth * 0.4, 32);
    const centerMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.4,
      metalness: 0.1,
    });
    const centerPillar = new THREE.Mesh(centerGeo, centerMat);
    centerPillar.position.set(0, extrudeDepth * 0.2, 0);
    group.add(centerPillar);

    const centerLabel = createTextSprite(
      "TOTAL",
      "#475569",
      30,
      "transparent",
      "transparent",
      { scale: [3.4, 0.85] }
    );
    centerLabel.position.set(0, extrudeDepth * 0.55, 0);
    group.add(centerLabel);

    const centerTotalSprite = createTextSprite(
      `${total.toLocaleString()} ${datasetContext.unit}`,
      "#0f172a",
      42,
      "#ffffff",
      "#cbd5e1",
      { scale: [5.6, 1.45], shadow: true, borderWidth: 3.5 }
    );
    centerTotalSprite.position.set(0, extrudeDepth * 0.55 + 1.2, 0);
    group.add(centerTotalSprite);
  }

  // -------------------------------------------------------------
  // FEATURE 3 BUILDER: 3D Comparison Arched Bridge
  // -------------------------------------------------------------
  function buildComparisonArch(
    group: THREE.Group,
    itemA: ActiveItemData,
    itemB: ActiveItemData
  ) {
    if (!itemA.meshPosition || !itemB.meshPosition) return;
    const posA = itemA.meshPosition;
    const posB = itemB.meshPosition;

    // Arched curve linking the two peaks
    const midY = Math.max(posA.y, posB.y) + 3.8;
    const midPoint = new THREE.Vector3(
      (posA.x + posB.x) / 2,
      midY,
      (posA.z + posB.z) / 2
    );

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(posA.x, posA.y + 0.6, posA.z),
      midPoint,
      new THREE.Vector3(posB.x, posB.y + 0.6, posB.z)
    );

    const points = curve.getPoints(24);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(points);
    const curveMat = new THREE.LineBasicMaterial({
      color: 0x2563eb,
      linewidth: 3,
    });
    const curveLine = new THREE.Line(curveGeo, curveMat);
    group.add(curveLine);

    // Difference badge in mid-air
    const diff = itemB.value - itemA.value;
    const pct = itemA.value > 0 ? (diff / itemA.value) * 100 : 0;
    const diffSign = diff >= 0 ? "+" : "";
    const pctSign = pct >= 0 ? "+" : "";
    const deltaText = `Diff: ${diffSign}${diff.toLocaleString()} (${pctSign}${pct.toFixed(1)}%)`;

    const deltaSprite = createTextSprite(
      deltaText,
      "#ffffff",
      36,
      diff >= 0 ? "#059669" : "#dc2626",
      "#ffffff",
      { scale: [5.8, 1.4], shadow: true, borderWidth: 4 }
    );
    deltaSprite.position.set(midPoint.x, midPoint.y + 1.0, midPoint.z);
    group.add(deltaSprite);

    // Vertical dashed drop-lines to each pillar
    const ringMatA = new THREE.MeshBasicMaterial({ color: 0x2563eb, side: THREE.DoubleSide });
    const ringGeoA = new THREE.RingGeometry(0.8, 1.0, 24);
    const ringA = new THREE.Mesh(ringGeoA, ringMatA);
    ringA.rotation.x = Math.PI / 2;
    ringA.position.set(posA.x, 0.05, posA.z);
    group.add(ringA);

    const ringMatB = new THREE.MeshBasicMaterial({ color: 0xf97316, side: THREE.DoubleSide });
    const ringGeoB = new THREE.RingGeometry(0.8, 1.0, 24);
    const ringB = new THREE.Mesh(ringGeoB, ringMatB);
    ringB.rotation.x = Math.PI / 2;
    ringB.position.set(posB.x, 0.05, posB.z);
    group.add(ringB);
  }

  // Camera presets
  const setCameraAngle = (angle: ViewAngle) => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (activeMode === "3d_donut") {
      if (angle === "iso") camera.position.set(0, 24, 20);
      else if (angle === "top") camera.position.set(0, 32, 0.01);
      else if (angle === "front") camera.position.set(0, 10, 28);
      else if (angle === "side") camera.position.set(28, 10, 0);
    } else {
      if (angle === "iso") camera.position.set(20, 18, 24);
      else if (angle === "top") camera.position.set(0, 36, 0.01);
      else if (angle === "front") camera.position.set(0, 6, 30);
      else if (angle === "side") camera.position.set(30, 6, 0);
    }
    controls.target.set(0, 2, 0);
    controls.update();
  };

  // Filter matrix by the clicked 3D item
  const handleFilterBySelectedItem = () => {
    if (!selectedItem || !onConfigChange) return;
    const rowDim = config.rows[0];
    if (!rowDim) {
      toast.error("No active row dimension to filter by");
      return;
    }

    onConfigChange({
      ...config,
      filters: {
        ...config.filters,
        [rowDim]: [selectedItem.rowName],
      },
    });
    toast.success(`Filtered dynamic report to ${selectedItem.rowName}`);
  };

  // Reset focus selection
  const handleResetFocus = () => {
    allMeshesRef.current.forEach((m) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.opacity = 1.0;
      mat.transparent = false;
    });
    setSelectedItem(null);
  };

  // Snapshot PNG Export
  const handleSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `3d-${activeMode}-${config.dataset}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    toast.success("3D Snapshot downloaded as PNG");
  };

  return (
    <div
      className={`relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
        isFullscreen ? "fixed inset-2 z-50 rounded-2xl flex flex-col shadow-2xl" : "w-full"
      } ${className}`}
    >
      {/* 3D Top Header & Controls Ribbon */}
      <div className="bg-slate-50/95 backdrop-blur-md border-b border-slate-200 text-slate-700 z-10">
        {/* Tier 1: Viewport Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-200/60">
          {/* Left: 3D Studio Title & Active Mode */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Box size={15} />
            </div>
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">
              {activeMode === "3d_bar"
                ? "3D Isometric Bar Grid"
                : activeMode === "3d_line"
                ? "3D Flowing Line Ribbon"
                : "3D Extruded Donut Studio"}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-400/30">
              WebGL 3D
            </span>
          </div>

          {/* Right: Camera Angles, Auto-Spin & Window Controls */}
          <div className="flex items-center gap-1.5">
            {/* Camera Angles Segmented Control */}
            <div className="flex items-center bg-white rounded-lg p-0.5 border border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => setCameraAngle("iso")}
                className={`h-6 px-2 text-[11px] font-semibold rounded transition-colors ${
                  cameraAngle === "iso" ? "bg-primary text-primary-foreground font-bold" : "text-slate-700 hover:bg-slate-100"
                }`}
                title="3D Isometric View"
              >
                3D
              </button>
              <button
                type="button"
                onClick={() => setCameraAngle("top")}
                className={`h-6 px-2 text-[11px] font-semibold rounded transition-colors ${
                  cameraAngle === "top" ? "bg-primary text-primary-foreground font-bold" : "text-slate-700 hover:bg-slate-100"
                }`}
                title="Top-Down Plan View"
              >
                Top
              </button>
              <button
                type="button"
                onClick={() => setCameraAngle("front")}
                className={`h-6 px-2 text-[11px] font-semibold rounded transition-colors ${
                  cameraAngle === "front" ? "bg-primary text-primary-foreground font-bold" : "text-slate-700 hover:bg-slate-100"
                }`}
                title="Front Elevation View"
              >
                Front
              </button>
              <button
                type="button"
                onClick={() => setCameraAngle("side")}
                className={`h-6 px-2 text-[11px] font-semibold rounded transition-colors ${
                  cameraAngle === "side" ? "bg-primary text-primary-foreground font-bold" : "text-slate-700 hover:bg-slate-100"
                }`}
                title="Side Profile View"
              >
                Side
              </button>
            </div>

            {/* Auto Rotate Presentation */}
            <Button
              size="sm"
              variant={autoRotate ? "default" : "outline"}
              onClick={() => setAutoRotate(!autoRotate)}
              className={`h-7 px-2 text-xs gap-1 font-bold shadow-2xs ${
                autoRotate
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
              }`}
              title="Toggle automatic rotation"
            >
              {autoRotate ? <Pause size={11} /> : <Play size={11} />}
              Auto-Spin
            </Button>

            {/* Snapshot PNG */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSnapshot}
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-950 hover:bg-slate-200"
              title="Save Viewport as PNG"
            >
              <Download size={13} />
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 w-7 p-0 text-slate-600 hover:text-slate-950 hover:bg-slate-200"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </Button>

            {/* Hide Visualizer */}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChartTypeChange && onChartTypeChange("none")}
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-200"
              title="Hide Visualizer"
            >
              <EyeOff size={13} />
            </Button>
          </div>
        </div>

        {/* Tier 2: Analytical Tools & Geometry Sub-Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-slate-100/70 text-xs">
          {/* Left: Analysis Tools */}
          <div className="flex items-center gap-1.5">
            {/* FEATURE 2: 3D Capacity / Target Threshold Plane Toggle */}
            {activeMode !== "3d_donut" && (
              <Button
                size="sm"
                variant={showThresholdPlane ? "default" : "outline"}
                onClick={() => {
                  const nextState = !showThresholdPlane;
                  setShowThresholdPlane(nextState);
                  toast.info(nextState ? `${datasetContext.limitName} Alert enabled: Move slider to adjust limit` : `${datasetContext.limitName} Alert disabled`);
                }}
                className={`h-6 px-2 text-[11px] font-bold gap-1 shadow-2xs ${
                  showThresholdPlane
                    ? "bg-red-600 hover:bg-red-700 text-white font-bold"
                    : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
                }`}
                title={`Toggle ${datasetContext.limitName} Alert Plane`}
              >
                <Target size={11} className={showThresholdPlane ? "text-white" : "text-red-500"} />
                <span>Limit Alert</span>
              </Button>
            )}

            {/* FEATURE 3: Multi-Pillar 3D Compare Toggle */}
            <Button
              size="sm"
              variant={isCompareMode ? "default" : "outline"}
              onClick={() => {
                const nextMode = !isCompareMode;
                setIsCompareMode(nextMode);
                if (!nextMode) {
                  setCompareItemA(null);
                  setCompareItemB(null);
                  toast.info("Exited comparison mode");
                } else {
                  setSelectedItem(null);
                  toast.info("Compare Mode: Click any 2 bars to see difference");
                }
              }}
              className={`h-6 px-2 text-[11px] font-bold gap-1 shadow-2xs ${
                isCompareMode
                  ? "bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  : "bg-white text-slate-800 border-slate-300 hover:bg-slate-100"
              }`}
              title="Compare 2 items side-by-side"
            >
              <GitCompare size={11} className={isCompareMode ? "text-white" : "text-purple-600"} />
              <span>Compare</span>
            </Button>

            {/* 3D Floating Value Labels Toggle */}
            <Button
              size="sm"
              variant={showDataLabels ? "secondary" : "outline"}
              onClick={() => setShowDataLabels(!showDataLabels)}
              className={`h-6 px-2 text-[11px] font-bold border-slate-300 shadow-2xs ${
                showDataLabels ? "bg-blue-100 text-blue-950 font-bold border-blue-400" : "bg-white text-slate-800 hover:bg-slate-100"
              }`}
              title="Show or hide numbers above each bar"
            >
              <Hash size={11} className="mr-0.5 text-blue-600" />
              <span>Numbers</span>
            </Button>

            {/* Interactive 3D Sort */}
            {activeMode !== "3d_donut" && (
              <Button
                size="sm"
                variant={sortOrder !== "none" ? "secondary" : "outline"}
                onClick={() => {
                  const nextSort: SortOrder =
                    sortOrder === "none" ? "desc" : sortOrder === "desc" ? "asc" : "none";
                  setSortOrder(nextSort);
                  toast.info(`Sorted by value: ${nextSort === "none" ? "Original Order" : nextSort === "desc" ? "Highest First" : "Lowest First"}`);
                }}
                className={`h-6 px-2 text-[11px] font-bold border-slate-300 shadow-2xs ${
                  sortOrder !== "none" ? "bg-amber-100 text-amber-950 font-bold border-amber-400" : "bg-white text-slate-800 hover:bg-slate-100"
                }`}
                title="Sort bars: Highest first or Lowest first"
              >
                <ArrowUpDown size={11} className="mr-1 text-amber-600" />
                <span>{sortOrder === "none" ? "Sort" : sortOrder === "desc" ? "High➔Low" : "Low➔High"}</span>
              </Button>
            )}
          </div>

          {/* Right: Tower Shapes & Navigation Tip */}
          <div className="flex items-center gap-2">
            {/* Tower Shapes (only in 3D Bar mode) */}
            {activeMode === "3d_bar" && (
              <div className="flex items-center bg-white rounded-md p-0.5 border border-slate-300 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTowerShape("box")}
                  className={`h-5 w-5 rounded flex items-center justify-center transition-colors ${
                    towerShape === "box" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Box Shape"
                >
                  <Square size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setTowerShape("cylinder")}
                  className={`h-5 w-5 rounded flex items-center justify-center transition-colors ${
                    towerShape === "cylinder" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Cylinder Shape"
                >
                  <Circle size={11} />
                </button>
                <button
                  type="button"
                  onClick={() => setTowerShape("hexagon")}
                  className={`h-5 w-5 rounded flex items-center justify-center transition-colors ${
                    towerShape === "hexagon" ? "bg-slate-200 text-slate-900" : "text-slate-500 hover:text-slate-800"
                  }`}
                  title="Hexagon Shape"
                >
                  <Hexagon size={11} />
                </button>
              </div>
            )}
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              Left-click rotate • Right-click pan • Scroll zoom
            </span>
          </div>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className={`w-full relative cursor-grab active:cursor-grabbing bg-[#f8fafc] ${
          isFullscreen ? "flex-1 min-h-[500px]" : "h-[540px] sm:h-[580px] lg:h-[620px]"
        }`}
      />

      {/* FEATURE 2 OVERLAY: Interactive Threshold Plane Slider */}
      {showThresholdPlane && activeMode !== "3d_donut" && (
        <div className="absolute top-14 left-4 bg-white/98 backdrop-blur-md border-2 border-red-300 shadow-xl px-4 py-3 rounded-xl flex flex-wrap items-center gap-4 z-10 text-sm">
          <div className="flex items-center gap-2 text-red-950 font-bold text-sm sm:text-base">
            <Target size={18} className="text-red-600" />
            <span>{datasetContext.limitName}:</span>
          </div>

          <div className="flex items-center gap-3">
            <Slider
              value={[thresholdValue]}
              min={Math.round(maxVal * 0.1)}
              max={Math.round(maxVal * 1.2)}
              step={Math.max(1, Math.round(maxVal / 50))}
              onValueChange={([val]) => setThresholdValue(val)}
              className="w-40"
            />
            <span className="font-mono font-bold text-sm text-red-700 bg-red-100 px-3 py-1 rounded-md border border-red-300 shadow-2xs">
              {thresholdValue.toLocaleString()} {datasetContext.unit}
            </span>
          </div>

          <Badge
            variant="outline"
            className={`text-xs sm:text-sm font-bold px-3.5 py-1.5 shadow-2xs ${
              thresholdTelemetry.count > 0
                ? "bg-red-50 text-red-700 border-red-300"
                : "bg-emerald-50 text-emerald-800 border-emerald-300"
            }`}
          >
            {thresholdTelemetry.count > 0 ? (
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={15} /> {thresholdTelemetry.count} {thresholdTelemetry.count === 1 ? "Location" : "Locations"} Over Limit (+{thresholdTelemetry.totalExcess.toLocaleString()} {datasetContext.unit})
              </span>
            ) : (
              datasetContext.allWithin
            )}
          </Badge>
        </div>
      )}

      {/* FEATURE 3 OVERLAY: Multi-Pillar 3D Comparison HUD Card */}
      {isCompareMode && (
        <div className="absolute top-14 right-4 z-20 w-96 bg-white/98 backdrop-blur-md border-2 border-purple-500 rounded-xl shadow-2xl p-4 space-y-3.5 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b border-purple-200 pb-2">
            <div className="flex items-center gap-2 font-bold text-base text-purple-950">
              <GitCompare size={18} className="text-purple-600" />
              <span>Side-by-Side Comparison</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCompareItemA(null);
                setCompareItemB(null);
              }}
              className="text-slate-500 hover:text-slate-900 text-xs font-bold px-2 py-1 rounded hover:bg-slate-100"
            >
              Clear
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Item A */}
            <div className="p-3 rounded-lg bg-blue-50/90 border-2 border-blue-200 shadow-2xs">
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block">1st Item</span>
              {compareItemA ? (
                <div className="mt-1">
                  <div className="font-bold text-base text-slate-950 truncate" title={compareItemA.rowName}>{compareItemA.rowName}</div>
                  <div className="text-xs font-medium text-slate-600 truncate mt-0.5" title={compareItemA.colName}>{compareItemA.colName}</div>
                  <div className="font-mono font-bold text-lg text-blue-800 mt-1">{compareItemA.formatted} {datasetContext.unit}</div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic mt-2">Click any bar...</div>
              )}
            </div>

            {/* Item B */}
            <div className="p-3 rounded-lg bg-amber-50/90 border-2 border-amber-200 shadow-2xs">
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block">2nd Item</span>
              {compareItemB ? (
                <div className="mt-1">
                  <div className="font-bold text-base text-slate-950 truncate" title={compareItemB.rowName}>{compareItemB.rowName}</div>
                  <div className="text-xs font-medium text-slate-600 truncate mt-0.5" title={compareItemB.colName}>{compareItemB.colName}</div>
                  <div className="font-mono font-bold text-lg text-amber-800 mt-1">{compareItemB.formatted} {datasetContext.unit}</div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic mt-2">Click another bar...</div>
              )}
            </div>
          </div>

          {/* Difference Comparison Calculation */}
          {compareItemA && compareItemB && (
            <div className="pt-2 border-t border-purple-200">
              {(() => {
                const diff = compareItemB.value - compareItemA.value;
                const pct = compareItemA.value > 0 ? (diff / compareItemA.value) * 100 : 0;
                const isPositive = diff >= 0;
                return (
                  <div className="flex items-center justify-between bg-purple-50 p-3 rounded-lg border border-purple-300">
                    <span className="text-slate-800 font-bold text-xs sm:text-sm">Difference:</span>
                    <span
                      className={`font-mono font-bold text-sm sm:text-base ${
                        isPositive ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {diff.toLocaleString()} {datasetContext.unit} ({isPositive ? "+" : ""}
                      {pct.toFixed(1)}% {isPositive ? "higher" : "lower"})
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Unified Professional Bottom Toolbar: Category Isolation, Height Scale & Gesture Hints */}
      <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        {/* Left Side: Category Slicers (if multiple series) or View Context */}
        {chartSeriesKeys.length > 1 && activeMode !== "3d_donut" ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold text-xs uppercase tracking-wider">
              <Filter size={13} className="text-primary" />
              <span>Isolate:</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {chartSeriesKeys.map((key, i) => {
                const isSelected = activeSeriesFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setActiveSeriesFilter(isSelected ? null : key);
                      toast.info(
                        isSelected ? "Showing all categories" : `Showing only: ${key}`
                      );
                    }}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all shadow-2xs ${
                      isSelected
                        ? "bg-slate-900 text-white ring-2 ring-slate-900 font-bold"
                        : activeSeriesFilter
                        ? "opacity-40 hover:opacity-100 bg-white border border-slate-200 text-slate-600"
                        : "bg-white border border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-100"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-2xs"
                      style={{ backgroundColor: CSS_PALETTE[i % CSS_PALETTE.length] }}
                    />
                    <span>{key}</span>
                    {isSelected && <Check size={12} className="text-emerald-400 ml-0.5" />}
                  </button>
                );
              })}

              {activeSeriesFilter && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveSeriesFilter(null)}
                  className="h-6 px-2 text-[11px] font-bold text-muted-foreground hover:text-foreground"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
            <span className="font-bold text-slate-800">3D Interactive Mode:</span>
            <span>{activeMode === "3d_donut" ? "Donut Distribution" : activeMode === "3d_line" ? "Elevation Ribbons" : "Tower Matrix"}</span>
          </div>
        )}

        {/* Right Side: Height Slider & Gesture Guide Hint */}
        <div className="flex flex-wrap items-center gap-3 ml-auto">
          {/* Height Scale Elevation Slider */}
          {activeMode !== "3d_donut" && (
            <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs text-xs text-slate-700">
              <Sliders size={13} className="text-primary" />
              <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wide">
                Height:
              </span>
              <Slider
                value={[heightScale]}
                min={0.4}
                max={2.5}
                step={0.1}
                onValueChange={([val]) => setHeightScale(val)}
                className="w-20 sm:w-24"
              />
              <span className="font-mono font-bold text-primary text-[11px] min-w-[28px] text-right">
                {heightScale.toFixed(1)}x
              </span>
            </div>
          )}

          {/* Gesture Guide Hint */}
          <div className="hidden sm:flex items-center gap-2 bg-white px-2.5 py-1 rounded-md border border-slate-200 text-slate-500 text-[11px] font-medium shadow-2xs">
            <span className="text-slate-700 font-semibold">Left-Click:</span> Rotate
            <span>•</span>
            <span className="text-slate-700 font-semibold">Right-Click:</span> Pan
            <span>•</span>
            <span className="text-slate-700 font-semibold">Click:</span> Details
          </div>
        </div>
      </div>

      {/* FEATURE 1: Selection Drilldown Inspector HUD Card */}
      {selectedItem && !isCompareMode && (
        <div className="absolute top-14 right-4 z-20 w-84 bg-white/98 backdrop-blur-md border-2 border-blue-500 rounded-xl shadow-2xl p-4 space-y-3.5 text-slate-900 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start justify-between gap-2 border-b border-slate-200 pb-2.5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 block">
                Selected Details
              </span>
              <h4 className="font-bold text-lg text-slate-950 leading-tight mt-0.5">
                {selectedItem.rowName}
              </h4>
            </div>
            <button
              type="button"
              onClick={handleResetFocus}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
              title="Close details"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Category:</span>
              <span className="font-bold text-slate-900 text-sm">{selectedItem.colName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-100">
              <span className="text-slate-600 font-medium">Total {datasetContext.unit}:</span>
              <span className="font-mono font-bold text-xl text-blue-700">
                {selectedItem.formatted}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-600 font-medium">Share of Total:</span>
              <Badge variant="secondary" className="font-mono text-xs font-bold bg-amber-100 text-amber-950 border border-amber-300 px-2 py-0.5">
                {selectedItem.percentage.toFixed(1)}%
              </Badge>
            </div>
          </div>

          {/* Interactive Actions (Feature 1 Drill-Down Button included!) */}
          <div className="pt-2 flex flex-col gap-2 border-t border-slate-200">
            {/* FEATURE 1: View Underlying Records */}
            <Button
              size="sm"
              onClick={() => setDrilldownModalOpen(true)}
              className="h-9 text-xs sm:text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white w-full shadow-xs"
              title={`Inspect individual ${datasetContext.recordsPlural.toLowerCase()} for this selection`}
            >
              <Users size={15} />
              <span>
                View {datasetContext.recordsPlural} ({matchingDrilldownRecords.length})
              </span>
            </Button>

            <Button
              size="sm"
              onClick={handleFilterBySelectedItem}
              variant="outline"
              className="h-8 text-xs sm:text-sm font-bold gap-2 border-slate-300 text-slate-800 hover:bg-slate-100 w-full"
            >
              <Filter size={14} className="text-primary" />
              <span>Filter Report to this Item</span>
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleResetFocus}
              className="h-7 text-xs font-bold text-slate-600 hover:text-slate-950 hover:bg-slate-100 w-full"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Floating Raycaster Tooltip on Hover */}
      {hoveredInfo && !selectedItem && !isCompareMode && (
        <div
          className="fixed pointer-events-none z-50 p-3.5 rounded-xl bg-slate-950/98 backdrop-blur-md border-2 border-sky-400 shadow-2xl text-white text-xs max-w-sm space-y-2 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${hoveredInfo.x}px`,
            top: `${hoveredInfo.y}px`,
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
            <span className="font-bold text-base text-sky-300 truncate max-w-[170px]">
              {hoveredInfo.rowName}
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded bg-amber-400/25 text-amber-300 font-mono font-bold border border-amber-400/40">
              {hoveredInfo.percentage.toFixed(1)}% Total
            </span>
          </div>

          <div className="flex justify-between items-center text-sm pt-0.5">
            <span className="text-slate-300 truncate pr-2 font-medium">{hoveredInfo.colName}:</span>
            <span className="font-mono font-bold text-amber-300 text-lg">
              {hoveredInfo.formatted} {datasetContext.unit}
            </span>
          </div>

          {showThresholdPlane && hoveredInfo.value > thresholdValue && (
            <div className="text-xs sm:text-sm text-red-200 font-bold flex items-center gap-1.5 pt-0.5 bg-red-950/70 p-2 rounded-lg border border-red-500/50">
              <AlertTriangle size={15} className="text-red-400 shrink-0" /> Over {datasetContext.limitName.toLowerCase()} by +{(hoveredInfo.value - thresholdValue).toLocaleString()} {datasetContext.unit}
            </div>
          )}

          <div className="text-xs text-slate-300 italic pt-1">
            Click to view {datasetContext.recordsPlural.toLowerCase()}
          </div>
        </div>
      )}

      {/* FEATURE 1: Underlying Records Drilldown Modal Dialog */}
      {selectedItem && (
        <DrilldownRecordsModal
          open={drilldownModalOpen}
          onOpenChange={setDrilldownModalOpen}
          title={`${selectedItem.rowName} ${selectedItem.colName ? `— ${selectedItem.colName}` : ""}`}
          subtitle={`All individual ${datasetContext.recordsPlural.toLowerCase()} for this selection`}
          records={matchingDrilldownRecords}
          metricValue={`${selectedItem.formatted} ${datasetContext.unit}`}
          datasetUnit={datasetContext.unit}
          datasetRecordsName={datasetContext.recordsPlural}
        />
      )}
    </div>
  );
}