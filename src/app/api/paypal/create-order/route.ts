import { NextResponse } from "next/server";
import { createOrder } from "@/lib/paypal";

export async function POST(req: Request) {
  try {
    let amount = 4.99;
    try {
      const body = await req.json();
      if (body && typeof body.amount === "number") {
        amount = body.amount;
      }
    } catch {
      // Body is optional, default to 4.99
    }

    const clientId =
      process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.warn("Missing PayPal credentials in create-order endpoint.");
      return NextResponse.json(
        {
          error:
            "PayPal credentials not configured. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.",
        },
        { status: 500 }
      );
    }

    const orderID = await createOrder(amount);
    return NextResponse.json({ id: orderID });
  } catch (error: unknown) {
    console.error("Error creating PayPal order:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create PayPal order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
