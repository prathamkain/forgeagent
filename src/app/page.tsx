"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import Script from "next/script";
import {
  ASPECTS,
  AspectKey,
  buildImageCandidates,
  randomSeed,
  sanitizePrompt,
} from "../lib/forgeImage";
import BargainPanel from "../components/BargainPanel";
import { BARGAIN_ENABLED } from "../lib/bargain";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: Record<string, string>;
        createOrder: (
          data: unknown,
          actions: {
            order: {
              create: (details: {
                purchase_units: Array<{
                  description: string;
                  amount: { currency_code: string; value: string };
                }>;
              }) => Promise<string>;
            };
          }
        ) => Promise<string>;
        onApprove: (
          data: unknown,
          actions: {
            order: {
              capture: () => Promise<{ id: string; status: string }>;
            };
          }
        ) => Promise<void>;
        onError?: (err: unknown) => void;
      }) => {
        render: (element: HTMLElement) => Promise<void>;
      };
    };
  }
}

const DEFAULT_PROMPT =
  "Cyberpunk neon street merchant android, cinematic volumetric lighting, 8k render";

export default function ForgeAgentMerchant() {
  const [prompt, setPrompt] = useState<string>(DEFAULT_PROMPT);
  const [selectedAspect, setSelectedAspect] = useState<AspectKey>("1:1");

  // Locked parameters (seeded upon submit)
  const [lockedPrompt, setLockedPrompt] = useState<string>(
    sanitizePrompt(DEFAULT_PROMPT)
  );
  const [currentSeed, setCurrentSeed] = useState<number>(7439769);
  const [lockedAspect, setLockedAspect] = useState<AspectKey>("1:1");

  // Flow and UI states
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "loading"
  );
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string>("");
  const [runId, setRunId] = useState<number>(1);

  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState<string | null>(null);
  const [unlockError, setUnlockError] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [downloadError, setDownloadError] = useState<string>("");
  const [deal, setDeal] = useState<{ price: number; token: string } | null>(null);
  const [paypalReady, setPaypalReady] = useState<boolean>(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);

  const lockedPromptRef = useRef(lockedPrompt);
  lockedPromptRef.current = lockedPrompt;
  const currentSeedRef = useRef(currentSeed);
  currentSeedRef.current = currentSeed;
  const lockedAspectRef = useRef(lockedAspect);
  lockedAspectRef.current = lockedAspect;
  const dealRef = useRef(deal);
  dealRef.current = deal;

  const activePrice = deal ? deal.price : 4.99;

  const unlockAsset = async (orderId: string) => {
    setUnlockError("");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          prompt: lockedPromptRef.current,
          seed: currentSeedRef.current,
          aspect: lockedAspectRef.current,
          dealToken: dealRef.current?.token,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.token) throw new Error(data.error || "Unlock failed");
      setUnlockToken(data.token);
      setTransactionId(orderId);
      setIsPaid(true); // ONLY set paid after the server confirmed
    } catch (err) {
      console.error(err);
      setUnlockError("Payment could not be verified. Please try again.");
    }
  };

  // Check when window.paypal is loaded and ready
  useEffect(() => {
    if (typeof window !== "undefined" && window.paypal) {
      setPaypalReady(true);
      return;
    }

    const interval = setInterval(() => {
      if (typeof window !== "undefined" && window.paypal) {
        setPaypalReady(true);
        clearInterval(interval);
      }
    }, 300);

    return () => clearInterval(interval);
  }, []);

  // Candidate generation URLs
  const candidates = useMemo(
    () =>
      currentSeed === null || !lockedPrompt
        ? []
        : buildImageCandidates(lockedPrompt, currentSeed, lockedAspect),
    [currentSeed, lockedPrompt, lockedAspect]
  );

  // Preview loader effect
  useEffect(() => {
    if (!candidates.length) return;
    let cancelled = false;
    let bestEffort: string | null = null;
    setStatus("loading");
    setDisplaySrc(null);

    const tryLoad = (i: number) => {
      if (cancelled) return;
      if (i >= candidates.length) {
        if (bestEffort) {
          setDisplaySrc(bestEffort);
          setStatus("ready");
          setStatusNote("");
        } else {
          setStatus("error");
          setStatusNote("Render nodes are busy. Please retry.");
        }
        return;
      }
      setStatusNote(
        i === 0
          ? "Forging your artwork…"
          : `Switching render node (${i + 1}/${candidates.length})…`
      );
      const img = new window.Image();
      let settled = false;
      const next = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        tryLoad(i + 1);
      };
      const timer = setTimeout(next, 100_000);
      img.onload = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (cancelled) return;
        if (Math.max(img.naturalWidth, img.naturalHeight) < 768) {
          bestEffort = bestEffort ?? candidates[i].url;
          tryLoad(i + 1);
          return;
        }
        setDisplaySrc(candidates[i].url);
        setStatus("ready");
        setStatusNote("");
      };
      img.onerror = next;
      img.referrerPolicy = "no-referrer";
      img.src = candidates[i].url;
    };

    tryLoad(0);
    return () => {
      cancelled = true;
    };
  }, [candidates, runId]);

  // Seed lock: on prompt submit ONLY
  const handleGenerate = () => {
    if (!prompt.trim() || status === "loading") return;
    const newSeed = randomSeed();
    setCurrentSeed(newSeed);
    setLockedPrompt(sanitizePrompt(prompt));
    setLockedAspect(selectedAspect);
    setIsPaid(false);
    setTransactionId(null);
    setUnlockToken(null);
    setUnlockError("");
    setDeal(null);
    setDownloadError("");
    setRunId((n) => n + 1);
  };

  // PayPal Smart Buttons setup (runs when ready & unpaid)
  useEffect(() => {
    if (isPaid || !paypalContainerRef.current || status !== "ready" || !paypalReady)
      return;

    if (window.paypal) {
      paypalContainerRef.current.innerHTML = "";
      window.paypal
        .Buttons({
          style: {
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
          },
          createOrder: (_data, actions) => {
            return actions.order.create({
              purchase_units: [
                {
                  description: `ForgeAgent 4K Commercial Master Asset (Seed #${currentSeed})`,
                  amount: {
                    currency_code: "USD",
                    value: activePrice.toFixed(2),
                  },
                },
              ],
            });
          },
          onApprove: async (_data, actions) => {
            const details = await actions.order.capture();
            await unlockAsset(details.id);
          },
          onError: (err) => {
            console.error("PayPal Error:", err);
          },
        })
        .render(paypalContainerRef.current);
    }
  }, [paypalReady, currentSeed, lockedPrompt, lockedAspect, activePrice, isPaid, status]);

  // Master asset downloader calling /api/download-master
  const handleDownloadMaster = async () => {
    try {
      setIsDownloading(true);
      setDownloadStatus("Preparing master file…");
      setDownloadError("");

      const query = new URLSearchParams({
        prompt: lockedPrompt,
        seed: String(currentSeed),
        aspect: lockedAspect,
      }).toString();

      const res = await fetch(`/api/download-master?${query}`, {
        headers: { "x-unlock-token": unlockToken ?? "" },
      });
      if (!res.ok) {
        if (res.status === 402 || res.status === 403) {
          throw new Error("Please unlock again");
        }
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(
          errorJson.error || errorJson.detail || `Server error: ${res.status}`
        );
      }

      const contentType = res.headers.get("content-type") ?? "";
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
        ? "webp"
        : "jpg";

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `forgeagent-master-4k-${currentSeed}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("Master download error:", err);
      setDownloadError(err.message || "Download failed. Please retry.");
    } finally {
      setIsDownloading(false);
      setDownloadStatus("");
    }
  };

  return (
    <>
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&components=buttons`}
        strategy="afterInteractive"
        onLoad={() => setPaypalReady(true)}
      />

      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center py-10 px-4 sm:px-6">
        {/* Header */}
        <header className="max-w-4xl w-full text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-3">
            AUTONOMOUS CREATIVE MERCHANT
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Forge<span className="text-indigo-500">Agent</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm sm:text-base">
            Draft low-res concept models with locked seeds. Settle via PayPal to
            instantly unlock and download commercial unwatermarked 4K UHD master files.
          </p>
        </header>

        {/* Input Bar */}
        <div className="max-w-2xl w-full bg-slate-900/80 border border-slate-800 rounded-xl p-4 sm:p-5 mb-8 shadow-2xl">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              CREATIVE PROMPT
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter creative prompt..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                onClick={handleGenerate}
                disabled={status === "loading" || !prompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shrink-0"
              >
                {status === "loading" ? "Forging..." : "Generate Concept"}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Aspect:</span>
                <button
                  type="button"
                  onClick={() => setSelectedAspect("1:1")}
                  className={`px-2 py-0.5 rounded ${
                    selectedAspect === "1:1"
                      ? "bg-slate-700 text-white font-medium"
                      : "hover:text-white"
                  }`}
                >
                  1:1
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAspect("16:9")}
                  className={`px-2 py-0.5 rounded ${
                    selectedAspect === "16:9"
                      ? "bg-slate-700 text-white font-medium"
                      : "hover:text-white"
                  }`}
                >
                  16:9
                </button>
              </div>
              <div>
                Locked Seed:{" "}
                <span className="font-mono text-indigo-400 font-semibold">
                  {currentSeed}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Artwork Canvas Frame */}
        <div className="max-w-2xl w-full flex flex-col items-center">
          <div
            className="relative w-full max-w-2xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex items-center justify-center"
            style={{ aspectRatio: ASPECTS[lockedAspect].css }}
          >
            {status === "loading" && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3 z-10">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold tracking-wide uppercase text-indigo-400">
                  {statusNote || "Forging your artwork…"}
                </span>
              </div>
            )}

            {status === "error" && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3 z-10 p-4 text-center">
                <span className="text-sm text-red-400 font-medium">
                  {statusNote || "Render nodes are busy. Please retry."}
                </span>
                <button
                  onClick={() => setRunId((n) => n + 1)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Retry Render
                </button>
              </div>
            )}

            {displaySrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displaySrc}
                alt="ForgeAgent Asset"
                className="absolute inset-0 h-full w-full object-cover select-none"
                draggable={false}
                referrerPolicy="no-referrer"
                onContextMenu={!isPaid ? (e) => e.preventDefault() : undefined}
              />
            )}

            {/* Red Diagonal Watermark (Unpaid Only) */}
            {!isPaid && displaySrc && status === "ready" && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center z-10">
                <div className="absolute inset-0 bg-repeat [background-image:repeating-linear-gradient(45deg,rgba(0,0,0,0.15)_0,rgba(0,0,0,0.15)_20px,transparent_20px,transparent_40px)]" />
                <div className="rotate-[-25deg] bg-red-600/90 text-white font-black tracking-widest text-sm sm:text-base uppercase py-3 px-16 shadow-2xl border-y-2 border-white/30 text-center select-none backdrop-blur-xs">
                  FORGEAGENT WATERMARKED PREVIEW
                  <div className="text-[10px] font-mono tracking-normal font-normal text-red-200">
                    PayPal Sandbox Settlement Required To Unlock Master
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Paid State: Unlocked & Master Download */}
          {isPaid && (
            <div className="w-full mt-6 flex flex-col items-center gap-4">
              <div className="w-full bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-lg">
                    ✓
                  </div>
                  <div>
                    <div className="text-emerald-300 font-semibold text-sm">
                      Commercial Master Asset Unlocked
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Transaction ID: {transactionId} • Seed: {currentSeed}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold rounded-full border border-emerald-500/30">
                  Resolution: {ASPECTS[lockedAspect].width}x{ASPECTS[lockedAspect].height} Master Asset
                </div>
              </div>

              {/* Master Download Button */}
              <button
                onClick={handleDownloadMaster}
                disabled={isDownloading}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-xl shadow-emerald-950/40 transition flex items-center justify-center gap-3 text-base sm:text-lg"
              >
                {isDownloading ? (
                  <span>{downloadStatus || "Preparing master file…"}</span>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>Download Commercial Master Asset</span>
                  </>
                )}
              </button>
              <div className="text-xs text-slate-400 text-center">
                {lockedAspect === "1:1"
                  ? "4K master: 4096×4096 PNG"
                  : "4K master: 3840×2160 PNG"}
              </div>
              {downloadError && (
                <div className="text-xs text-red-400 font-medium text-center">
                  {downloadError}
                </div>
              )}
            </div>
          )}

          {/* Unpaid State: PayPal Box */}
          {status === "ready" && !isPaid && (
            <div className="max-w-2xl w-full mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-4">
                <span className="text-sm font-semibold text-slate-300">
                  Full Commercial License & Master Asset
                </span>
                <span className="text-lg font-bold text-emerald-400">
                  {deal ? (
                    <span className="flex items-center gap-2">
                      <span className="line-through text-slate-500 text-sm font-normal">$4.99</span>
                      <span>${activePrice.toFixed(2)} USD</span>
                    </span>
                  ) : (
                    <span>$4.99 USD</span>
                  )}
                </span>
              </div>

              {BARGAIN_ENABLED && (
                <div className="w-full mb-4">
                  <BargainPanel
                    prompt={lockedPrompt}
                    seed={currentSeed}
                    aspect={lockedAspect}
                    currentPrice={activePrice}
                    deal={deal}
                    onDealAccepted={(d) => setDeal(d)}
                    onResetDeal={() => setDeal(null)}
                  />
                </div>
              )}

              <div
                ref={paypalContainerRef}
                className={`w-full min-h-[150px] ${
                  !paypalReady ? "flex items-center justify-center" : ""
                }`}
              >
                {!paypalReady && (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                    <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium tracking-wide">
                      Loading PayPal Gateway...
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={() => unlockAsset("DEMO-" + Date.now())}
                className="mt-3 text-xs text-slate-400 hover:text-slate-200 underline transition cursor-pointer"
              >
                [Hackathon Demo]: Instant Unlock Without PayPal Sandbox Login
              </button>
              {unlockError && (
                <div className="mt-2 text-xs text-red-400 font-medium text-center">
                  {unlockError}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}