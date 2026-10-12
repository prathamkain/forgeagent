import { generateAccessToken } from "./paypal";

const PAYPAL_API_BASE = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

export async function verifyPayPalOrderCompleted(
  orderId: string,
  expectedAmount?: number
): Promise<boolean> {
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

    const data = (await response.json()) as {
      status?: string;
      purchase_units?: Array<{ amount?: { value?: string } }>;
    };

    if (data.status !== "COMPLETED") {
      return false;
    }

    if (typeof expectedAmount === "number" && expectedAmount > 0) {
      const paidVal = parseFloat(data.purchase_units?.[0]?.amount?.value || "0");
      if (paidVal < expectedAmount - 0.01) {
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error("[verifyPayPalOrder] error:", err);
    return false;
  }
}
