import { createHmac, timingSafeEqual } from "crypto";

const DEAL_TTL_SECONDS = 15 * 60; // 15 minutes

function getSecret(): string {
  const s = process.env.DOWNLOAD_TOKEN_SECRET || process.env.PAYPAL_CLIENT_SECRET;
  if (!s) throw new Error("No secret configured for deal tokens");
  return s;
}

export interface NegotiationPayload {
  kind: "negotiation";
  round: number;
  f: string; // fingerprint
  e: number; // exp
}

export interface DealPayload {
  kind: "deal";
  p: number; // price
  f: string; // fingerprint
  e: number; // exp
}

export type VerifyNegotiationResult =
  | { ok: true; round: number }
  | { ok: false; reason: string };

export type VerifyDealResult =
  | { ok: true; price: number }
  | { ok: false; reason: string };

function signTokenBody(bodyObj: object): string {
  const body = Buffer.from(JSON.stringify(bodyObj)).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyAndExtractBody(
  token: string | null | undefined,
  expectedKind: "negotiation" | "deal",
  fingerprint: string
): { ok: true; payload: Record<string, unknown> } | { ok: false; reason: string } {
  if (!token) return { ok: false, reason: "missing token" };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed token" };
  }
  const [body, sig] = parts;

  const expected = createHmac("sha256", getSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad token signature" };
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "unreadable token" };
  }

  if (payload.kind !== expectedKind) {
    return { ok: false, reason: `token is not of kind ${expectedKind}` };
  }

  if (typeof payload.e !== "number" || payload.e < Math.floor(Date.now() / 1000)) {
    return { ok: false, reason: "token expired" };
  }

  if (payload.f !== fingerprint) {
    return { ok: false, reason: "token is for a different artwork" };
  }

  return { ok: true, payload };
}

export function signNegotiationToken(args: { fingerprint: string; round: number }): string {
  const payload: NegotiationPayload = {
    kind: "negotiation",
    round: args.round,
    f: args.fingerprint,
    e: Math.floor(Date.now() / 1000) + DEAL_TTL_SECONDS,
  };
  return signTokenBody(payload);
}

export function verifyNegotiationToken(
  token: string | null | undefined,
  fingerprint: string
): VerifyNegotiationResult {
  const res = verifyAndExtractBody(token, "negotiation", fingerprint);
  if (!res.ok) return res;
  const round = typeof res.payload.round === "number" ? res.payload.round : 1;
  return { ok: true, round };
}

export function signDealToken(args: { fingerprint: string; price: number }): string {
  const payload: DealPayload = {
    kind: "deal",
    p: Math.round(args.price * 100) / 100,
    f: args.fingerprint,
    e: Math.floor(Date.now() / 1000) + DEAL_TTL_SECONDS,
  };
  return signTokenBody(payload);
}

export function verifyDealToken(
  token: string | null | undefined,
  fingerprint: string
): VerifyDealResult {
  const res = verifyAndExtractBody(token, "deal", fingerprint);
  if (!res.ok) return res;
  const price = typeof res.payload.p === "number" ? res.payload.p : NaN;
  if (isNaN(price) || price <= 0) {
    return { ok: false, reason: "invalid price in deal token" };
  }
  return { ok: true, price };
}
