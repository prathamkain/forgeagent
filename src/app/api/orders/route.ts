export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import type { ProductOrder } from "@prisma/client";

export async function GET() {
  try {
    let orders: ProductOrder[] = [];
    try {
      orders = await prisma.productOrder.findMany({
        orderBy: {
          createdAt: "desc",
        },
        include: {
          session: true,
        },
      });
    } catch (dbError) {
      console.warn(
        "Database empty or not yet generated during build/runtime:",
        dbError
      );
      return NextResponse.json({
        orders: [],
        stats: { totalRevenue: 0, totalOrders: 0, activeDeals: 0 },
      });
    }

    // If database is empty or not yet populated
    if (!orders || orders.length === 0) {
      return NextResponse.json({
        orders: [],
        stats: { totalRevenue: 0, totalOrders: 0, activeDeals: 0 },
      });
    }

    return NextResponse.json(orders);
  } catch (error: unknown) {
    console.warn("Unexpected error in /api/orders route:", error);
    return NextResponse.json({
      orders: [],
      stats: { totalRevenue: 0, totalOrders: 0, activeDeals: 0 },
    });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, prompt, amount, status, sessionId } = body;

    const sessionConnectOrCreate = sessionId
      ? {
          connectOrCreate: {
            where: { id: sessionId },
            create: { id: sessionId },
          },
        }
      : {
          create: {},
        };

    try {
      const newOrder = await prisma.productOrder.create({
        data: {
          paypalOrderId: orderId || `SANDBOX-${Date.now()}`,
          status: status || "COMPLETED",
          price: typeof amount === "number" ? amount : 4.99,
          promptSpec: prompt || "Bespoke digital artwork",
          finalImageUrl:
            "https://via.placeholder.com/1024x1024/111111/44FF44?text=Final+4K+Masterpiece",
          session: sessionConnectOrCreate,
        },
      });
      return NextResponse.json({ success: true, order: newOrder });
    } catch (dbErr) {
      console.warn("DB save simulated order fallback:", dbErr);
      return NextResponse.json({ success: true, simulated: true });
    }
  } catch (err) {
    console.warn("Simulated order parse error:", err);
    return NextResponse.json({ success: true, simulated: true });
  }
}
