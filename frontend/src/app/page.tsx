"use client";

import { useState } from "react";

import { orchestrateInquiry } from "../lib/api";

type DeskStatus = "available" | "occupied";

type Desk = {
  id: string;
  label: string;
  status: DeskStatus;
};

const desks: Desk[] = [
  { id: "desk-1", label: "Desk A1", status: "available" },
  { id: "desk-2", label: "Desk A2", status: "occupied" },
  { id: "desk-3", label: "Desk B1", status: "available" },
  { id: "desk-4", label: "Desk B2", status: "occupied" },
  { id: "desk-5", label: "Desk C1", status: "available" },
  { id: "desk-6", label: "Desk C2", status: "occupied" },
];

const testInquiry = {
  email_body:
    "Hello AegisSpace, we need two desks for next Monday and want to know which spots are open.",
  branch_id: "branch-demo-01",
};

export default function Page() {
  const [responseJson, setResponseJson] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTrigger() {
    setLoading(true);
    setError(null);

    try {
      const result = await orchestrateInquiry(testInquiry);
      setResponseJson(JSON.stringify(result, null, 2));
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to reach the orchestrate endpoint.";
      setError(message);
      setResponseJson("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        color: "#e5eef8",
        background:
          "radial-gradient(circle at top, rgba(14, 165, 233, 0.16), transparent 30%), linear-gradient(180deg, #07111f 0%, #0b1324 100%)",
      }}
    >
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "grid",
          gap: 24,
        }}
      >
        <header
          style={{
            display: "grid",
            gap: 12,
            padding: "28px",
            borderRadius: 24,
            background: "rgba(8, 15, 30, 0.84)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            boxShadow: "0 20px 60px rgba(2, 6, 23, 0.35)",
          }}
        >
          <p style={{ margin: 0, color: "#7dd3fc", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12 }}>
            AegisSpace Skeleton UI
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 4vw, 3.75rem)", lineHeight: 1.05 }}>
            Workspace desks and a single orchestrate trigger.
          </h1>
          <p style={{ margin: 0, maxWidth: 720, color: "#b6c2d2", fontSize: 16, lineHeight: 1.6 }}>
            Green desks are available. Red desks are occupied. The button sends raw
            test input to the backend orchestrate endpoint and prints the JSON response.
          </p>
        </header>

        <section
          aria-label="workspace desks"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          {desks.map((desk) => (
            <article
              key={desk.id}
              style={{
                minHeight: 140,
                padding: 18,
                borderRadius: 20,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background:
                  desk.status === "available"
                    ? "linear-gradient(180deg, rgba(22, 163, 74, 0.95), rgba(21, 128, 61, 0.95))"
                    : "linear-gradient(180deg, rgba(220, 38, 38, 0.95), rgba(153, 27, 27, 0.95))",
                color: "#f8fafc",
                boxShadow: "0 16px 40px rgba(2, 6, 23, 0.28)",
              }}
            >
              <span style={{ fontSize: 14, opacity: 0.9 }}>{desk.label}</span>
              <strong style={{ fontSize: 22, letterSpacing: "0.02em" }}>
                {desk.status === "available" ? "Available" : "Occupied"}
              </strong>
            </article>
          ))}
        </section>

        <section
          style={{
            display: "grid",
            gap: 16,
            padding: 24,
            borderRadius: 24,
            background: "rgba(8, 15, 30, 0.84)",
            border: "1px solid rgba(148, 163, 184, 0.18)",
          }}
        >
          <button
            type="button"
            onClick={handleTrigger}
            disabled={loading}
            style={{
              width: "fit-content",
              padding: "14px 22px",
              borderRadius: 999,
              border: "none",
              background: loading ? "#475569" : "#38bdf8",
              color: "#02111f",
              fontWeight: 700,
              cursor: loading ? "progress" : "pointer",
            }}
          >
            {loading ? "Sending..." : "Send test orchestrate request"}
          </button>

          {error ? (
            <div
              role="alert"
              style={{
                padding: 16,
                borderRadius: 16,
                background: "rgba(220, 38, 38, 0.15)",
                border: "1px solid rgba(248, 113, 113, 0.4)",
                color: "#fecaca",
              }}
            >
              {error}
            </div>
          ) : null}

          <pre
            style={{
              margin: 0,
              minHeight: 180,
              padding: 20,
              borderRadius: 16,
              overflowX: "auto",
              background: "#050b16",
              color: "#dbeafe",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {responseJson || "Response JSON will appear here after the trigger runs."}
          </pre>
        </section>
      </section>
    </main>
  );
}