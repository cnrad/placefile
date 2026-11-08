/** Request-level checks for /tap. All three are cheap and affect no real browser click. */

/**
 * Collapse an IP to the unit a single customer controls: IPv4 as-is, IPv6 to its /64.
 * ISPs hand out a /64 per subscriber, and so do hosting providers per server.
 */
export function ipKey(ip: string): string {
  if (!ip.includes(":")) return ip;
  const groups = expandIpv6(ip);
  return groups ? groups.slice(0, 4).join(":") + "::/64" : ip;
}

function expandIpv6(ip: string): string[] | null {
  const [head, tail = ""] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  if (left.length + right.length > 8) return null;
  if (!ip.includes("::") && left.length !== 8) return null;
  const mid = Array(8 - left.length - right.length).fill("0");
  return [...left, ...mid, ...right].map((g) => g.toLowerCase().padStart(4, "0"));
}

/**
 * A link click from a page is a user-activated top-level navigation, and every modern
 * browser says so in Sec-Fetch headers. Scripts rarely bother.
 */
export function looksLikeBrowserClick(req: Request): boolean {
  const h = req.headers;
  return (
    h.get("sec-fetch-mode") === "navigate" &&
    h.get("sec-fetch-dest") === "document" &&
    h.get("sec-fetch-user") === "?1" &&
    (h.get("accept") ?? "").includes("text/html")
  );
}

/** Autonomous systems that are hosting providers, not people. Taps from these are ignored. */
export const hostingAsns = new Set<number>([
  24940, // Hetzner
  213230, // Hetzner Cloud
  14061, // DigitalOcean
  16276, // OVH
  16509, // Amazon
  14618, // Amazon
  15169, // Google
  396982, // Google Cloud
  8075, // Microsoft Azure
  63949, // Linode / Akamai
  20473, // Vultr
  60068, // Datacamp / CDN77
  212238, // Datacamp
  9009, // M247
  51167, // Contabo
  197540, // netcup
  24961, // myLoc
  62567, // Digital Ocean (legacy)
  45102, // Alibaba Cloud
  37963, // Alibaba
  132203, // Tencent Cloud
  13335, // Cloudflare (WARP exits, Workers)
  54825, // Packet / Equinix Metal
  46562, // Performive
  199524, // G-Core
  202425, // IP Volume
  49981, // WorldStream
  174, // Cogent (transit, mostly hosting)
]);
