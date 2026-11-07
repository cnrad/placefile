import { config, cols, rows } from "./config";
import { randomColorIndex } from "./palette";
import { renderSvg } from "./render";
import { State } from "./state";

const state = new State();
await state.load();

/** Last accepted tap per client key. Pruned on each tap. */
const lastTap = new Map<string, number>();

function clientKeys(req: Request, server: { requestIP(r: Request): { address: string } | null }): string[] {
  const keys: string[] = [];
  // Only trust a proxy-set header named in config; anything else is client-spoofable.
  const ip =
    (config.trustedIpHeader ? req.headers.get(config.trustedIpHeader) : null) ??
    server.requestIP(req)?.address;
  if (ip) keys.push(`ip:${ip}`);
  const cookie = req.headers.get("cookie")?.match(/(?:^|;\s*)pp=([^;]+)/)?.[1];
  if (cookie) keys.push(`ck:${cookie}`);
  return keys;
}

function onCooldown(keys: string[], now: number): boolean {
  for (const [k, t] of lastTap) if (now - t > config.cooldownMs) lastTap.delete(k);
  return keys.some((k) => {
    const t = lastTap.get(k);
    return t !== undefined && now - t < config.cooldownMs;
  });
}

/** Browsers append ismap clicks as `?x,y` in CSS pixels of the rendered image. */
function parseTap(url: URL): { col: number; row: number } | null {
  const m = url.search.match(/^\?(\d+),(\d+)$/);
  if (!m) return null;
  const x = Number(m[1]);
  const y = Number(m[2]);
  const col = Math.floor(x / config.cell);
  const row = Math.floor(y / config.cell);
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { col, row };
}

function redirectHome(extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, {
    status: 303,
    headers: { location: config.profileUrl, "cache-control": "no-store", ...extraHeaders },
  });
}

const server = Bun.serve({
  port: config.port,
  fetch(req, srv) {
    const url = new URL(req.url);

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
      const keys = clientKeys(req, srv);
      const headers: Record<string, string> = {};
      let cookieId = keys.find((k) => k.startsWith("ck:"))?.slice(3);
      if (!cookieId) {
        cookieId = crypto.randomUUID();
        headers["set-cookie"] = `pp=${cookieId}; Path=/tap; Max-Age=31536000; SameSite=Lax; Secure; HttpOnly`;
        keys.push(`ck:${cookieId}`);
      }
      if (tap && !onCooldown(keys, now)) {
        state.place(tap.col, tap.row, randomColorIndex(), now);
        for (const k of keys) lastTap.set(k, now);
      }
      return redirectHome(headers);
    }

    if (url.pathname === "/health") {
      return Response.json({ ok: true, marks: state.marks.length, total: state.total });
    }

    if (url.pathname === "/") return redirectHome();
    return new Response("not found", { status: 404 });
  },
});

console.log(`profile-place listening on http://localhost:${server.port}`);
