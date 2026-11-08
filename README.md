# placefile

A shared pixel canvas for your GitHub README. Visitors click a square to light it up. Each visitor gets their own permanent color. No JavaScript, no iframe.

Try it. Click a square:

<a href="https://placefile.cnrad.workers.dev/r/cnrad/placefile/tap">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://placefile.cnrad.workers.dev/r/cnrad/placefile/canvas.svg?theme=dark">
    <img ismap src="https://placefile.cnrad.workers.dev/r/cnrad/placefile/canvas.svg?theme=light" width="846" alt="Shared pixel canvas. Click a square to toggle it.">
  </picture>
</a>

## Add it to your README

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

If a bot starts griefing your canvas, add a key segment like `/u/YOUR_USERNAME/any-random-string/`. That is a fresh canvas that still redirects to your profile, and you can rotate it whenever you like.

Keep `width="846"` and don't add a `height`.

## Self-host

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cnrad/placefile)

Or:

```sh
git clone https://github.com/cnrad/placefile && cd placefile
bun install
bunx wrangler login && bun run deploy
```

Then use the snippet above with your own Worker URL. Runs on the Cloudflare free plan.

## How it works

GitHub strips scripts and styles from README images, but keeps `ismap` on an `<img>` inside a link. Clicking sends the pixel coordinates to the server as `?x,y`. The server toggles that square, redirects back to the page, and the SVG is re-fetched with `no-cache` so the change shows immediately. The glow is SMIL animation, which `<img>` allows.

Colors come from a hash of the visitor's IP with a random per-canvas salt that never leaves storage. The hash can't be reversed, and the same visitor always gets the same color. IPs are only kept for the 1 second click cooldown.

Each `/u/NAME` and `/r/OWNER/REPO` path is its own canvas with its own Durable Object. Names are case-insensitive.

## Develop

```sh
bun dev           # local Bun server at :3000, single canvas at /canvas.svg and /tap
bun run dev:cf    # the Worker via wrangler at :8787
bun test
```

Grid size, colors, and timing live in `src/config.ts` and the top of `src/render.ts`.

To move a canvas between Workers, set an `ADMIN_TOKEN` secret on both, then `GET .../export` from the old one and `POST` the JSON to `.../import` on the new one with `Authorization: Bearer <token>`.

MIT
