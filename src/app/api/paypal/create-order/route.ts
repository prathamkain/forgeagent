import { NextResponse } from "next/server";
import { createOrder } from "@/lib/paypal";

export async function POST() {
  try {
    const orderID = await createOrder(4.99);
    return NextResponse.json({ id: orderID });
  } catch (error: unknown) {
    console.error("Error creating PayPal order:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create PayPal order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
