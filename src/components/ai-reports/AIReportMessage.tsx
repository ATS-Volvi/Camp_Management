import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface AIReportMessageProps {
  content: string;
}

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444",
  "#06b6d4", "#ec4899", "#14b8a6",
];

function extractNumber(cell: string): number | null {
  const cleaned = cell
    .replace(/\*\*/g, "")
    .replace(/[✅⚠️🔴❌🟢🟡]/g, "")
    .replace(/SAR\s*/i, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function cleanCell(cell: string): string {
  return cell.replace(/\*\*/g, "").trim();
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

interface ParsedSection {
  type: "prose" | "table";
  content?: string;
  table?: ParsedTable;
}

/** Parse the full markdown into alternating prose and table sections */
function parseContent(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = content.split("\n");
  let proseLines: string[] = [];
  let i = 0;

  const flushProse = () => {
    const text = proseLines.join("\n").trim();
    if (text) sections.push({ type: "prose", content: text });
    proseLines = [];
  };

  while (i < lines.length) {
    const line = lines[i].trim();

    // Detect table start: line with pipes and next line is separator
    if (
      line.startsWith("|") && line.endsWith("|") &&
      i + 1 < lines.length &&
      /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())
    ) {
      flushProse();
      const headers = line.split("|").filter(Boolean).map(cleanCell);
      // Skip separator
      let j = i + 2;
      const rows: string[][] = [];
      while (
        j < lines.length &&
        lines[j].trim().startsWith("|") &&
        lines[j].trim().endsWith("|")
      ) {
        const cells = lines[j].trim().split("|").filter(Boolean).map(cleanCell);
        rows.push(cells);
        j++;
      }
      if (rows.length > 0) {
        sections.push({ type: "table", table: { headers, rows } });
      }
      i = j;
      continue;
    }

    proseLines.push(lines[i]);
    i++;
  }
  flushProse();
  return sections;
}

function getChartData(table: ParsedTable) {
  if (table.rows.length < 2 || table.rows.length > 25 || table.headers.length < 2) return null;

  let labelIdx = -1;
  const numericCols: { idx: number; header: string }[] = [];

  for (let c = 0; c < table.headers.length; c++) {
    const vals = table.rows.map(r => extractNumber(r[c] || ""));
    const numericCount = vals.filter(v => v !== null).length;
    if (numericCount >= table.rows.length * 0.7 && table.rows.length > 1) {
      numericCols.push({ idx: c, header: table.headers[c] });
    } else if (labelIdx === -1) {
      labelIdx = c;
    }
  }

  if (labelIdx === -1 || numericCols.length === 0) return null;

  const dataRows = table.rows.filter(
    r => !/^(total|summary|grand\s*total|overall)/i.test(r[labelIdx]?.trim() || "")
  );
  if (dataRows.length < 2) return null;

  const data = dataRows.map(r => {
    const entry: Record<string, any> = { name: r[labelIdx]?.substring(0, 18) || "" };
    numericCols.forEach(nc => {
      entry[nc.header] = extractNumber(r[nc.idx] || "") ?? 0;
    });
    return entry;
  });

  const usePie =
    numericCols.length === 1 &&
    dataRows.length <= 8 &&
    data.every(d => d[numericCols[0].header] >= 0);

  return { data, numericCols, usePie };
}

function TableChart({ table }: { table: ParsedTable }) {
  const chartInfo = useMemo(() => getChartData(table), [table]);
  if (!chartInfo) return null;
  const { data, numericCols, usePie } = chartInfo;

  if (usePie) {
    const key = numericCols[0].header;
    return (
      <div className="my-3 p-4 rounded-xl border border-border bg-card/50">
        <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-widest">
          {key} Distribution
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey={key}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={70}
              innerRadius={35}
              paddingAngle={2}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
              fontSize={9}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="my-3 p-4 rounded-xl border border-border bg-card/50">
      <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-widest">
        {numericCols.map(c => c.header).join(" · ")}
      </p>
      <ResponsiveContainer width="100%" height={Math.min(60 + data.length * 28, 320)}>
        <BarChart data={data} layout="vertical" margin={{ left: 5, right: 15, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
          <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
          />
          {numericCols.map((nc, i) => (
            <Bar key={nc.header} dataKey={nc.header} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[0, 4, 4, 0]} barSize={14} />
          ))}
          {numericCols.length > 1 && <Legend wrapperStyle={{ fontSize: 10 }} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function RenderedTable({ table }: { table: ParsedTable }) {
  return (
    <div className="my-3">
      <div className="overflow-x-auto rounded-xl border border-border shadow-sm bg-card">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="bg-primary/10 dark:bg-primary/20">
              {table.headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-left font-semibold text-xs text-primary border-b border-border whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => {
              const isTotal = /^(total|summary|grand\s*total|overall)/i.test(row[0]?.trim() || "");
              return (
                <tr
                  key={ri}
                  className={`transition-colors ${isTotal ? "bg-primary/5 font-semibold" : ri % 2 === 0 ? "bg-transparent" : "bg-muted/20"} hover:bg-muted/40`}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 text-xs border-b border-border/40 ${
                        /[✅⚠️🔴🟢🟡]/.test(cell) ? "text-center" : "text-foreground/80"
                      } ${isTotal ? "text-foreground font-semibold" : ""}`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <TableChart table={table} />
    </div>
  );
}

function ProseSection({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <div className="flex items-center gap-2 mt-5 mb-3 first:mt-0">
            <div className="w-1.5 h-7 rounded-full bg-primary shrink-0" />
            <h1 className="text-lg font-bold text-foreground m-0">{children}</h1>
          </div>
        ),
        h2: ({ children }) => (
          <div className="flex items-center gap-2 mt-5 mb-2 first:mt-0">
            <div className="w-1 h-5 rounded-full bg-primary/60 shrink-0" />
            <h2 className="text-base font-semibold text-primary m-0">{children}</h2>
          </div>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-medium text-foreground/70 mb-1 mt-3">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm leading-relaxed text-foreground/85 my-1.5">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="space-y-1.5 my-2 text-sm list-none pl-0">{children}</ul>
        ),
        li: ({ children }) => (
          <li className="flex items-start gap-2 text-sm text-foreground/85">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
            <span>{children}</span>
          </li>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside space-y-1 my-2 text-sm">{children}</ol>
        ),
        blockquote: ({ children }) => (
          <div className="border-l-4 border-primary/40 bg-primary/5 pl-4 py-3 my-3 rounded-r-lg text-sm text-foreground/80">
            {children}
          </div>
        ),
        hr: () => <hr className="my-5 border-border/50" />,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        code: ({ children, className }) => {
          if (!className) {
            return (
              <code className="bg-primary/10 px-1.5 py-0.5 rounded text-xs font-mono text-primary font-semibold">
                {children}
              </code>
            );
          }
          return <code className={className}>{children}</code>;
        },
        pre: ({ children }) => (
          <pre className="bg-muted rounded-xl p-3 my-3 overflow-x-auto text-xs border border-border">
            {children}
          </pre>
        ),
        // Swallow any tables that leak through (shouldn't happen since we parse them out)
        table: () => null,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

export default function AIReportMessage({ content }: AIReportMessageProps) {
  const sections = useMemo(() => parseContent(content), [content]);

  return (
    <div className="max-w-none">
      {sections.map((section, i) =>
        section.type === "table" && section.table ? (
          <RenderedTable key={i} table={section.table} />
        ) : (
          <ProseSection key={i} content={section.content || ""} />
        )
      )}
    </div>
  );
}
