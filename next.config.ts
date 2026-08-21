import type { NextConfig } from "next";

/** Origins allowed to request dev-only assets.
 *
 * Next blocks cross-origin requests to dev assets by default, and the server is
 * initialised on `localhost`. A phone joining the Audience Room hits the machine's LAN IP
 * or a tunnel host instead, so its JS chunks are refused: the page renders the
 * server-side HTML and then never hydrates. The symptom is a room stuck forever on
 * "Finding room" — the page looks fine, the fetch simply never runs.
 *
 * Derived from `AFTERPLAY_PUBLIC_BASE_URL` rather than hardcoded, because that is already
 * the origin the QR code points at. Setting one variable therefore fixes both the link
 * and the asset policy; hardcoding an IP here would silently rot the moment someone
 * joins a different network.
 */
function devOrigins(): string[] {
  const origins = new Set<string>([
    // Common tunnel providers, so a demo does not need a config edit to go public.
    "*.trycloudflare.com",
    "*.ngrok-free.app",
    "*.ngrok.io",
    "*.loca.lt",
  ]);

  const configured = process.env.AFTERPLAY_PUBLIC_BASE_URL?.trim();
  if (configured) {
    try {
      // Accept a bare host as well as a full URL: people paste both.
      origins.add(new URL(configured.includes("://") ? configured : `http://${configured}`).hostname);
    } catch {
      // A malformed value must not take the dev server down; the room URL builder
      // already reports it as a visible error.
    }
  }

  for (const extra of (process.env.AFTERPLAY_DEV_ORIGINS ?? "").split(",")) {
    const trimmed = extra.trim();
    if (trimmed) origins.add(trimmed);
  }

  return [...origins];
}

const nextConfig: NextConfig = {
  allowedDevOrigins: devOrigins(),
};

export default nextConfig;
