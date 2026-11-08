// Plain Bun server for local development. State is one JSON file in DATA_DIR.
// Not the production host; see worker.ts.
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { handle, type Host } from "./app";
import { defaultCooldownMs } from "./config";
import { State } from "./state";

const dataDir = process.env.DATA_DIR ?? "./data";
const path = join(dataDir, "state.json");
const trustedIpHeader = process.env.TRUSTED_IP_HEADER ?? "x-forwarded-for";

const state = new State();
mkdirSync(dataDir, { recursive: true });
if (existsSync(path)) state.restore(await Bun.file(path).json());

let saveTimer: ReturnType<typeof setTimeout> | null = null;

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  fetch(req, srv) {
    const host: Host = {
      state,
      options: {
        profileUrl: process.env.PROFILE_URL ?? "https://github.com",
        cooldownMs: Number(process.env.COOLDOWN_MS ?? defaultCooldownMs),
      },
      // Only trust a proxy-set header; anything else is client-spoofable.
      clientIp: (r) => r.headers.get(trustedIpHeader) ?? srv.requestIP(r)?.address ?? null,
      persist() {
        if (saveTimer) return;
        saveTimer = setTimeout(() => {
          saveTimer = null;
          void Bun.write(path, JSON.stringify(state.snapshot()));
        }, 250);
      },
    };
    return handle(req, host);
  },
});

console.log(`profile-place listening on http://localhost:${server.port}`);
