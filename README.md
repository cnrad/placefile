# profile-place

A shared pixel canvas that lives in your GitHub profile README. Visitors click a square to light it up or turn it off. The newest 200 squares stay; older ones fade out as new ones arrive. Each lit square pulses a soft glow.

No JavaScript, no iframe, no browser extension. It works inside GitHub's sanitized Markdown.

## Add it to your profile

Paste this into your profile README, replacing `YOUR_USERNAME` with your GitHub username:

```html
<a href="https://profile-place.cnrad.workers.dev/u/YOUR_USERNAME/tap">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://profile-place.cnrad.workers.dev/u/YOUR_USERNAME/canvas.svg?theme=dark">
    <img ismap src="https://profile-place.cnrad.workers.dev/u/YOUR_USERNAME/canvas.svg?theme=light" width="846" alt="Shared pixel canvas. Click a square to toggle it.">
  </picture>
</a>
```

That's it. Clicks redirect to `github.com/YOUR_USERNAME`, so the canvas only makes sense on your own profile.

Keep `width="846"` and do not set `height`. Click positions arrive as pixels of the rendered image, and 846px is the profile README width on github.com at desktop sizes. If the image is narrower, clicks land left of where they were aimed.

The hosted instance is free to use and has no uptime promise. If you want control, self-host below.

## How it works

GitHub renders README images through its camo proxy inside an `<img>`, which strips scripts, styles, and pointer events. Two things survive the sanitizer:

- `ismap` on an `<img>` inside an `<a>`. The browser appends the click position to the link as `?x,y`.
- `Cache-Control: no-cache` on the image response. Camo forwards it, so every page view re-fetches.

A click goes to `/tap?x,y`. The server toggles that cell, then redirects back to your profile, which re-fetches the SVG and shows the change. The glow is SMIL animation inside the SVG, which `<img>` does allow.

The click is a direct request to the server, so it can rate-limit by IP and cookie. The default cooldown is one second.

## Self-host on Cloudflare Workers

Each canvas is one Durable Object. Storage persists across deploys. The free plan covers a personal profile comfortably.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cnrad/profile-place)

Or by hand:

```sh
git clone https://github.com/cnrad/profile-place
cd profile-place
bun install
```

Edit `wrangler.toml`:

```toml
PROFILE_URL = "https://github.com/YOUR_USERNAME"   # where clicks redirect
COOLDOWN_MS = "1000"
MULTI_TENANT = "false"                              # "true" to serve /u/<user>/ canvases for anyone
```

Then:

```sh
bunx wrangler login
bun run deploy
```

Your canvas is at `https://profile-place.<your-subdomain>.workers.dev/canvas.svg`. Use the snippet above with your host and without the `/u/YOUR_USERNAME` segment:

```html
<a href="https://YOUR-HOST/tap">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://YOUR-HOST/canvas.svg?theme=dark">
    <img ismap src="https://YOUR-HOST/canvas.svg?theme=light" width="846" alt="Shared pixel canvas. Click a square to toggle it.">
  </picture>
</a>
```

### Multi-tenant mode

With `MULTI_TENANT = "true"`, your instance also serves one canvas per GitHub username at `/u/<user>/canvas.svg` and `/u/<user>/tap`. Clicks redirect to `github.com/<user>`. Anyone can use any name. There is no ownership check, and visitors can already toggle every square by design, so a canvas created under someone else's name is just an empty canvas nobody embeds.

## Self-host with Bun

`src/server.ts` is a plain Bun server with the same logic and a JSON file for state. `Dockerfile` and `fly.toml` are set up for Fly.io:

```sh
fly launch --copy-config --no-deploy
fly volumes create data --size 1
fly deploy
```

Env: `PORT`, `DATA_DIR`, `PROFILE_URL`, `COOLDOWN_MS`, `TRUSTED_IP_HEADER` (the header your proxy sets with the real client IP).

## Develop

```sh
bun install
bun dev            # Bun host at http://localhost:3000/canvas.svg?theme=dark
bun run dev:cf     # Workers host via wrangler at http://localhost:8787
bun test
bun run typecheck
```

Simulate a click:

```sh
curl -i "http://localhost:3000/tap?100,50"
```

## Tuning

`src/config.ts` holds width, cell pitch, square size, rows, capacity, fade steps, and pulse timing. Colors and opacities are constants at the top of `src/render.ts`. Column count derives from width and cell size.

## Layout

- `src/app.ts` request handling shared by both hosts
- `src/worker.ts` Cloudflare Worker and `Canvas` Durable Object, with per-user routing
- `src/server.ts` Bun host with file persistence
- `src/state.ts` marks, fade math, cooldown
- `src/render.ts` SVG output

## License

MIT
