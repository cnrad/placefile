# profile-place

A shared pixel canvas that lives inside a GitHub profile README. Visitors click a square, it lights up in a random color, and the newest 200 marks stay. Older marks fade 10% per new placement and disappear on the 210th.

## How it works

GitHub strips scripts, styles, and pointer events from README images, but two things survive its sanitizer:

- `ismap` on an `<img>` inside an `<a>`. The browser appends the click position to the link as `?x,y`.
- `Cache-Control: no-cache` on the image response. Camo forwards it, so every profile view re-fetches.

So a click navigates to `/tap?x,y`, the server records the mark and 303-redirects back to the profile, and the freshly fetched SVG shows it. Fresh marks pulse with SMIL for 90 seconds. The cooldown is 5 seconds per IP and per cookie; the click is a direct request to this server, so the visitor is not hidden behind camo.

## README snippet

```html
<a href="https://YOUR-HOST/tap">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://YOUR-HOST/canvas.svg?theme=dark">
    <img ismap src="https://YOUR-HOST/canvas.svg?theme=light" width="800" height="424" alt="Shared pixel canvas. Click a square to leave a mark.">
  </picture>
</a>
```

Keep `width="800"`. Click coordinates arrive in rendered CSS pixels, and the server maps them assuming an 800px wide image. On viewports where GitHub shrinks the image, clicks land closer to the top-left than intended.

## Run

```sh
bun install
bun dev            # http://localhost:3000/canvas.svg?theme=dark
bun test
```

Env: `PORT`, `DATA_DIR`, `PROFILE_URL`, `COOLDOWN_MS`, `TRUSTED_IP_HEADER`.

## Deploy (Fly)

```sh
fly launch --copy-config --no-deploy
fly volumes create data --size 1 --region iad
fly deploy
```

State is one small JSON file on the volume. Single machine only; the cooldown map and mark list live in memory.

## Tuning

Everything is in `src/config.ts`: cell size, grid size, capacity, fade steps, glow duration. Palette in `src/palette.ts`.
