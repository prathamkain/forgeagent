import { generateAccessToken } from "./paypal";

const PAYPAL_API_BASE = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

export async function verifyPayPalOrderCompleted(orderId: string): Promise<boolean> {
  if (!orderId || typeof orderId !== "string") {
    return false;
  }

  try {
    const accessToken = await generateAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return false;
    }

    const data = (await response.json()) as { status?: string };
    return data.status === "COMPLETED";
  } catch (err) {
    console.error("[verifyPayPalOrder] error:", err);
    return false;
  }
}
