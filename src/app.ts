import { config, cols, rows, offsetX, offsetY, height, type RuntimeOptions } from "./config";
import { renderSvg } from "./render";
import type { Snapshot, State } from "./state";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type Host = {
  state: State;
  options: RuntimeOptions;
  /** Real client IP as determined by the host (proxy header or socket). */
  clientIp(req: Request): string | null;
  /** Called after any mutation; hosts persist however they like. */
  persist(): void | Promise<void>;
};

function clientKeys(req: Request, host: Host): string[] {
  const keys: string[] = [];
  const ip = host.clientIp(req);
  if (ip) keys.push(`ip:${ip}`);
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)pp=([^;]+)/)?.[1];
  if (cookie) keys.push(`ck:${cookie}`);
  return keys;
}

/** Browsers append ismap clicks as `?x,y` in CSS pixels of the rendered image. */
export function parseTap(url: URL): { col: number; row: number } | null {
  const m = url.search.match(/^\?(\d+),(\d+)$/);
  if (!m) return null;
  // Clicks in the padding snap to the nearest edge cell.
  const col = Math.min(cols - 1, Math.max(0, Math.floor((Number(m[1]) - offsetX) / config.cell)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor((Number(m[2]) - offsetY) / config.cell)));
  if (Number(m[2]) >= height) return null;
  return { col, row };
}

function redirectHome(host: Host, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 303,
    headers: { location: host.options.profileUrl, "cache-control": "no-store", ...extraHeaders },
  });
}

export async function handle(req: Request, host: Host): Promise<Response> {
  const url = new URL(req.url);
  const { state } = host;

  if (url.pathname === "/canvas.svg") {
    const theme = url.searchParams.get("theme") === "dark" ? "dark" : "light";
    return new Response(renderSvg(state, theme), {
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        // Camo forwards these to the browser, so every profile view re-fetches.
        "cache-control": "no-cache, no-store, max-age=0, must-revalidate",
        pragma: "no-cache",
        expires: "0",
      },
    });
  }

  if (url.pathname === "/tap") {
    const now = Date.now();
    const tap = parseTap(url);
    const keys = clientKeys(req, host);
    const headers: Record<string, string> = {};
    let cookieId = keys.find((k) => k.startsWith("ck:"))?.slice(3);
    if (!cookieId) {
      cookieId = crypto.randomUUID();
      headers["set-cookie"] = `pp=${cookieId}; Path=/tap; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`;
      keys.push(`ck:${cookieId}`);
    }
    if (tap && !state.onCooldown(keys, now, host.options.cooldownMs)) {
      // Color follows the IP so it survives cookie clears and matches across a visitor's devices on one network.
      const identity = keys.find((k) => k.startsWith("ip:")) ?? `ck:${cookieId}`;
      state.toggle(tap.col, tap.row, state.hueFor(identity), now);
      state.recordTap(keys, now);
      await host.persist();
    }
    return redirectHome(host, headers);
  }

  if (url.pathname === "/export" || url.pathname === "/import") {
    const token = host.options.adminToken;
    const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token || !given || !timingSafeEqual(token, given)) return new Response("forbidden", { status: 403 });
    if (url.pathname === "/export") return Response.json(state.snapshot(), { headers: { "cache-control": "no-store" } });
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
    state.restore((await req.json()) as Partial<Snapshot>);
    await host.persist();
    return Response.json({ ok: true, marks: state.marks.length, total: state.total });
  }

  if (url.pathname === "/health") {
    return Response.json({ ok: true, marks: state.marks.length, total: state.total });
  }

  if (url.pathname === "/") return redirectHome(host);
  return new Response("not found", { status: 404 });
}
