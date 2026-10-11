import { createHash, createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const s = process.env.DOWNLOAD_TOKEN_SECRET || process.env.PAYPAL_CLIENT_SECRET;
  if (!s) throw new Error("No secret configured for unlock tokens");
  return s;
}

// Demo unlock stays ON by default (hackathon). Set ALLOW_DEMO_UNLOCK=false to disable.
export function isDemoAllowed(): boolean {
  return process.env.ALLOW_DEMO_UNLOCK !== "false";
}

export function assetFingerprint(prompt: string, seed: number, aspect: string): string {
  return createHash("sha256").update(`${prompt}|${seed}|${aspect}`).digest("hex").slice(0, 32);
}

export function signUnlockToken(args: { orderId: string; fingerprint: string; demo: boolean }): string {
  const payload = {
    o: args.orderId,
    f: args.fingerprint,
    d: args.demo,
    e: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export type VerifyResult =
  | { ok: true; orderId: string; demo: boolean }
  | { ok: false; reason: string };

export function verifyUnlockToken(
  token: string | null | undefined,
  fingerprint: string
): VerifyResult {
  if (!token) return { ok: false, reason: "missing token" };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed token" };
  const [body, sig] = parts;

  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, reason: "bad signature" };

  let payload: { o?: unknown; f?: unknown; d?: unknown; e?: unknown };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "unreadable token" };
  }
  if (typeof payload.e !== "number" || payload.e < Math.floor(Date.now() / 1000))
    return { ok: false, reason: "token expired" };
  if (payload.f !== fingerprint) return { ok: false, reason: "token is for a different artwork" };

  return { ok: true, orderId: String(payload.o ?? ""), demo: Boolean(payload.d) };
}
