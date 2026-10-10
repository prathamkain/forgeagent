"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";

import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine-dark.css";

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

export interface ProductOrder {
  id: string;
  sessionId: string;
  promptSpec: string;
  previewImageUrl: string | null;
  finalImageUrl: string | null;
  paypalOrderId: string | null;
  status: string;
  price: number;
  createdAt: string;
}

interface ImagePreviewModalData {
  url: string;
  prompt: string;
  id: string;
  price: number;
  status: string;
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickFilterText, setQuickFilterText] = useState("");
  const [selectedPreview, setSelectedPreview] =
    useState<ImagePreviewModalData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const gridRef = useRef<AgGridReact<ProductOrder>>(null);

  // Initial data load effect
  useEffect(() => {
    let isCancelled = false;
    async function loadInitialOrders() {
      try {
        const res = await fetch("/api/orders");
        if (!res.ok) {
          throw new Error(`Failed to fetch orders (${res.status})`);
        }
        const data = await res.json();
        if (!isCancelled) {
          const loadedOrders = Array.isArray(data)
            ? data
            : Array.isArray(data?.orders)
            ? data.orders
            : [];
          setOrders(loadedOrders);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          console.error("Dashboard error fetching orders:", err);
          setError(
            err instanceof Error ? err.message : "Failed to load orders data"
          );
          setIsLoading(false);
        }
      }
    }

    loadInitialOrders();
    return () => {
      isCancelled = true;
    };
  }, []);

  // User-triggered manual refresh
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) {
        throw new Error(`Failed to fetch orders (${res.status})`);
      }
      const data = await res.json();
      const loadedOrders = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
        ? data.orders
        : [];
      setOrders(loadedOrders);
    } catch (err: unknown) {
      console.error("Dashboard error fetching orders:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load orders data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Export grid data to CSV using AG Grid API
  const handleExportCsv = useCallback(() => {
    gridRef.current?.api?.exportDataAsCsv({
      fileName: `seller-analytics-orders-${new Date().toISOString().slice(0, 10)}.csv`,
    });
  }, []);

  // Copy order ID to clipboard with feedback
  const handleCopyId = useCallback((id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // Calculate 3 stats blocks based on fetched data
  // 1. Total Revenue: sum of PAID and DELIVERED orders
  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status === "PAID" || o.status === "DELIVERED")
      .reduce((sum, o) => sum + (Number(o.price) || 0), 0);
  }, [orders]);

  // 2. Total Orders: total count
  const totalOrders = orders.length;

  // 3. Active Deals: count of pending / active deals
  const activeDeals = useMemo(() => {
    return orders.filter(
      (o) => o.status === "PENDING" || o.status === "PROCESSING"
    ).length;
  }, [orders]);

  // AG Grid Column Definitions with custom cell renderers
  const columnDefs = useMemo<ColDef<ProductOrder>[]>(
    () => [
      {
        field: "finalImageUrl",
        headerName: "Preview Image",
        minWidth: 100,
        width: 100,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<ProductOrder>) => {
          const url = params.value || params.data?.previewImageUrl;
          if (url) {
            return (
              <div className="flex h-full w-full items-center justify-center">
                <button
                  type="button"
                  title="Click to zoom preview"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPreview({
                      url,
                      prompt: params.data?.promptSpec || "Untitled Generation",
                      id: params.data?.id || "N/A",
                      price: params.data?.price || 0,
                      status: params.data?.status || "PENDING",
                    });
                  }}
                  className="group relative flex h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-lg border border-neutral-700/80 bg-neutral-900 shadow-md transition-all duration-200 hover:scale-105 hover:border-cyan-400 focus:outline-hidden"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="AI Artwork Preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <svg
                      className="h-4 w-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6"
                      />
                    </svg>
                  </div>
                </button>
              </div>
            );
          }
          // Gray placeholder when image is null
          return (
            <div className="flex h-full w-full items-center justify-center">
              <div
                className="flex h-[50px] w-[50px] flex-col items-center justify-center gap-0.5 rounded-lg border border-neutral-800 bg-neutral-800/80 text-neutral-400 shadow-inner"
                title="No preview image available"
              >
                <svg
                  className="h-4 w-4 text-neutral-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                  />
                </svg>
                <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
                  None
                </span>
              </div>
            </div>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 140,
        width: 150,
        cellRenderer: (params: ICellRendererParams<ProductOrder>) => {
          const status = (params.value || "PENDING").toUpperCase();
          const isPaid = status === "PAID";
          const isDelivered = status === "DELIVERED";
          const isPending = status === "PENDING";

          let badgeStyles = "border-amber-500/30 bg-amber-500/15 text-amber-300";
          let dotStyles = "bg-amber-400";

          if (isPaid) {
            badgeStyles = "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
            dotStyles = "bg-emerald-400";
          } else if (isDelivered) {
            badgeStyles = "border-cyan-500/30 bg-cyan-500/15 text-cyan-300";
            dotStyles = "bg-cyan-400";
          } else if (!isPending) {
            badgeStyles = "border-neutral-500/30 bg-neutral-500/15 text-neutral-300";
            dotStyles = "bg-neutral-400";
          }

          return (
            <div className="flex h-full items-center">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider border shadow-xs ${badgeStyles}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dotStyles} animate-pulse`} />
                {status}
              </span>
            </div>
          );
        },
      },
      {
        field: "price",
        headerName: "Price",
        minWidth: 110,
        width: 120,
        valueFormatter: (params) => {
          return params.value != null
            ? `$${Number(params.value).toFixed(2)}`
            : "$0.00";
        },
        cellRenderer: (params: ICellRendererParams<ProductOrder>) => {
          const formatted =
            params.value != null
              ? `$${Number(params.value).toFixed(2)}`
              : "$0.00";
          return (
            <div className="flex h-full items-center font-mono text-sm font-bold text-emerald-400">
              {formatted}
            </div>
          );
        },
      },
      {
        field: "promptSpec",
        headerName: "Prompt Spec",
        minWidth: 320,
        flex: 2,
        tooltipField: "promptSpec",
        cellRenderer: (params: ICellRendererParams<ProductOrder>) => {
          const prompt = params.value || "";
          return (
            <div className="flex h-full w-full items-center">
              <span
                className="truncate block max-w-full text-xs font-medium text-neutral-300 hover:text-neutral-100 transition-colors cursor-default"
                title={prompt}
              >
                {prompt || (
                  <span className="text-neutral-500 italic">
                    No prompt specification
                  </span>
                )}
              </span>
            </div>
          );
        },
      },
      {
        field: "id",
        headerName: "Order ID",
        minWidth: 200,
        width: 220,
        cellRenderer: (params: ICellRendererParams<ProductOrder>) => {
          const id = params.value || "";
          return (
            <div className="flex h-full items-center gap-2">
              <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-300">
                {id.length > 16 ? `${id.slice(0, 14)}...` : id}
              </span>
              <button
                type="button"
                onClick={() => handleCopyId(id)}
                title="Copy Order ID"
                className="text-neutral-500 hover:text-cyan-400 transition-colors p-1"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375-7.5-7.5"
                  />
                </svg>
              </button>
            </div>
          );
        },
      },
      {
        field: "paypalOrderId",
        headerName: "PayPal Reference",
        minWidth: 180,
        width: 200,
        cellRenderer: (params: ICellRendererParams<ProductOrder>) => {
          if (!params.value) {
            return (
              <span className="text-xs font-mono text-neutral-500">
                Direct / Draft
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 rounded bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 text-xs font-mono text-sky-300">
              <span className="h-1 w-1 rounded-full bg-sky-400" />
              {params.value}
            </span>
          );
        },
      },
      {
        field: "createdAt",
        headerName: "Timestamp",
        minWidth: 170,
        width: 180,
        valueFormatter: (params) => {
          if (!params.value) return "";
          try {
            return new Date(params.value).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            return String(params.value);
          }
        },
        cellClass: "font-mono text-xs text-neutral-400",
      },
      {
        headerName: "Action",
        minWidth: 120,
        width: 120,
        sortable: false,
        filter: false,
        cellRenderer: (params: ICellRendererParams<ProductOrder>) => {
          const url = params.data?.finalImageUrl;
          if (!url) {
            return (
              <span className="text-xs text-neutral-600 italic">Pending</span>
            );
          }
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors group"
            >
              <span>View 4K</span>
              <span className="transition-transform group-hover:translate-x-0.5">
                ↗
              </span>
            </a>
          );
        },
      },
    ],
    [handleCopyId]
  );

  // AG Grid Default Column Configuration
  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="flex h-screen w-full flex-col bg-neutral-950 text-neutral-100 antialiased overflow-hidden selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Copied ID Toast */}
      {copiedId && (
        <div className="fixed top-4 right-6 z-50 rounded-lg border border-cyan-500/30 bg-neutral-900/90 px-3.5 py-1.5 text-xs font-mono text-cyan-300 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          Copied {copiedId.slice(0, 12)}... to clipboard!
        </div>
      )}

      {/* Top Navigation */}
      <header className="flex h-16 w-full shrink-0 items-center justify-between border-b border-neutral-800/80 bg-neutral-950/80 px-6 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors"
          >
            ← Back to Studio
          </Link>
          <div className="h-4 w-px bg-neutral-800" />
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm font-bold tracking-wider uppercase text-neutral-100">
              ForgeAgent
            </h1>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-950/50 px-2 py-0.5 text-[10px] font-mono tracking-widest text-cyan-300 uppercase">
              SELLER ANALYTICS
            </span>
            <span className="hidden sm:inline-flex rounded-md border border-neutral-800 bg-neutral-900/60 px-2 py-0.5 text-[10px] font-mono text-neutral-400 uppercase">
              AG GRID SPONSOR EDITION
            </span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-3">
          {/* Quick Filter Input */}
          <div className="relative hidden sm:block">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search orders..."
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              className="h-8 w-48 lg:w-64 rounded-lg border border-neutral-800 bg-neutral-900/90 pl-8 pr-3 text-xs text-neutral-200 placeholder-neutral-500 focus:border-cyan-500 focus:outline-hidden transition-all"
            />
          </div>

          {/* Export to CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            title="Export grid data to CSV file"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <svg
              className="h-3.5 w-3.5 text-neutral-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.5V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh order database"
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-900/50 transition-colors disabled:opacity-50"
          >
            <svg
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>{isLoading ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-h-0 flex flex-col px-6 py-4 gap-4 overflow-hidden">
        {/* Error Notification */}
        {error && (
          <div className="shrink-0 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/50 px-4 py-2.5 text-xs text-rose-300">
            <span>{error}</span>
            <button
              type="button"
              onClick={handleRefresh}
              className="underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {/* Dashboard Header: 3 Stats Blocks */}
        <section className="shrink-0">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Stat Card 1: Total Revenue */}
            <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-emerald-500/40 hover:shadow-emerald-950/20 group">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
                  Total Revenue
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
                  $
                  {totalRevenue.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-400 border border-emerald-500/30">
                  PAID ORDERS
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                Sum of settled PayPal customer transactions
              </p>
            </div>

            {/* Stat Card 2: Total Orders */}
            <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-indigo-500/40 hover:shadow-indigo-950/20 group">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
                  Total Orders
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 shadow-sm">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 8h12.974c.576 0 1.059.435 1.119.993Z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
                  {totalOrders}
                </span>
                <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-400 border border-indigo-500/30">
                  VOLUME COUNT
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                Lifetime customer artwork checkouts and generations
              </p>
            </div>

            {/* Stat Card 3: Active Deals */}
            <div className="relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-amber-500/40 hover:shadow-amber-950/20 group">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl group-hover:bg-amber-500/20 transition-all" />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-neutral-400">
                  Active Deals
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-sm">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
                  {activeDeals}
                </span>
                <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-400 border border-amber-500/30">
                  PENDING / ACTIVE
                </span>
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                In-pipeline orders pending payment confirmation & delivery
              </p>
            </div>
          </div>
        </section>

        {/* AG Grid Full Container taking remaining screen height */}
        <div
          className="ag-theme-alpine-dark flex-1 w-full min-h-0 rounded-2xl border border-neutral-800/80 shadow-2xl overflow-hidden bg-[#0c0e12]"
          style={{ width: "100%", height: "100%" }}
        >
          <AgGridReact<ProductOrder>
            ref={gridRef}
            rowData={orders}
            columnDefs={columnDefs}
            defaultColDef={defaultColDef}
            loading={isLoading}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            rowHeight={64}
            animateRows={true}
            quickFilterText={quickFilterText}
            tooltipShowDelay={200}
          />
        </div>
      </main>

      {/* Image Preview Lightbox Modal */}
      {selectedPreview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in"
          onClick={() => setSelectedPreview(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3 bg-neutral-950/80">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400">
                  High-Resolution Preview
                </span>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                  Order: {selectedPreview.id}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPreview(null)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="relative aspect-[3/2] w-full bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedPreview.url}
                alt={selectedPreview.prompt}
                className="h-full w-full object-contain"
              />
            </div>

            <div className="p-5 bg-neutral-950/90 border-t border-neutral-800 flex flex-col gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Prompt Specification
                </span>
                <p className="mt-1 text-xs text-neutral-200 leading-relaxed font-sans">
                  {selectedPreview.prompt}
                </p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    ${Number(selectedPreview.price).toFixed(2)}
                  </span>
                  <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-[10px] font-mono uppercase text-neutral-300">
                    {selectedPreview.status}
                  </span>
                </div>
                <a
                  href={selectedPreview.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-cyan-400 transition-colors"
                >
                  Open Original ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
