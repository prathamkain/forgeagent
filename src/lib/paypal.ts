const PAYPAL_API_BASE = process.env.PAYPAL_API_URL || "https://api-m.sandbox.paypal.com";

function getCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment variables.");
  }

  return { clientId, clientSecret };
}

/**
 * Generate an OAuth 2.0 access token from PayPal sandbox.
 */
export async function generateAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to generate PayPal access token (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Create a PayPal order with intent="CAPTURE" and return the order ID.
 */
export async function createOrder(amount: number, currency: string = "USD"): Promise<string> {
  const accessToken = await generateAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount.toFixed(2),
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create PayPal order (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { id: string; [key: string]: unknown };
  return data.id;
}

/**
 * Capture payment for an approved PayPal order.
 */
export async function captureOrder(orderId: string): Promise<Record<string, unknown>> {
  const accessToken = await generateAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to capture PayPal order (${response.status}): ${errorText}`);
  }

  return response.json();
}
