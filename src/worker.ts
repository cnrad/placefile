// Cloudflare Workers host. One Durable Object holds the canvas; the Worker just forwards.
import { DurableObject } from "cloudflare:workers";
import { handle, type Host } from "./app";
import { defaultOptions } from "./config";
import { State, type Snapshot } from "./state";

type Env = {
  CANVAS: DurableObjectNamespace<Canvas>;
  PROFILE_URL?: string;
  COOLDOWN_MS?: string;
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
        profileUrl: this.env.PROFILE_URL ?? defaultOptions.profileUrl,
        cooldownMs: Number(this.env.COOLDOWN_MS ?? defaultOptions.cooldownMs),
      },
      // The Worker stamps this from cf-connecting-ip before forwarding; the DO is
      // only reachable through the Worker, so it cannot be forged.
      clientIp: (r) => r.headers.get("x-client-ip"),
      persist: () => this.ctx.storage.put("state", this.state.snapshot()),
    };
    return handle(req, host);
  }
}

export default {
  fetch(req: Request, env: Env): Promise<Response> {
    const headers = new Headers(req.headers);
    headers.set("x-client-ip", req.headers.get("cf-connecting-ip") ?? "unknown");
    const forwarded = new Request(req, { headers });
    return env.CANVAS.get(env.CANVAS.idFromName("main")).fetch(forwarded);
  },
} satisfies ExportedHandler<Env>;
