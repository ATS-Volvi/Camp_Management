import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CURRENT_ARAMCO_BILLING_PACK,
  AramcoBillingSummary,
} from "@/data/enterpriseCateringSuiteData";
import {
  FileText,
  Download,
  CheckCircle2,
  Layers,
  Sparkles,
  ShieldCheck,
  Building2,
  DollarSign,
  Maximize2,
  RotateCcw,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AramcoAuditCube3DProps {
  className?: string;
}

export default function AramcoAuditCube3D({ className }: AramcoAuditCube3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [data] = useState<AramcoBillingSummary>(CURRENT_ARAMCO_BILLING_PACK);
  const [isExploded, setIsExploded] = useState(false);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [isExported, setIsExported] = useState(false);

  const handleExportBillingPack = () => {
    setIsExported(true);
    toast.success("Aramco Master Billing Package Generated!", {
      description: `Exported unified audit pack (${data.contractNumber}) with SAP Document ${data.sapPostingDocument}. Total: SAR ${data.netInvoicedSAR.toLocaleString()}.`,
    });
  };

  const layerDefinitions = [
    {
      title: "1. Verified Inmate Bed Nights",
      count: data.layers.inmateBedNights.count,
      unit: "Bed Nights",
      rate: data.layers.inmateBedNights.rateSAR,
      subtotal: data.layers.inmateBedNights.subtotalSAR,
      color: 0x3b82f6,
      desc: "Verified physical bed occupancy across all 5 camp blocks.",
    },
    {
      title: "2. Scanned Dining Hall Meals",
      count: data.layers.scannedDiningMeals.count,
      unit: "Verified Scans",
      rate: data.layers.scannedDiningMeals.rateSAR,
      subtotal: data.layers.scannedDiningMeals.subtotalSAR,
      color: 0x10b981,
      desc: "Turnstile biometric & QR scans at camp dining halls.",
    },
    {
      title: "3. Approved Field Packed Meals",
      count: data.layers.approvedFieldPacks.count,
      unit: "Packed Meals",
      rate: data.layers.approvedFieldPacks.rateSAR,
      subtotal: data.layers.approvedFieldPacks.subtotalSAR,
      color: 0xa855f7,
      desc: "Dispatched contractor packed lunches with supervisor sign-offs.",
    },
    {
      title: "4. Approved Food Cancellations (Credit)",
      count: data.layers.deductedCancellations.count,
      unit: "Cancellations",
      rate: data.layers.deductedCancellations.creditSAR,
      subtotal: data.layers.deductedCancellations.subtotalSAR,
      color: 0xef4444,
      desc: "Catering credits for timely food cancellations prior to cutoff.",
    },
  ];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101d);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(16, 14, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 45;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(15, 20, 15);
    scene.add(dirLight);

    const amberLight = new THREE.PointLight(0xfe932c, 1.5, 30);
    amberLight.position.set(-10, 5, -10);
    scene.add(amberLight);

    // 4 Slices of the 3D Audit Cube
    const cubeWidth = 8.0;
    const layerThickness = 1.8;
    const layerMeshes: THREE.Mesh[] = [];

    layerDefinitions.forEach((def, idx) => {
      const geo = new THREE.BoxGeometry(cubeWidth, layerThickness, cubeWidth);
      const mat = new THREE.MeshStandardMaterial({
        color: def.color,
        roughness: 0.3,
        metalness: 0.4,
        emissive: def.color,
        emissiveIntensity: 0.2,
      });

      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      // Edges wireframe
      const edges = new THREE.EdgesGeometry(geo);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })
      );
      mesh.add(line);

      layerMeshes.push(mesh);
    });

    // Raycast on Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(layerMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const idx = layerMeshes.indexOf(hit);
        if (idx !== -1) {
          setSelectedLayerIndex(idx);
        }
      }
    };

    container.addEventListener("click", onClick);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Position layers based on whether Exploded or Compact
      layerMeshes.forEach((mesh, idx) => {
        const baseY = (idx - 1.5) * (layerThickness + 0.15);
        const targetY = isExploded ? baseY * 2.5 : baseY;

        // Smooth Lerp to target position
        mesh.position.y += (targetY - mesh.position.y) * 0.1;

        // Subtle rotation if exploded
        if (isExploded) {
          mesh.rotation.y = Math.sin(t * 0.5 + idx) * 0.05;
        } else {
          mesh.rotation.y = 0;
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
  }, [isExploded]);

  const activeDef = layerDefinitions[selectedLayerIndex];

  return (
    <div className={`space-y-4 ${className || ""}`}>
      {/* Top Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#0c2340] text-white shadow-sm border border-[#fe932c]/30">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#fe932c]" />
            <h3 className="text-base font-bold tracking-tight">
              3D Aramco Executive Audit Cube & SAP Billing Reconciliation
            </h3>
            <Badge variant="outline" className="text-[10px] bg-[#fe932c]/20 text-[#fe932c] border-[#fe932c]/40 font-bold uppercase">
              Contract Billing Binder
            </Badge>
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Combines verified inmate bed nights, scanned dining hall meals, packed field lunches, and approved food cancellations into a <strong>single audit-proof billing pack</strong>.
          </p>
        </div>

        {/* 1-Click Explode Toggle */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => setIsExploded(!isExploded)}
            className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-white font-bold text-xs gap-1.5 shadow-xs"
          >
            <Layers className="h-3.5 w-3.5 text-[#fe932c]" />
            {isExploded ? "Assemble Cube" : "Explode Audit Layers"}
          </Button>
          <Button
            size="sm"
            onClick={handleExportBillingPack}
            className="bg-[#fe932c] hover:bg-[#e68222] text-slate-950 font-bold text-xs gap-1.5 shadow-xs"
          >
            <Download className="h-3.5 w-3.5" />
            {isExported ? "Billing Pack Ready" : "Export Aramco Pack"}
          </Button>
        </div>
      </div>

      {/* Main 3D Stage + Layer Audit Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* 3D Cube Canvas */}
        <div className="lg:col-span-8 rounded-xl border border-border/80 bg-slate-950 overflow-hidden relative shadow-md">
          <div ref={mountRef} className="w-full h-[460px]" />

          {/* SAP Verification Badge Overlay */}
          <div className="absolute top-3 left-3 p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs space-y-1 backdrop-blur-md text-white">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="h-4 w-4" />
              <span>SAP ERP RECONCILED</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Posting Ref: {data.sapPostingDocument}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Variance: SAR 0.00 (Zero Discrepancy)
            </div>
          </div>

          <div className="absolute bottom-3 left-3 p-2 rounded-lg bg-slate-900/90 border border-slate-700 text-xs text-white">
            <span>Viewing Layer: </span>
            <strong className="text-[#fe932c]">{activeDef.title}</strong>
          </div>
        </div>

        {/* Selected Layer Financial Breakdown Card */}
        <div className="lg:col-span-4 rounded-xl border border-border/80 bg-card p-4 space-y-4 shadow-sm text-foreground">
          <div className="flex items-start justify-between border-b border-border/60 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                {data.billingMonth} &bull; {data.clientName}
              </span>
              <h4 className="text-base font-bold text-foreground">
                Contract Invoicing Summary
              </h4>
              <span className="text-xs text-muted-foreground font-mono">
                {data.contractNumber}
              </span>
            </div>

            <Badge className="bg-emerald-600 text-white font-mono text-[10px]">
              AUDITED
            </Badge>
          </div>

          {/* Active Layer Inspector */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-2">
            <strong className="block font-semibold text-primary">{activeDef.title}</strong>
            <p className="text-[11px] text-muted-foreground">{activeDef.desc}</p>
            <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-muted-foreground text-[10px] block">Verified Units:</span>
                <strong>{activeDef.count.toLocaleString()} {activeDef.unit}</strong>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground text-[10px] block">Agreed Rate:</span>
                <strong>SAR {activeDef.rate.toFixed(2)}</strong>
              </div>
            </div>
            <div className="pt-1 flex justify-between font-bold text-sm">
              <span>Subtotal:</span>
              <span className="font-mono text-primary">SAR {activeDef.subtotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Layer Selector Chips */}
          <div className="grid grid-cols-2 gap-1.5">
            {layerDefinitions.map((l, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedLayerIndex(idx)}
                className={`p-2 rounded-lg text-left text-[11px] border transition-all ${
                  selectedLayerIndex === idx
                    ? "bg-[#0c2340] text-white dark:bg-primary dark:text-primary-foreground font-bold shadow-xs"
                    : "bg-muted/30 border-border/60 hover:bg-muted text-foreground"
                }`}
              >
                <span className="truncate block font-semibold">{l.title.split(". ")[1]}</span>
                <span className="font-mono text-[10px] text-muted-foreground block">
                  SAR {l.subtotal.toLocaleString()}
                </span>
              </button>
            ))}
          </div>

          {/* Net Invoice Grand Total */}
          <div className="p-3.5 rounded-xl border border-[#fe932c]/30 bg-[#fe932c]/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                Net Billed to Saudi Aramco
              </span>
              <span className="text-xl font-black font-mono text-primary">
                SAR {data.netInvoicedSAR.toLocaleString()}
              </span>
            </div>
            <ShieldCheck className="h-8 w-8 text-[#fe932c]" />
          </div>

          {/* Dual Sign-off Footnote */}
          <div className="text-[10px] text-muted-foreground space-y-1 pt-1 border-t border-border/40">
            <div>Contractor Sign-off: <strong>{data.auditSignOff.campManager}</strong></div>
            <div>Aramco Lead Auditor: <strong>{data.auditSignOff.clientRepresentative}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}
