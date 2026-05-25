"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import FloorMap from "../components/FloorMap";

type InventoryItem = {
  id: string;
  name: string;
  type: string;
  status: "available" | "allocated" | "maintenance" | string;
  capacity?: number;
  monthly_rate?: number;
  monthlyRate?: number;
};

type LeadRecord = {
  id: string;
  company_name?: string;
  contact_email?: string;
  status?: string;
  deal_size?: number;
  created_at?: string;
};

type OrchestrateResponse = Record<string, unknown>;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const POLL_INTERVAL_MS = 5000;
const BRANCH_ID = "4a7b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d";

const demoBodies = [
  {
    label: "Hot Desk Inquiry",
    email_body:
      "Hi team, we need 2 hot desks for a startup pod and monthly budget is around 600. Can we start next week?",
  },
  {
    label: "Dedicated Seat #40",
    email_body:
      "We want Dedicated Seat #40 for our founder. Budget 500 monthly and immediate move-in preferred.",
  },
  {
    label: "Suite 203 + Alpha Room",
    email_body:
      "Please quote private suite 203 for 8 people and occasional access to conference room alpha. Budget 5000.",
  },
];

async function requestJSON(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }

  return response.json();
}

function parseInventory(payload: unknown): InventoryItem[] {
  if (Array.isArray(payload)) return payload as InventoryItem[];
  if (payload && typeof payload === "object") {
    const typed = payload as Record<string, unknown>;
    if (Array.isArray(typed.items)) return typed.items as InventoryItem[];
    if (Array.isArray(typed.data)) return typed.data as InventoryItem[];
  }
  return [];
}

function parseLeads(payload: unknown): LeadRecord[] {
  if (Array.isArray(payload)) return payload as LeadRecord[];
  if (payload && typeof payload === "object") {
    const typed = payload as Record<string, unknown>;
    if (Array.isArray(typed.items)) return typed.items as LeadRecord[];
    if (Array.isArray(typed.data)) return typed.data as LeadRecord[];
  }
  return [];
}

export default function Page() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [orchestrateOutput, setOrchestrateOutput] = useState<OrchestrateResponse | null>(null);
  const [orchestrateBusy, setOrchestrateBusy] = useState<string | null>(null);

  const loadLiveData = useCallback(async () => {
    try {
      setRefreshError(null);
      const [inventoryPayload, leadsPayload] = await Promise.all([
        requestJSON(`/api/v1/inventory?branch_id=${BRANCH_ID}`),
        requestJSON(`/api/v1/leads?branch_id=${BRANCH_ID}`),
      ]);

      setInventory(parseInventory(inventoryPayload));
      setLeads(parseLeads(leadsPayload));
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Failed to load backend data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const prime = async () => {
      if (!active) return;
      await loadLiveData();
    };

    void prime();
    const interval = window.setInterval(() => {
      if (!active) return;
      void loadLiveData();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [loadLiveData]);

  const metrics = useMemo(() => {
    const available = inventory.filter((item) => item.status === "available").length;
    const allocated = inventory.filter((item) => item.status === "allocated").length;
    const activeLeads = leads.filter((lead) => lead.status !== "workbench_halted").length;
    return {
      totalSpaces: inventory.length,
      available,
      allocated,
      activeLeads,
    };
  }, [inventory, leads]);

  const runDemo = async (emailBody: string, label: string) => {
    try {
      setOrchestrateBusy(label);
      const response = await fetch(`${API_BASE}/api/v1/nexus/orchestrate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email_body: emailBody,
          branch_id: BRANCH_ID,
        }),
      });

      const body = (await response.json()) as OrchestrateResponse;
      setOrchestrateOutput(body);
    } catch (error) {
      setOrchestrateOutput({
        error: error instanceof Error ? error.message : "Unknown orchestrate failure",
      });
    } finally {
      setOrchestrateBusy(null);
      void loadLiveData();
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 12% 5%, #f3faf3, #e8f1ec 48%, #e4edf3 100%)",
        padding: "28px clamp(14px, 4vw, 40px)",
        color: "#1e3a2c",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <section style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.5rem, 3.3vw, 2.3rem)", lineHeight: 1.2 }}>AegiSpace Allocation Console</h1>
        <p style={{ margin: "8px 0 0", color: "#3f5f50" }}>
          Live backend metrics and interactive floor status synced every 5 seconds.
        </p>
        {isLoading ? <p style={{ marginTop: 8 }}>Loading live data...</p> : null}
        {refreshError ? <p style={{ marginTop: 8, color: "#8f2f2f" }}>{refreshError}</p> : null}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <article style={{ border: "1px solid #bfd5c6", borderRadius: 12, background: "#ffffffdd", padding: 12 }}>
          <div style={{ color: "#507061", fontSize: 12 }}>Total Spaces</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.totalSpaces}</div>
        </article>
        <article style={{ border: "1px solid #bfd5c6", borderRadius: 12, background: "#ffffffdd", padding: 12 }}>
          <div style={{ color: "#507061", fontSize: 12 }}>Available</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.available}</div>
        </article>
        <article style={{ border: "1px solid #e0c2c2", borderRadius: 12, background: "#fff7f7", padding: 12 }}>
          <div style={{ color: "#845151", fontSize: 12 }}>Allocated</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.allocated}</div>
        </article>
        <article style={{ border: "1px solid #bfd5c6", borderRadius: 12, background: "#ffffffdd", padding: 12 }}>
          <div style={{ color: "#507061", fontSize: 12 }}>Active Leads</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>{metrics.activeLeads}</div>
        </article>
      </section>

      <section style={{ marginBottom: 20 }}>
        <FloorMap inventory={inventory} />
      </section>

      <section
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          alignItems: "start",
        }}
      >
        <article style={{ border: "1px solid #bfd5c6", borderRadius: 12, background: "#ffffffd9", padding: 14 }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>Demo Sandbox</h2>
          <p style={{ margin: "0 0 12px", color: "#496858", fontSize: 14 }}>
            Run orchestration simulations against live API pipeline.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {demoBodies.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => void runDemo(item.email_body, item.label)}
                disabled={Boolean(orchestrateBusy)}
                style={{
                  borderRadius: 8,
                  border: "1px solid #8db39a",
                  background: orchestrateBusy === item.label ? "#d4e7d8" : "#e8f3eb",
                  color: "#244235",
                  textAlign: "left",
                  padding: "9px 11px",
                  cursor: orchestrateBusy ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {orchestrateBusy === item.label ? "Running..." : item.label}
              </button>
            ))}
          </div>
        </article>

        <article style={{ border: "1px solid #c4d6ca", borderRadius: 12, background: "#f7faf8", padding: 14 }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "1.1rem" }}>UI Console</h2>
          <pre
            style={{
              margin: 0,
              minHeight: 260,
              borderRadius: 10,
              border: "1px solid #d1e1d8",
              background: "#f2f9f5",
              padding: 12,
              overflowX: "auto",
              color: "#1e3e2f",
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {JSON.stringify(
              orchestrateOutput ?? { info: "Select a Demo Sandbox scenario to call /api/v1/nexus/orchestrate" },
              null,
              2,
            )}
          </pre>
        </article>
      </section>
    </main>
  );
}
