import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const electronPath = require("electron");
const nextPath = require.resolve("next/dist/bin/next");
const port = process.env.AFTERPLAY_PORT ?? "3100";

/* Bind to every interface as soon as a public origin is configured.
 *
 * The Audience Room is joined from a phone, which reaches this machine on its LAN IP or
 * through a tunnel. Bound to 127.0.0.1 the dev server refuses those connections outright,
 * so the QR resolves to a host that never answers. Anyone setting
 * AFTERPLAY_PUBLIC_BASE_URL has already said they intend the room to be reachable, so the
 * bind follows that intent instead of needing a second terminal.
 *
 * Loopback stays the default: binding every interface unasked would expose a dev server
 * carrying live API keys to the whole network. AFTERPLAY_HOST overrides either way.
 */
const bindHost =
  process.env.AFTERPLAY_HOST ?? (process.env.AFTERPLAY_PUBLIC_BASE_URL?.trim() ? "0.0.0.0" : "127.0.0.1");
/* Always talk to the server over loopback ourselves. 0.0.0.0 is a bind address, not a
 * destination, and fetching it is unreliable on macOS. */
const baseUrl = `http://127.0.0.1:${port}`;
let nextProcess = null;
let electronProcess = null;
let stopping = false;

async function serverIsReady() {
  try {
    const response = await fetch(`${baseUrl}/api/realtime/status`, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await serverIsReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Afterplay did not become ready at ${baseUrl}.`);
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  electronProcess?.kill("SIGTERM");
  nextProcess?.kill("SIGTERM");
  process.exitCode = exitCode;
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

if (!(await serverIsReady())) {
  nextProcess = spawn(process.execPath, [nextPath, "dev", "--hostname", bindHost, "--port", port], {
    cwd: projectDirectory,
    env: process.env,
    stdio: "inherit",
  });
  nextProcess.once("exit", (code) => {
    if (!stopping && code !== 0) stop(code ?? 1);
  });
}

try {
  await waitForServer();
  electronProcess = spawn(electronPath, [path.join(projectDirectory, "electron/main.mjs")], {
    cwd: projectDirectory,
    env: { ...process.env, AFTERPLAY_BASE_URL: baseUrl },
    stdio: "inherit",
  });
  electronProcess.once("exit", (code) => stop(code ?? 0));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  stop(1);
}
