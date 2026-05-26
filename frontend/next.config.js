/** @type {import('next').NextConfig} */
const nextConfig = {
  // ── Production optimisations ───────────────────────────────────────────
  output: "standalone",        // Produces a minimal self-contained output for Vercel
  poweredByHeader: false,      // Remove X-Powered-By header

  // ── Local development only: proxy API calls to the backend ─────────────
  // In production, the frontend calls the Render backend directly via
  // NEXT_PUBLIC_API_BASE_URL — no rewrite needed.
  async rewrites() {
    // Only enable rewrites when running locally (no VERCEL env set)
    if (process.env.VERCEL) return [];

    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://aegis-space-backend.onrender.com";
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },

  // ── Environment variables exposed to the browser ───────────────────────
  env: {
    NEXT_PUBLIC_APP_NAME: "AegiSpace",
  },
};

module.exports = nextConfig;