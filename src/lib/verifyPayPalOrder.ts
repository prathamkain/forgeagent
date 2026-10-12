import { generateAccessToken } from "./paypal";

const PAYPAL_API_BASE = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

export interface PayPalVerificationResult {
  completed: boolean;
  paidAmount?: number;
  currency?: string;
}

export async function verifyPayPalOrder(orderId: string): Promise<PayPalVerificationResult> {
  if (!orderId || typeof orderId !== "string") {
    return { completed: false };
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
      return { completed: false };
    }

    const data = (await response.json()) as {
      status?: string;
      purchase_units?: Array<{
        amount?: {
          value?: string;
          currency_code?: string;
        };
      }>;
    };

    const isCompleted = data.status === "COMPLETED";
    const amountVal = parseFloat(data.purchase_units?.[0]?.amount?.value || "0");
    const currency = data.purchase_units?.[0]?.amount?.currency_code || "";

    return {
      completed: isCompleted,
      paidAmount: amountVal,
      currency,
    };
  } catch (err) {
    console.error("[verifyPayPalOrder] error:", err);
    return { completed: false };
  }
}

export async function verifyPayPalOrderCompleted(
  orderId: string,
  expectedAmount?: number
): Promise<boolean> {
  const result = await verifyPayPalOrder(orderId);
  if (!result.completed) return false;

  if (typeof expectedAmount === "number" && expectedAmount > 0) {
    if ((result.paidAmount ?? 0) < expectedAmount - 0.01) {
      return false;
    }
    if (result.currency && result.currency !== "USD") {
      return false;
    }
  }

  return true;
}
