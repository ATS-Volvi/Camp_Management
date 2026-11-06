import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface DashboardKpi {
  label: string;
  value: string | number;
}

export interface DashboardChart {
  title: string;
  dataUrl: string;
  /** Natural size of the rendered chart in CSS pixels, so the PDF can keep its proportions. */
  width: number;
  height: number;
  /** Labels the chart shows as HTML next to the drawing (donut breakdowns, series names). */
  legend: string[];
}

const CSS_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5", "--border", "--foreground", "--muted-foreground"];
const PX_TO_MM = 0.26458;
/** jsPDF's built-in fonts cannot draw typographic symbols, so they are folded to ASCII. */
const sanitize = (text: string) => text
  .replace(/[≤]/g, "<=").replace(/[≥]/g, ">=")
  .replace(/[—–]/g, "-").replace(/[""]/g, '"').replace(/['']/g, "'")
  .replace(/[•]/g, "-").replace(/[×]/g, "x").replace(/[…]/g, "...")
  .replace(/[✓]/g, "v").replace(/[✗]/g, "x").replace(/[→]/g, "->");
const MAX_CHART_HEIGHT = 118;
/** A4 landscape printable width (297mm - 24mm margins) in CSS pixels. */
const PRINTABLE_CSS_PX = (297 - 24) / PX_TO_MM;

/**
 * Render one recharts SVG to a raster image.
 *
 * Recharts paints with CSS custom properties (`hsl(var(--chart-1))`) and styles its
 * axis text from the page stylesheet, both of which a detached SVG loses, and the
 * theme stores those colours as bare channel triplets that a canvas cannot accept.
 * The resolved values are therefore read from computed styles and copied onto the clone.
 */
async function svgToPng(svg: SVGSVGElement, host: HTMLElement, paper: string) {
  const styles = getComputedStyle(host);
  const vars = CSS_VARS.map(name => `${name}:${styles.getPropertyValue(name).trim()}`).join(";");
  const box = svg.getBoundingClientRect();
  const width = Math.max(1, Math.round(box.width));
  const height = Math.max(1, Math.round(box.height));
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  clone.style.cssText = `${vars};background:${paper}`;
  const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
  style.textContent = `text{font-family:'Space Grotesk',system-ui,sans-serif}`
    + `.recharts-text{fill:${styles.getPropertyValue("--muted-foreground").trim() || "#666"}}`
    + `.recharts-legend-item-text{color:${styles.getPropertyValue("--foreground").trim() || "#111"}!important}`;
  clone.insertBefore(style, clone.firstChild);
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Chart could not be rendered for export"));
    image.src = source;
  });
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Chart could not be rendered for export");
  context.fillStyle = paper;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return trimCanvas(canvas, paper, width, height);
}

/**
 * Cut away the empty band recharts leaves inside the drawing.
 *
 * The legend is rendered as HTML below the SVG, but the plot area is still sized as
 * if it were inside it, so the bottom fifth of the raster is blank. Exporting that
 * band would push every caption away from its chart.
 */
