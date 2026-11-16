import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PivotMatrixResult, ReportConfig, ChartType } from "@/lib/dynamicReports/types";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Compass,
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

// Vibrant 2D-matched executive palette
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

// Vibrant heatmap interpolation (electric blue -> cyan -> vivid orange -> deep coral)
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

function createTextSprite(text: string, color = "#1e293b", fontSize = 24): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Sprite();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const display = text.length > 15 ? text.slice(0, 13) + "…" : text;
  ctx.fillText(display, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(3.4, 0.85, 1);
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

  // Mesh group for raycasting
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const hoveredMeshRef = useRef<THREE.Mesh | null>(null);
  const originalColorRef = useRef<THREE.Color>(new THREE.Color(0, 0, 0));
  const originalScaleRef = useRef<THREE.Vector3>(new THREE.Vector3(1, 1, 1));

  // Determine active 3D mode from config or internal state
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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hoveredInfo, setHoveredInfo] = useState<HoveredPillarInfo | null>(null);

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

    // 1. Setup Scene with Crisp White / Studio Background
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf8fafc); // Clean executive white-slate
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
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // stay above studio floor
    controls.minDistance = 5;
    controls.maxDistance = 100;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.2;

    // 5. Studio Lighting (Soft White Studio with crisp highlights)
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
    scene.add(objectsGroup);

    if (activeMode === "3d_bar") {
      build3DBarChart(objectsGroup);
    } else if (activeMode === "3d_line") {
      build3DLineChart(objectsGroup);
    } else if (activeMode === "3d_donut") {
      build3DDonutChart(objectsGroup);
    }

    // 7. Raycasting for Mouse Interaction
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
          // Reset previous
          if (hoveredMeshRef.current && (hoveredMeshRef.current.material as THREE.MeshStandardMaterial)) {
            const prevMat = hoveredMeshRef.current.material as THREE.MeshStandardMaterial;
            prevMat.color.copy(originalColorRef.current);
            if (activeMode === "3d_donut") {
              hoveredMeshRef.current.scale.copy(originalScaleRef.current);
            }
          }
          // Highlight current
          hoveredMeshRef.current = mesh;
          const mat = mesh.material as THREE.MeshStandardMaterial;
          originalColorRef.current.copy(mat.color);
          originalScaleRef.current.copy(mesh.scale);

          // Subtle bright pulse highlight
          mat.color.offsetHSL(0, 0.1, 0.15);

          if (activeMode === "3d_donut") {
            mesh.scale.set(1.06, 1.06, 1.1);
          }
        }

        const data = mesh.userData;
        setHoveredInfo({
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
          const prevMat = hoveredMeshRef.current.material as THREE.MeshStandardMaterial;
          prevMat.color.copy(originalColorRef.current);
          if (activeMode === "3d_donut") {
            hoveredMeshRef.current.scale.copy(originalScaleRef.current);
          }
          hoveredMeshRef.current = null;
        }
        setHoveredInfo(null);
      }
    };

    const handlePointerLeave = () => {
      if (hoveredMeshRef.current && (hoveredMeshRef.current.material as THREE.MeshStandardMaterial)) {
        const prevMat = hoveredMeshRef.current.material as THREE.MeshStandardMaterial;
        prevMat.color.copy(originalColorRef.current);
        if (activeMode === "3d_donut") {
          hoveredMeshRef.current.scale.copy(originalScaleRef.current);
        }
        hoveredMeshRef.current = null;
      }
      setHoveredInfo(null);
    };

    renderer.domElement.addEventListener("mousemove", handlePointerMove);
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
      renderer.domElement.removeEventListener("mouseleave", handlePointerLeave);
      renderer.dispose();
      controls.dispose();
      scene.clear();
    };
  }, [chartData, chartSeriesKeys, activeMode, towerShape, useHeatmap, heightScale, maxVal]);

  // Sync autoRotate state with OrbitControls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // -------------------------------------------------------------
  // BUILDER 1: 3D Bar Chart (Towers on White Studio Floor)
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

    // Crisp White Studio Floor Pedestal
    const slabGeo = new THREE.BoxGeometry(totalWidthX + 5, 0.4, totalDepthZ + 5);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
      metalness: 0.05,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, -0.2, 0);
    slab.receiveShadow = true;
    group.add(slab);

    // Subtle Light Grid
    const gridHelper = new THREE.GridHelper(
      Math.max(totalWidthX, totalDepthZ) + 5,
      Math.max(numRows, numCols) + 2,
      0x94a3b8,
      0xe2e8f0
    );
    gridHelper.position.set(0, 0.02, 0);
    group.add(gridHelper);

    // Row Axis Labels (X-axis)
    chartData.forEach((row, r) => {
      const x = (r - (numRows - 1) / 2) * spacingX;
      const z = ((numCols - 1) / 2) * spacingZ + 2.4;
      const sprite = createTextSprite(row.name, "#1e293b", 22);
      sprite.position.set(x, 0.35, z);
      group.add(sprite);
    });

    // Column Axis Labels (Z-axis)
    chartSeriesKeys.forEach((colKey, c) => {
      const z = (c - (numCols - 1) / 2) * spacingZ;
      const x = -((numRows - 1) / 2) * spacingX - 2.4;
      const sprite = createTextSprite(colKey, "#0369a1", 22);
      sprite.position.set(x, 0.35, z);
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
        const h = Math.max(0.18, normalized * maxPillarHeight);

        // Geometry based on shape
        let geo: THREE.BufferGeometry;
        if (towerShape === "cylinder") {
          geo = new THREE.CylinderGeometry(pillarWidth * 0.46, pillarWidth * 0.48, h, 28);
        } else if (towerShape === "hexagon") {
          geo = new THREE.CylinderGeometry(pillarWidth * 0.5, pillarWidth * 0.5, h, 6);
        } else {
          geo = new THREE.BoxGeometry(pillarWidth, h, pillarWidth);
        }

        // Color computation
        let pillarColor: THREE.Color;
        if (useHeatmap) {
          pillarColor = getVibrantHeatmapColor(normalized);
        } else {
          pillarColor = new THREE.Color(VIBRANT_PALETTE[c % VIBRANT_PALETTE.length]);
        }

        const mat = new THREE.MeshStandardMaterial({
          color: pillarColor,
          roughness: 0.25,
          metalness: 0.15,
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

        // Subtle beveled top cap
        if (val > 0) {
          const capGeo = new THREE.CylinderGeometry(pillarWidth * 0.52, pillarWidth * 0.52, 0.08, 16);
          const capMat = new THREE.MeshStandardMaterial({
            color: pillarColor,
            roughness: 0.1,
            metalness: 0.3,
          });
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.set(x, h + 0.04, z);
          group.add(cap);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // BUILDER 2: 3D Line Chart (Tubular Ribbons in White Studio)
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

    // Floor Grid
    const gridHelper = new THREE.GridHelper(
      Math.max(totalWidthX, totalDepthZ) + 6,
      Math.max(numRows, numSeries) + 2,
      0x94a3b8,
      0xe2e8f0
    );
    gridHelper.position.set(0, 0.02, 0);
    group.add(gridHelper);

    // Row Axis Labels (X-axis)
    chartData.forEach((row, r) => {
      const x = (r - (numRows - 1) / 2) * spacingX;
      const z = ((numSeries - 1) / 2) * spacingZ + 2.2;
      const sprite = createTextSprite(row.name, "#1e293b", 22);
      sprite.position.set(x, 0.35, z);
      group.add(sprite);
    });

    // Series Labels (Z-axis)
    chartSeriesKeys.forEach((colKey, s) => {
      const z = (s - (numSeries - 1) / 2) * spacingZ;
      const x = -((numRows - 1) / 2) * spacingX - 2.5;
      const sprite = createTextSprite(colKey, "#0369a1", 22);
      sprite.position.set(x, 0.35, z);
      group.add(sprite);
    });

    // Build 3D Tubes for each series
    chartSeriesKeys.forEach((colKey, sIndex) => {
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

        // Data point sphere (joint)
        const sphereGeo = new THREE.SphereGeometry(0.38, 20, 20);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: seriesColor,
          roughness: 0.2,
          metalness: 0.2,
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
        group.add(sphere);

        // Vertical drop pillar line to floor
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x, 0.05, z),
          new THREE.Vector3(x, y, z),
        ]);
        const lineMat = new THREE.LineBasicMaterial({
          color: seriesColor,
          transparent: true,
          opacity: 0.3,
        });
        const dropLine = new THREE.Line(lineGeo, lineMat);
        group.add(dropLine);

        // Base ring on floor
        const ringGeo = new THREE.RingGeometry(0.2, 0.28, 16);
        const ringMat = new THREE.MeshBasicMaterial({
          color: seriesColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 0.03, z);
        group.add(ring);
      });

      // Construct Smooth 3D Spline Tube
      if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.18, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: seriesColor,
          roughness: 0.2,
          metalness: 0.25,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.castShadow = true;
        group.add(tubeMesh);
      }
    });
  }

  // -------------------------------------------------------------
  // BUILDER 3: 3D Donut Chart (Extruded Ring with 360° Slices)
  // -------------------------------------------------------------
  function build3DDonutChart(group: THREE.Group) {
    if (!chartData || chartData.length === 0) return;

    // Use primary row sums or first series
    const firstSeries = chartSeriesKeys[0];
    const items = chartData.map((d) => ({
      name: d.name,
      value: Math.max(0, Number(d[firstSeries]) || 0),
    }));

    const total = items.reduce((acc, curr) => acc + curr.value, 0) || 1;

    // Circular Studio Pedestal
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

    // Subtle Concentric Rings on Base
    const ringGuideGeo = new THREE.RingGeometry(3.5, 12.5, 48);
    const ringGuideMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      side: THREE.DoubleSide,
    });
    const ringGuide = new THREE.Mesh(ringGuideGeo, ringGuideMat);
    ringGuide.rotation.x = -Math.PI / 2;
    ringGuide.position.set(0, 0.02, 0);
    group.add(ringGuide);

    const innerRadius = 4.2;
    const outerRadius = 8.5;
    const extrudeDepth = 2.4 * heightScale;

    let currentAngle = 0;

    items.forEach((item, index) => {
      const slicePct = item.value / total;
      const sliceAngle = slicePct * Math.PI * 2;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      if (sliceAngle <= 0.01) return;

      // Create Extruded Arc Shape
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
      geo.rotateX(-Math.PI / 2); // rest flat horizontally

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

      mesh.userData = {
        isInteractable: true,
        rowName: item.name,
        colName: firstSeries || "Value",
        value: item.value,
        formatted: item.value.toLocaleString(),
        percentage: slicePct * 100,
      };

      group.add(mesh);

      // Label Billboard near perimeter
      const midAngle = (startAngle + endAngle) / 2;
      const labelDist = outerRadius + 2.8;
      const lx = Math.cos(midAngle) * labelDist;
      const lz = -Math.sin(midAngle) * labelDist;
      const labelSprite = createTextSprite(
        `${item.name} (${(slicePct * 100).toFixed(0)}%)`,
        "#1e293b",
        20
      );
      labelSprite.position.set(lx, extrudeDepth * 0.7, lz);
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

    const centerLabel = createTextSprite("TOTAL", "#64748b", 20);
    centerLabel.position.set(0, extrudeDepth * 0.55, 0);
    group.add(centerLabel);

    const centerTotalSprite = createTextSprite(total.toLocaleString(), "#0f172a", 26);
    centerTotalSprite.position.set(0, extrudeDepth * 0.55 + 0.9, 0);
    group.add(centerTotalSprite);
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

  // Snapshot PNG Export
  const handleSnapshot = () => {
    if (!rendererRef.current) return;
    const dataUrl = rendererRef.current.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `3d-${activeMode}-${config.dataset}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  return (
    <div
      className={`relative bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all duration-300 ${
        isFullscreen ? "fixed inset-2 z-50 rounded-2xl flex flex-col shadow-2xl" : "w-full"
      } ${className}`}
    >
      {/* 3D Top Header & Controls Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 text-slate-700 z-10">
        {/* Left: Title & 3D Chart Switcher */}
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
            3D Studio (WebGL)
          </span>
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-2 py-0 border-blue-400 text-blue-700 bg-blue-50"
          >
            Vibrant Studio
          </Badge>

          {/* 3D Chart Mode Selector: Bar / Line / Donut */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs ml-2">
            <Button
              size="sm"
              variant={activeMode === "3d_bar" ? "default" : "ghost"}
              onClick={() => onChartTypeChange && onChartTypeChange("3d_bar")}
              className="h-6 px-2 text-[11px] gap-1 font-medium"
              title="3D Isometric Bar Grid"
            >
              <BarChart3 size={12} /> 3D Bar
            </Button>
            <Button
              size="sm"
              variant={activeMode === "3d_line" ? "default" : "ghost"}
              onClick={() => onChartTypeChange && onChartTypeChange("3d_line")}
              className="h-6 px-2 text-[11px] gap-1 font-medium"
              title="3D Flowing Line Ribbon"
            >
              <TrendingUp size={12} /> 3D Line
            </Button>
            <Button
              size="sm"
              variant={activeMode === "3d_donut" ? "default" : "ghost"}
              onClick={() => onChartTypeChange && onChartTypeChange("3d_donut")}
              className="h-6 px-2 text-[11px] gap-1 font-medium"
              title="3D Extruded Beveled Donut"
            >
              <PieIcon size={12} /> 3D Donut
            </Button>
          </div>
        </div>

        {/* Right: Camera Angles, Tower Options & Utilities */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Camera Angles */}
          <div className="flex items-center bg-white rounded-md p-0.5 border border-slate-200 shadow-2xs">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCameraAngle("iso")}
              className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-slate-900"
              title="Isometric 3D"
            >
              Iso
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCameraAngle("top")}
              className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-slate-900"
              title="Top Plan View"
            >
              Top
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCameraAngle("front")}
              className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-slate-900"
              title="Front Horizon"
            >
              Front
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCameraAngle("side")}
              className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-slate-900"
              title="Side Elevation"
            >
              Side
            </Button>
          </div>

          {/* Tower Shapes (only in 3D Bar mode) */}
          {activeMode === "3d_bar" && (
            <div className="flex items-center bg-white rounded-md p-0.5 border border-slate-200 shadow-2xs">
              <Button
                size="sm"
                variant={towerShape === "box" ? "secondary" : "ghost"}
                onClick={() => setTowerShape("box")}
                className="h-6 w-6 p-0"
                title="Square Cuboids"
              >
                <Square size={12} />
              </Button>
              <Button
                size="sm"
                variant={towerShape === "cylinder" ? "secondary" : "ghost"}
                onClick={() => setTowerShape("cylinder")}
                className="h-6 w-6 p-0"
                title="Cylinders"
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

          {/* Color Mode Switcher (only in 3D Bar) */}
          {activeMode === "3d_bar" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setUseHeatmap(!useHeatmap)}
              className="h-6 px-2 text-[10px] font-medium bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
              title="Toggle Heatmap vs Vibrant Palette"
            >
              <Palette size={11} className="mr-1 text-primary" />
              {useHeatmap ? "Heatmap" : "Vibrant"}
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
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
            title="Toggle Smooth 360° Orbit Presentation"
          >
            {autoRotate ? <Pause size={10} /> : <Play size={10} />}
            Orbit
          </Button>

          {/* Snapshot PNG */}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSnapshot}
            className="h-6 w-6 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            title="Download Crisp 3D Snapshot (PNG)"
          >
            <Download size={13} />
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="h-6 w-6 p-0 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D Studio"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </Button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container with Crisp Light Studio Background */}
      <div
        ref={containerRef}
        className={`w-full relative cursor-grab active:cursor-grabbing bg-[#f8fafc] ${
          isFullscreen ? "flex-1 min-h-[500px]" : "h-[420px]"
        }`}
      />

      {/* Height Scale Elevation Slider Overlay */}
      {activeMode !== "3d_donut" && (
        <div className="absolute bottom-3 left-4 bg-white/90 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-slate-700 shadow-sm z-10">
          <Sliders size={12} className="text-primary" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
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
          <span className="text-[10px] font-mono font-bold text-primary">{heightScale.toFixed(1)}x</span>
        </div>
      )}

      {/* Gesture Guide Hint Overlay */}
      <div className="absolute bottom-3 right-4 hidden sm:flex items-center gap-2 bg-white/85 backdrop-blur-xs border border-slate-200 px-2.5 py-1 rounded-md text-[10px] text-slate-500 shadow-2xs pointer-events-none z-10">
        <span>Left-click: Orbit</span>
        <span>•</span>
        <span>Right-click: Pan</span>
        <span>•</span>
        <span>Wheel: Zoom</span>
      </div>

      {/* Floating Raycaster Glass HUD Tooltip with crisp contrast */}
      {hoveredInfo && (
        <div
          className="fixed pointer-events-none z-50 p-2.5 rounded-lg bg-slate-950/95 backdrop-blur-md border border-sky-400/60 shadow-2xl text-white text-xs max-w-xs space-y-1 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: `${hoveredInfo.x}px`,
            top: `${hoveredInfo.y}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
            <span className="font-bold text-sky-400 truncate max-w-[140px]">
              {hoveredInfo.rowName}
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">
              {hoveredInfo.percentage.toFixed(1)}% Total
            </span>
          </div>

          <div className="flex justify-between items-center text-[11px] pt-0.5">
            <span className="text-slate-400 truncate pr-2">{hoveredInfo.colName}:</span>
            <span className="font-mono font-bold text-amber-300 text-sm">
              {hoveredInfo.formatted}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}