// Cloudflare Workers host. Each canvas is one Durable Object.
//
// Routes:
//   /u/:user/...          one canvas per GitHub user, clicks redirect to github.com/:user
//   /u/:user/:key/...     a separate canvas for the same user; rotate the key to shake off bots
//   /r/:owner/:repo/...   one canvas per repository, clicks redirect to github.com/:owner/:repo
//
// Under each: canvas.svg, tap, health, and (with ADMIN_TOKEN set) export, import.
import { DurableObject } from "cloudflare:workers";
import { handle, type Host } from "./app";
import { defaultCooldownMs, githubRepo, githubUsername } from "./config";
import { State, type Snapshot } from "./state";

type Env = {
  CANVAS: DurableObjectNamespace<Canvas>;
  COOLDOWN_MS?: string;
  /** Secret. Enables /export and /import for moving canvases between deployments. */
  ADMIN_TOKEN?: string;
};

const REPO_URL = "https://github.com/cnrad/placefile";

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
        profileUrl: req.headers.get("x-profile-url") ?? "https://github.com",
        cooldownMs: Number(this.env.COOLDOWN_MS ?? defaultCooldownMs),
        adminToken: this.env.ADMIN_TOKEN,
      },
      // The Worker stamps this from cf-connecting-ip before forwarding; the DO is
      // only reachable through the Worker, so it cannot be forged.
      clientIp: (r) => r.headers.get("x-client-ip"),
      persist: () => this.ctx.storage.put("state", this.state.snapshot()),
    };
    return handle(req, host);
  }
}

function resolve(pathname: string): { id: string; profileUrl: string; path: string } | null {
  const ROUTE = "(?:canvas\\.svg|tap|health|export|import)";
  // Plain form first so a key can never shadow a route name.
  const user =
    pathname.match(new RegExp(`^/u/([^/]+)()(/${ROUTE})?$`)) ??
    pathname.match(new RegExp(`^/u/([^/]+)/([A-Za-z0-9_-]{6,64})(/${ROUTE})?$`));
  if (user) {
    const [, name, key, rest] = user;
    if (!githubUsername.test(name!)) return null;
    const id = key ? `u:${name!.toLowerCase()}#${key}` : `u:${name!.toLowerCase()}`;
    return { id, profileUrl: `https://github.com/${name}`, path: rest ?? "/" };
  }
  const repo = pathname.match(/^\/r\/([^/]+)\/([^/]+)(\/.*)?$/);
  if (repo) {
    const [, owner, name, rest] = repo;
    if (!githubUsername.test(owner!) || !githubRepo.test(name!)) return null;
    return {
      id: `r:${owner!.toLowerCase()}/${name!.toLowerCase()}`,
      profileUrl: `https://github.com/${owner}/${name}`,
      path: rest ?? "/",
    };
  }
  return null;
}

export default {
  fetch(req: Request, env: Env): Promise<Response> | Response {
    const url = new URL(req.url);
    if (url.pathname === "/") return Response.redirect(REPO_URL, 302);
    const target = resolve(url.pathname);
    if (!target) return new Response("not found", { status: 404 });

    url.pathname = target.path;
    const headers = new Headers(req.headers);
    headers.set("x-client-ip", req.headers.get("cf-connecting-ip") ?? "unknown");
    headers.set("x-profile-url", target.profileUrl);
    // `manual` so the stub returns the 303 instead of following it back into the DO.
    const forwarded = new Request(url, { method: req.method, headers, body: req.body, redirect: "manual" });
    return env.CANVAS.get(env.CANVAS.idFromName(target.id)).fetch(forwarded);
  },
} satisfies ExportedHandler<Env>;
