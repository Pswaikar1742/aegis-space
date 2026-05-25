"use client";

import { useMemo, useRef, useState } from "react";

type InventoryStatus = "available" | "allocated" | "maintenance" | string;

type InventoryItem = {
  id: string;
  name: string;
  type: string;
  status: InventoryStatus;
  capacity?: number;
  monthly_rate?: number;
  monthlyRate?: number;
};

type FloorSpace = {
  id: string;
  label: string;
  kind: "hot_desk" | "dedicated_desk" | "private_suite" | "conference_room";
  shape: "rect" | "circle";
  x: number;
  y: number;
  width?: number;
  height?: number;
  r?: number;
  capacity: number;
  monthlyRate: number;
};

type FloorMapProps = {
  inventory: InventoryItem[];
};

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  space: FloorSpace | null;
  matched: InventoryItem | null;
};

const SPACES: FloorSpace[] = [
  { id: "hot_desk_1", label: "Hot Desk 1", kind: "hot_desk", shape: "rect", x: 60, y: 80, width: 80, height: 42, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_2", label: "Hot Desk 2", kind: "hot_desk", shape: "rect", x: 155, y: 80, width: 80, height: 42, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_3", label: "Hot Desk 3", kind: "hot_desk", shape: "rect", x: 250, y: 80, width: 80, height: 42, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_4", label: "Hot Desk 4", kind: "hot_desk", shape: "rect", x: 345, y: 80, width: 80, height: 42, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_5", label: "Hot Desk 5", kind: "hot_desk", shape: "rect", x: 60, y: 140, width: 80, height: 42, capacity: 1, monthlyRate: 220 },
  { id: "hot_desk_6", label: "Hot Desk 6", kind: "hot_desk", shape: "rect", x: 155, y: 140, width: 80, height: 42, capacity: 1, monthlyRate: 220 },
  { id: "dedicated_seat_40", label: "Dedicated Seat #40", kind: "dedicated_desk", shape: "rect", x: 500, y: 115, width: 110, height: 65, capacity: 1, monthlyRate: 420 },
  { id: "suite_203", label: "Private Suite 203", kind: "private_suite", shape: "rect", x: 455, y: 240, width: 210, height: 120, capacity: 8, monthlyRate: 4200 },
  { id: "conference_alpha", label: "Conference Room Alpha", kind: "conference_room", shape: "rect", x: 80, y: 250, width: 250, height: 130, capacity: 12, monthlyRate: 1800 },
  { id: "phone_booth_a", label: "Phone Booth A", kind: "conference_room", shape: "circle", x: 375, y: 310, r: 30, capacity: 2, monthlyRate: 520 },
];

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveStatus(item: InventoryItem | null): InventoryStatus {
  if (!item) return "available";
  return item.status;
}

function statusStyle(status: InventoryStatus): { fill: string; stroke: string } {
  if (status === "allocated") {
    return { fill: "#ffd8d8", stroke: "#8c1d1d" };
  }
  return { fill: "#dff8df", stroke: "#1e6b2c" };
}

function findInventoryMatch(space: FloorSpace, inventory: InventoryItem[]): InventoryItem | null {
  const target = normalizeName(space.label);
  for (const item of inventory) {
    const source = normalizeName(item.name || "");
    if (!source) continue;
    if (source.includes(target) || target.includes(source)) {
      return item;
    }
  }
  return null;
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function FloorMap({ inventory }: FloorMapProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    space: null,
    matched: null,
  });

  const renderedSpaces = useMemo(() => {
    return SPACES.map((space) => {
      const matched = findInventoryMatch(space, inventory);
      const status = resolveStatus(matched);
      const style = statusStyle(status);
      return { space, matched, status, style };
    });
  }, [inventory]);

  const hideTooltip = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  const showTooltip = (
    event: React.MouseEvent<SVGElement, MouseEvent>,
    space: FloorSpace,
    matched: InventoryItem | null,
  ) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const bounds = wrapper.getBoundingClientRect();
    const x = event.clientX - bounds.left + 14;
    const y = event.clientY - bounds.top - 12;

    setTooltip({ visible: true, x, y, space, matched });
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 14,
        border: "1px solid #c8d8cf",
        background: "linear-gradient(140deg, #f4f9f4 0%, #e9f2ed 60%, #f9fbfa 100%)",
        padding: 10,
      }}
      onMouseLeave={hideTooltip}
    >
      <svg viewBox="0 0 760 460" role="img" aria-label="Kalyan Center floor map" style={{ width: "100%", height: "auto", display: "block" }}>
        <rect x={20} y={20} width={720} height={420} rx={18} fill="#f8fbf8" stroke="#9ab9a2" strokeWidth={2} />
        <path d="M40 205 H720" stroke="#bfd4c5" strokeWidth={2} strokeDasharray="7 5" />
        <text x={38} y={52} fill="#305846" fontSize={20} fontWeight={700}>Kalyan Center</text>
        <text x={38} y={72} fill="#547a67" fontSize={12}>Interactive Availability Map</text>

        {renderedSpaces.map(({ space, matched, style, status }) => {
          const sharedProps = {
            fill: style.fill,
            stroke: style.stroke,
            strokeWidth: 2,
            style: { cursor: "pointer", transition: "fill 140ms ease, stroke 140ms ease" },
            onMouseMove: (event: React.MouseEvent<SVGElement, MouseEvent>) => showTooltip(event, space, matched),
            onFocus: () => {
              setTooltip((prev) => ({ ...prev, visible: false }));
            },
            "data-status": status,
          } as const;

          return (
            <g key={space.id}>
              {space.shape === "rect" ? (
                <rect x={space.x} y={space.y} width={space.width} height={space.height} rx={8} {...sharedProps} />
              ) : (
                <circle cx={space.x} cy={space.y} r={space.r} {...sharedProps} />
              )}
              <text
                x={space.shape === "rect" ? space.x + (space.width ?? 0) / 2 : space.x}
                y={space.shape === "rect" ? space.y + (space.height ?? 0) / 2 + 5 : space.y + 4}
                textAnchor="middle"
                fontSize={11}
                fill="#254436"
                fontWeight={600}
                pointerEvents="none"
              >
                {space.label}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltip.visible && tooltip.space ? (
        <div
          style={{
            position: "absolute",
            left: Math.min(tooltip.x, 560),
            top: Math.max(tooltip.y, 10),
            zIndex: 10,
            width: 220,
            borderRadius: 10,
            background: "#ffffff",
            border: "1px solid #b8ccc0",
            boxShadow: "0 8px 20px rgba(19, 35, 27, 0.14)",
            padding: "10px 12px",
            fontSize: 12,
            color: "#294738",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>{tooltip.space.label}</div>
          <div><strong>Name:</strong> {tooltip.matched?.name ?? tooltip.space.label}</div>
          <div><strong>Capacity:</strong> {tooltip.matched?.capacity ?? tooltip.space.capacity}</div>
          <div><strong>Monthly Rate:</strong> {money(tooltip.matched?.monthly_rate ?? tooltip.matched?.monthlyRate ?? tooltip.space.monthlyRate)}</div>
          <div style={{ marginTop: 4, textTransform: "capitalize" }}>
            <strong>Status:</strong> {resolveStatus(tooltip.matched)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
