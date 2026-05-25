"use client";

import { useMemo, useRef, useState } from "react";

type InventoryStatus = "available" | "allocated" | "maintenance" | string;
type InventoryItem = { id: string; name: string; type: string; status: InventoryStatus; capacity?: number; monthly_rate?: number; monthlyRate?: number; };
type FloorSpace = { id: string; label: string; kind: "hot_desk" | "dedicated_desk" | "private_suite" | "conference_room"; shape: "rect" | "circle"; x: number; y: number; width?: number; height?: number; r?: number; capacity: number; monthlyRate: number; };
type FloorMapProps = { inventory: InventoryItem[]; onSelectSpace?: (item: InventoryItem | null) => void; };
type TooltipState = { visible: boolean; x: number; y: number; space: FloorSpace | null; matched: InventoryItem | null; };

const SPACES: FloorSpace[] = [
  { id: "hot_desk_1", label: "HD-01", kind: "hot_desk", shape: "rect", x: 55, y: 75, width: 72, height: 38, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_2", label: "HD-02", kind: "hot_desk", shape: "rect", x: 140, y: 75, width: 72, height: 38, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_3", label: "HD-03", kind: "hot_desk", shape: "rect", x: 225, y: 75, width: 72, height: 38, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_4", label: "HD-04", kind: "hot_desk", shape: "rect", x: 310, y: 75, width: 72, height: 38, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_5", label: "HD-05", kind: "hot_desk", shape: "rect", x: 55, y: 128, width: 72, height: 38, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_6", label: "HD-06", kind: "hot_desk", shape: "rect", x: 140, y: 128, width: 72, height: 38, capacity: 1, monthlyRate: 220 },
  { id: "dedicated_seat_40", label: "DS-40", kind: "dedicated_desk", shape: "rect", x: 490, y: 90, width: 100, height: 56, capacity: 1, monthlyRate: 420 },
  { id: "suite_203", label: "Suite 203", kind: "private_suite", shape: "rect", x: 445, y: 230, width: 200, height: 110, capacity: 8, monthlyRate: 4200 },
  { id: "conference_alpha", label: "Conf. Alpha", kind: "conference_room", shape: "rect", x: 55, y: 240, width: 240, height: 110, capacity: 12, monthlyRate: 1800 },
  { id: "phone_booth_a", label: "Booth A", kind: "conference_room", shape: "circle", x: 350, y: 295, r: 28, capacity: 2, monthlyRate: 520 },
];

function normalizeName(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

function findMatch(space: FloorSpace, inv: InventoryItem[]): InventoryItem | null {
  const t = normalizeName(space.label);
  for (const i of inv) { const s = normalizeName(i.name || ""); if (s && (s.includes(t) || t.includes(s))) return i; }
  return null;
}

const STATUS_STYLES: Record<string, { fill: string; stroke: string; text: string }> = {
  available:   { fill: "#ECFDF5", stroke: "#6EE7B7", text: "#065F46" },
  allocated:   { fill: "#FEF2F2", stroke: "#FCA5A5", text: "#991B1B" },
  maintenance: { fill: "#FFFBEB", stroke: "#FCD34D", text: "#92400E" },
};

function money(v: number) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(v); }

export default function FloorMap({ inventory, onSelectSpace }: FloorMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, space: null, matched: null });

  const rendered = useMemo(() => SPACES.map(space => {
    const matched = findMatch(space, inventory);
    const status = matched?.status || "available";
    const style = STATUS_STYLES[status] || STATUS_STYLES.available;
    return { space, matched, status, style };
  }), [inventory]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }} onMouseLeave={() => setTooltip(p => ({ ...p, visible: false }))}>
      <svg viewBox="0 0 700 400" role="img" aria-label="Floor plan" style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Background */}
        <defs>
          <linearGradient id="floorBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F8FAFC" /><stop offset="100%" stopColor="#F1F5F9" /></linearGradient>
          <filter id="cardShadow"><feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.06" /></filter>
        </defs>
        <rect x={15} y={15} width={670} height={370} rx={16} fill="url(#floorBg)" stroke="#E2E8F0" strokeWidth={1.5} />

        {/* Zone labels */}
        <text x={55} y={58} fill="#94A3B8" fontSize={10} fontWeight={600} letterSpacing={1}>HOT DESKS</text>
        <text x={490} y={78} fill="#94A3B8" fontSize={10} fontWeight={600} letterSpacing={1}>DEDICATED</text>
        <text x={55} y={228} fill="#94A3B8" fontSize={10} fontWeight={600} letterSpacing={1}>CONFERENCE</text>
        <text x={445} y={218} fill="#94A3B8" fontSize={10} fontWeight={600} letterSpacing={1}>PRIVATE SUITES</text>

        {/* Divider */}
        <line x1={35} y1={190} x2={665} y2={190} stroke="#E2E8F0" strokeWidth={1} strokeDasharray="6 4" />

        {/* Spaces */}
        {rendered.map(({ space, matched, style }) => {
          const common = {
            fill: style.fill, stroke: style.stroke, strokeWidth: 1.5, filter: "url(#cardShadow)",
            style: { cursor: "pointer", transition: "all 150ms ease" },
            onMouseMove: (e: React.MouseEvent<SVGElement>) => {
              const b = wrapperRef.current?.getBoundingClientRect();
              if (b) setTooltip({ visible: true, x: e.clientX - b.left + 12, y: e.clientY - b.top - 10, space, matched });
            },
            onClick: () => onSelectSpace?.(matched),
          };
          return (
            <g key={space.id}>
              {space.shape === "rect"
                ? <rect x={space.x} y={space.y} width={space.width} height={space.height} rx={8} {...common} />
                : <circle cx={space.x} cy={space.y} r={space.r} {...common} />
              }
              <text
                x={space.shape === "rect" ? space.x + (space.width ?? 0) / 2 : space.x}
                y={space.shape === "rect" ? space.y + (space.height ?? 0) / 2 + 4 : space.y + 3}
                textAnchor="middle" fontSize={10} fill={style.text} fontWeight={600} pointerEvents="none"
              >{space.label}</text>
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(500, 370)">
          {[["available", "#6EE7B7", "#ECFDF5"], ["allocated", "#FCA5A5", "#FEF2F2"], ["maintenance", "#FCD34D", "#FFFBEB"]].map(([label, stroke, fill], i) => (
            <g key={label} transform={`translate(${i * 65}, 0)`}>
              <rect x={0} y={-8} width={10} height={10} rx={2} fill={fill as string} stroke={stroke as string} strokeWidth={1} />
              <text x={14} y={0} fontSize={9} fill="#94A3B8" fontWeight={500}>{(label as string)[0].toUpperCase() + (label as string).slice(1)}</text>
            </g>
          ))}
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip.visible && tooltip.space && (
        <div style={{
          position: "absolute", left: Math.min(tooltip.x, 480), top: Math.max(tooltip.y, 8), zIndex: 20,
          width: 200, borderRadius: 10, background: "white", border: "1px solid #E2E8F0",
          boxShadow: "0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04)",
          padding: "12px 14px", fontSize: 12, color: "#334155",
        }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#0F172A" }}>{tooltip.matched?.name || tooltip.space.label}</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ color: "#94A3B8" }}>Capacity</span><span style={{ fontWeight: 600 }}>{tooltip.matched?.capacity ?? tooltip.space.capacity}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}><span style={{ color: "#94A3B8" }}>Rate</span><span style={{ fontWeight: 600 }}>{money(tooltip.matched?.monthly_rate ?? tooltip.matched?.monthlyRate ?? tooltip.space.monthlyRate)}/mo</span></div>
          <div style={{ marginTop: 6, display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600, textTransform: "capitalize",
            background: tooltip.matched?.status === "allocated" ? "#FEF2F2" : "#ECFDF5",
            color: tooltip.matched?.status === "allocated" ? "#991B1B" : "#065F46",
          }}>{tooltip.matched?.status || "available"}</div>
        </div>
      )}
    </div>
  );
}
