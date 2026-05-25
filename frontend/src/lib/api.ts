export type OrchestrateRequest = {
  email_body: string;
  branch_id: string;
};

const DEFAULT_API_BASE_URL = "http://localhost:8080";

function buildApiUrl(pathname: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  return `${baseUrl.replace(/\/$/, "")}${pathname}`;
}

export async function orchestrateInquiry(payload: OrchestrateRequest) {
  const response = await fetch(buildApiUrl("/api/v1/nexus/orchestrate"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      message || `Orchestrate request failed with status ${response.status}`,
    );
  }

  return response.json();
}