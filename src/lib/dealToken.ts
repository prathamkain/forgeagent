import { createHmac, timingSafeEqual } from "crypto";

const DEAL_TTL_SECONDS = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const s = process.env.DOWNLOAD_TOKEN_SECRET || process.env.PAYPAL_CLIENT_SECRET;
  if (!s) throw new Error("No secret configured for deal tokens");
  return s;
}

export interface SignDealArgs {
  fingerprint: string;
  price: number;
}

export type VerifyDealResult =
  | { ok: true; price: number }
  | { ok: false; reason: string };

export function signDealToken(args: { fingerprint: string; price: number }): string {
  const payload = {
    f: args.fingerprint,
    p: Math.round(args.price * 100) / 100,
    e: Math.floor(Date.now() / 1000) + DEAL_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyDealToken(
  token: string | null | undefined,
  fingerprint: string
): VerifyDealResult {
  if (!token) return { ok: false, reason: "missing deal token" };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed deal token" };
  }
  const [body, sig] = parts;

  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad deal token signature" };
  }

  let payload: { f?: unknown; p?: unknown; e?: unknown };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "unreadable deal token" };
  }

  if (typeof payload.e !== "number" || payload.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "deal token expired" };
  }
  if (payload.f !== fingerprint) {
    return { ok: false, reason: "deal token is for a different artwork" };
  }
  if (typeof payload.p !== "number" || payload.p <= 0 || isNaN(payload.p)) {
    return { ok: false, reason: "invalid price in deal token" };
  }

  return { ok: true, price: payload.p };
}
