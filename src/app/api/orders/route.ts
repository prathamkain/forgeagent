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
