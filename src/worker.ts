// Cloudflare Workers host. Each canvas is one Durable Object.
//
// Routes:
//   /canvas.svg, /tap          the instance owner's canvas (PROFILE_URL), DO "main"
//   /u/:user/canvas.svg, /tap  one canvas per GitHub username, redirects to github.com/:user
//                              (only when MULTI_TENANT = "true")
import { DurableObject } from "cloudflare:workers";
import { handle, type Host } from "./app";
import { defaultCooldownMs, githubUsername } from "./config";
import { State, type Snapshot } from "./state";

type Env = {
  CANVAS: DurableObjectNamespace<Canvas>;
  PROFILE_URL?: string;
  COOLDOWN_MS?: string;
  MULTI_TENANT?: string;
};

export class Canvas extends DurableObject<Env> {
  private state = new State();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.state.restore(await ctx.storage.get<Snapshot>("state"));
    });
  }

  override async fetch(req: Request): Promise<Response> {
    const host: Host = {
      state: this.state,
      options: {
        // The Worker resolves the redirect target per route and passes it along.
        profileUrl: req.headers.get("x-profile-url") ?? this.env.PROFILE_URL ?? "https://github.com",
        cooldownMs: Number(this.env.COOLDOWN_MS ?? defaultCooldownMs),
      },
      // The Worker stamps this from cf-connecting-ip before forwarding; the DO is
      // only reachable through the Worker, so it cannot be forged.
      clientIp: (r) => r.headers.get("x-client-ip"),
      persist: () => this.ctx.storage.put("state", this.state.snapshot()),
    };
    return handle(req, host);
  }
}

function resolve(url: URL, env: Env): { id: string; profileUrl: string; path: string } | null {
  const m = url.pathname.match(/^\/u\/([^/]+)(\/.*)?$/);
  if (!m) {
    if (!env.PROFILE_URL) return null;
    return { id: "main", profileUrl: env.PROFILE_URL, path: url.pathname };
  }
  if (env.MULTI_TENANT !== "true") return null;
  const user = m[1]!;
  if (!githubUsername.test(user)) return null;
  return { id: `u:${user.toLowerCase()}`, profileUrl: `https://github.com/${user}`, path: m[2] ?? "/" };
}

export default {
  fetch(req: Request, env: Env): Promise<Response> | Response {
    const url = new URL(req.url);
    const target = resolve(url, env);
    if (!target) return new Response("not found", { status: 404 });

    url.pathname = target.path;
    const headers = new Headers(req.headers);
    headers.set("x-client-ip", req.headers.get("cf-connecting-ip") ?? "unknown");
    headers.set("x-profile-url", target.profileUrl);
    // `manual` so the stub returns the 303 instead of following it back into the DO.
    const forwarded = new Request(url, { method: req.method, headers, redirect: "manual" });
    return env.CANVAS.get(env.CANVAS.idFromName(target.id)).fetch(forwarded);
  },
} satisfies ExportedHandler<Env>;