function trimCanvas(canvas: HTMLCanvasElement, paper: string, cssWidth: number, cssHeight: number) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Chart could not be rendered for export");
  const { width, height } = canvas;
  const { data } = context.getImageData(0, 0, width, height);
  const sample = document.createElement("canvas").getContext("2d");
  sample!.fillStyle = paper;
  sample!.fillRect(0, 0, 1, 1);
  const [pr, pg, pb] = [...sample!.getImageData(0, 0, 1, 1).data];
  const isPaper = (index: number) => Math.abs(data[index] - pr) < 8 && Math.abs(data[index + 1] - pg) < 8 && Math.abs(data[index + 2] - pb) < 8;
  let top = -1;
  let bottom = -1;
  let left = width;
  let right = 0;
  for (let y = 0; y < height; y++) {
    let found = false;
    for (let x = 0; x < width; x++) {
      if (!isPaper((y * width + x) * 4)) {
        found = true;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    if (found) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  if (top < 0) return { canvas, width: cssWidth, height: cssHeight };
  const pad = 4;
  const x = Math.max(0, left - pad);
  const y = Math.max(0, top - pad);
  const cropped = document.createElement("canvas");
  cropped.width = Math.min(width - x, right - left + pad * 2);
  cropped.height = Math.min(height - y, bottom - top + pad * 2);
  const croppedContext = cropped.getContext("2d");
  if (!croppedContext) throw new Error("Chart could not be rendered for export");
  croppedContext.fillStyle = paper;
  croppedContext.fillRect(0, 0, cropped.width, cropped.height);
  croppedContext.drawImage(canvas, x, y, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
  const scale = canvas.width / cssWidth;
  return { canvas: cropped, width: Math.round(cropped.width / scale), height: Math.round(cropped.height / scale) };
}

/**
 * Cut a wide chart into page-sized horizontal slices.
 *
 * A chart that only stays readable by scrolling on screen must not be squeezed into
 * one PDF page, so each slice is exported at its own on-screen width.
 */
function sliceCanvas(canvas: HTMLCanvasElement, width: number, height: number, paper: string, title: string, legend: string[]): DashboardChart[] {
  const parts = Math.max(1, Math.ceil(width / PRINTABLE_CSS_PX));
  const sliceWidth = Math.ceil(width / parts);
  const scale = canvas.width / width;
  return Array.from({ length: parts }, (_, index) => {
    const part = document.createElement("canvas");
    part.width = sliceWidth * scale;
    part.height = height * scale;
    const context = part.getContext("2d");
    if (!context) throw new Error("Chart could not be rendered for export");
    context.fillStyle = paper;
    context.fillRect(0, 0, part.width, part.height);
    context.drawImage(canvas, index * sliceWidth * scale, 0, sliceWidth * scale, height * scale, 0, 0, part.width, part.height);
    return {
      title: parts > 1 ? `${title} (part ${index + 1} of ${parts})` : title,
      legend,
      dataUrl: part.toDataURL("image/jpeg", 0.92),
      width: sliceWidth,
      height,
    };
  });
}

/** Every chart panel currently on the dashboard, in page order, minus the drill-down dialog. */
export async function collectDashboardCharts(root: HTMLElement): Promise<DashboardChart[]> {
  const panels = [...root.querySelectorAll<HTMLElement>(".command-panel")]
    .filter(panel => panel.querySelector("svg.recharts-surface") && !panel.closest("[role=dialog]"));
  const paper = getComputedStyle(panels[0] ?? root).backgroundColor || "#ffffff";
  const charts: DashboardChart[] = [];
  for (const panel of panels) {
    const svg = panel.querySelector<SVGSVGElement>("svg.recharts-surface");
    if (!svg) continue;
    const heading = panel.querySelector("h2")?.innerText.trim();
    const legend = [...panel.querySelectorAll(".recharts-legend-item-text, button, [role=button]")]
      .map(node => {
        // Donut rows keep name and value in separate spans; join them with a space.
        const parts = [...node.children].map(child => (child.textContent ?? "").trim()).filter(Boolean);
        return sanitize((parts.length ? parts.join("  ") : (node.textContent ?? "")).replace(/\s+/g, " ").trim());
      })
      .filter((text): text is string => Boolean(text && text.length < 70));
    try {
      const { canvas, width, height } = await svgToPng(svg, root, paper);
      charts.push(...sliceCanvas(canvas, width, height, paper, sanitize(heading || "Chart"), legend));
    } catch {
      // A chart that cannot be rasterized is skipped instead of failing the whole export.
    }
  }
  return charts;
}

export function buildDashboardPdf(options: { title: string; subtitle: string; kpis: DashboardKpi[]; charts: DashboardChart[]; fileName: string }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const printable = pageWidth - margin * 2;
  let cursor = 14;

  const spaceLeft = () => pageHeight - cursor - margin;
  const newPage = () => {
    doc.addPage();
    cursor = 14;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 33, 61);
  doc.text(sanitize(options.title), margin, cursor);
  cursor += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 118, 133);
  doc.text(sanitize(options.subtitle), margin, cursor);
  cursor += 6;

  if (options.kpis.length) {
    autoTable(doc, {
      startY: cursor,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2.5, halign: "center", lineColor: [220, 226, 235], lineWidth: 0.2 },
      head: [options.kpis.map(kpi => sanitize(kpi.label))],
      body: [options.kpis.map(kpi => sanitize(String(kpi.value)))],
      headStyles: { fillColor: [56, 152, 236], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { textColor: [20, 33, 61], fontStyle: "bold" },
      margin: { left: margin, right: margin },
    });
    cursor = (doc as any).lastAutoTable.finalY + 7;
  }

  // Charts that are roughly square sit two per row; wide ones keep the whole page.
  const gap = 8;
  const half = (printable - gap) / 2;
  const isWide = (chart: DashboardChart) => chart.height / chart.width < 0.5;
  const rows: DashboardChart[][] = [];
  for (const chart of options.charts) {
    if (isWide(chart)) rows.push([chart]);
    else {
      const last = rows[rows.length - 1];
      if (last && last.length === 1) last.push(chart);
      else rows.push([chart]);
    }
  }

  const compact = (chart: DashboardChart) => chart.legend.length <= 8 && chart.legend.every(line => line.length <= 26);

  const sizeFor = (chart: DashboardChart, slot: number, maxH: number) => {
    const ratio = chart.height / chart.width;
    // Fill the slot: wide charts arrive pre-sliced, so widening never crushes labels.
    let width = slot;
    let height = width * ratio;
    if (height > maxH) {
      height = maxH;
      width = height / ratio;
    }
    const columns = slot < printable ? 2 : 3;
    const legendHeight = chart.legend.length && compact(chart) ? Math.ceil(chart.legend.length / columns) * 4 + 2 : 0;
    return { width, height, columns, legendHeight, needed: 6 + height + legendHeight };
  };

  const drawChart = (chart: DashboardChart, x: number, y: number, slot: number, maxH: number) => {
    const { width, height, columns } = sizeFor(chart, slot, maxH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(20, 33, 61);
    doc.text(chart.title.slice(0, 90), x, y);
    doc.addImage(chart.dataUrl, "JPEG", x, y + 3, width, height);
    const bottom = y + 3 + height + 3;
    if (compact(chart)) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(90, 98, 113);
      const columnWidth = slot / columns;
      chart.legend.forEach((line, index) => {
        doc.text(line.slice(0, 46), x + (index % columns) * columnWidth, bottom + Math.floor(index / columns) * 4);
      });
      return bottom + Math.ceil(chart.legend.length / columns) * 4;
    }
    return bottom;
  };

  /** Long breakdowns (30+ departments, 14 nationalities) get the full page width below the row. */
  const drawLegendBlock = (row: DashboardChart[], y: number) => {
    let bottom = y;
    for (const chart of row) {
      if (!chart.legend.length || compact(chart)) continue;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(20, 33, 61);
      doc.text(chart.title.slice(0, 90), margin, bottom);
      bottom += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(90, 98, 113);
      const columns = 2;
      const columnWidth = printable / columns;
      chart.legend.forEach((line, index) => {
        doc.text(line.slice(0, 60), margin + (index % columns) * columnWidth, bottom + Math.floor(index / columns) * 3.6);
      });
      bottom += Math.ceil(chart.legend.length / columns) * 3.6 + 3;
    }
    return bottom;
  };

  for (const row of rows) {
    const maxH = row.length === 1 ? 150 : MAX_CHART_HEIGHT;
    const sizes = row.map(chart => sizeFor(chart, isWide(chart) ? printable : half, maxH));
    const legendHeight = row.filter(chart => !compact(chart) && chart.legend.length)
      .reduce((total, chart) => total + Math.ceil(chart.legend.length / 2) * 3.6 + 7, 0);
    const needed = Math.max(...sizes.map(size => size.needed)) + legendHeight;
    if (spaceLeft() < needed) newPage();
    const bottoms = row.map((chart, index) => drawChart(chart, margin + index * (half + gap), cursor, isWide(chart) ? printable : half, maxH));
    cursor = drawLegendBlock(row, Math.max(...bottoms) + 3) + 7;
  }

  doc.save(options.fileName);
}
