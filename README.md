# placefile

A global pixel canvas for your READMEs. Visitors click a square to light it up, and each visitor gets their own permanent color.

Try it out:

<a href="https://placefile.cnrad.workers.dev/r/cnrad/placefile/tap">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://placefile.cnrad.workers.dev/r/cnrad/placefile/canvas.svg?theme=dark">
    <img ismap src="https://placefile.cnrad.workers.dev/r/cnrad/placefile/canvas.svg?theme=light" width="846" alt="Shared pixel canvas. Click a square to toggle it.">
  </picture>
</a>

## Add it to your profile

Paste this into your profile README. Replace `YOUR_USERNAME` in all three places.

```html
<a href="https://placefile.cnrad.workers.dev/u/YOUR_USERNAME/tap">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://placefile.cnrad.workers.dev/u/YOUR_USERNAME/canvas.svg?theme=dark">
    <img ismap src="https://placefile.cnrad.workers.dev/u/YOUR_USERNAME/canvas.svg?theme=light" width="846" alt="Shared pixel canvas. Click a square to toggle it.">
  </picture>
</a>
```

For a repository README, use `/r/OWNER/REPO/` instead of `/u/YOUR_USERNAME/`.

Keep `width="846"` and don't add a `height`.

## Self-host

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cnrad/placefile)

Or:

```sh
git clone https://github.com/cnrad/placefile && cd placefile
bun install
# edit PROFILE_URL in wrangler.toml
bunx wrangler login && bun run deploy
```

Then use the snippet above with your Worker URL and no `/u/YOUR_USERNAME` segment. Runs on the Cloudflare free plan.

## How it works

GitHub strips scripts and styles from README images, but keeps `ismap` on an `<img>` inside a link. Clicking sends the pixel coordinates to the server as `?x,y`. The server toggles that square, redirects back to your profile, and the SVG is re-fetched with `no-cache` so the change shows immediately. The glow is SMIL animation, which `<img>` allows.

Colors come from a hash of the visitor's IP with a random per-canvas salt that never leaves storage. The hash can't be reversed, and the same visitor always gets the same color. IPs are only kept for the 1 second click cooldown.

### Moving to a new Worker

Durable Object data stays with the Worker it was created in. To migrate, set an `ADMIN_TOKEN` secret on both deployments, then:

```sh
curl -H "Authorization: Bearer $TOKEN" https://OLD/export > canvas.json
curl -H "Authorization: Bearer $TOKEN" -X POST --data-binary @canvas.json https://NEW/import
```

Append `/u/NAME` or `/r/OWNER/REPO` before `/export` and `/import` for per-user or per-repo canvases.

## Develop

```sh
bun dev           # local Bun server at :3000
bun run dev:cf    # the Worker via wrangler at :8787
bun test
```

Grid size, colors, and timing live in `src/config.ts` and the top of `src/render.ts`.

MIT
