"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";

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

export default function ForgeAgentMerchant() {
  const [prompt, setPrompt] = useState<string>(
    "Cyberpunk neon street merchant android, cinematic volumetric lighting, 8k render"
  );
  const [activePrompt, setActivePrompt] = useState<string>(
    "Cyberpunk neon street merchant android, cinematic volumetric lighting, 8k render"
  );
  const [currentSeed, setCurrentSeed] = useState<number>(7439769);
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9">("1:1");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [paypalReady, setPaypalReady] = useState<boolean>(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

  // Quality Booster String
  const QUALITY_BOOSTER =
    "8k resolution, highly detailed, sharp focus, cinematic volumetric lighting, photorealistic, octane render, masterpiece, intricate details";

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

  const generateNewArtwork = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    setIsPaid(false);
    setTransactionId(null);

    // Fixed deterministic seed lock
    const newSeed = Math.floor(Math.random() * 9000000) + 1000000;
    setCurrentSeed(newSeed);
    setActivePrompt(prompt.trim());

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          seed: newSeed,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Generation failed: ${response.status}`);
      }

      const imageBlob = await response.blob();
      const newObjectUrl = window.URL.createObjectURL(imageBlob);

      setImageUrl((prev) => {
        if (prev && prev.startsWith("blob:")) {
          window.URL.revokeObjectURL(prev);
        }
        return newObjectUrl;
      });
    } catch (err) {
      console.error("Artwork generation failed:", err);
      // Graceful preview fallback if upstream token unconfigured or offline
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
        `${prompt.trim()}, ${QUALITY_BOOSTER}`
      )}?width=1024&height=1024&seed=${newSeed}`;
      setImageUrl(fallbackUrl);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate initial artwork on mount
  useEffect(() => {
    generateNewArtwork();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PayPal Smart Buttons setup
  useEffect(() => {
    if (isPaid || !paypalContainerRef.current || isGenerating || !paypalReady) return;

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
                    value: "4.99",
                  },
                },
              ],
            });
          },
          onApprove: async (_data, actions) => {
            const details = await actions.order.capture();
            setTransactionId(details.id || `TXN-${Date.now()}`);
            setIsPaid(true);
          },
          onError: (err) => {
            console.error("PayPal Error:", err);
          },
        })
        .render(paypalContainerRef.current);
    }
  }, [paypalReady, currentSeed, isPaid, isGenerating]);

  // Master asset downloader calling /api/download-master?prompt={prompt}&seed={seed}
  const handleDownloadMaster = async () => {
    try {
      setIsDownloading(true);
      setDownloadStatus("Fetching master commercial asset from pipeline...");

      const downloadUrl = `/api/download-master?prompt=${encodeURIComponent(
        activePrompt
      )}&seed=${currentSeed}`;

      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error(`Master download failed: ${res.status}`);
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = `forgeagent-master-seed-${currentSeed}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.warn("Direct /api/download-master error, fallback initiated:", err);
      try {
        setDownloadStatus("Downloading via fallback pipeline...");
        const fallbackUrl = `/api/image-proxy?prompt=${encodeURIComponent(
          activePrompt
        )}&seed=${currentSeed}&aspect=${aspectRatio}`;
        const fallbackRes = await fetch(fallbackUrl);
        if (!fallbackRes.ok) throw new Error("Fallback failed");
        const fallbackBlob = await fallbackRes.blob();
        const fallbackBlobUrl = window.URL.createObjectURL(fallbackBlob);
        const anchor = document.createElement("a");
        anchor.href = fallbackBlobUrl;
        anchor.download = `forgeagent-master-seed-${currentSeed}.jpg`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(fallbackBlobUrl);
      } catch (fallbackErr) {
        console.error("Master download completely failed:", fallbackErr);
      }
    } finally {
      setIsDownloading(false);
      setDownloadStatus("");
    }
  };

  return (
    <>
      <Script
        src="https://www.paypal.com/sdk/js?client-id=sb&currency=USD&components=buttons"
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
                onClick={generateNewArtwork}
                disabled={isGenerating || !prompt.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition shrink-0"
              >
                {isGenerating ? "Forging..." : "Generate Concept"}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span>Aspect:</span>
                <button
                  type="button"
                  onClick={() => setAspectRatio("1:1")}
                  className={`px-2 py-0.5 rounded ${aspectRatio === "1:1"
                    ? "bg-slate-700 text-white font-medium"
                    : "hover:text-white"
                    }`}
                >
                  1:1
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio("16:9")}
                  className={`px-2 py-0.5 rounded ${aspectRatio === "16:9"
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
          <div className="relative w-full aspect-square max-w-2xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex items-center justify-center">
            {/* Native Image Display */}
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-semibold tracking-wide uppercase text-indigo-400">
                  Forging Autonomous Asset...
                </span>
              </div>
            ) : imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                ref={imageElementRef}
                crossOrigin="anonymous"
                src={imageUrl}
                alt="ForgeAgent Asset"
                key={`asset-${currentSeed}-${isPaid ? "paid" : "unpaid"}`}
                className="w-full h-full object-contain select-none transition-all duration-300"
              />
            ) : (
              <div className="text-slate-500 text-sm">No artwork generated</div>
            )}

            {/* Red Diagonal Watermark (Unpaid Only) */}
            {!isPaid && imageUrl && !isGenerating && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
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
                  Resolution: 1024x1024 Master Asset
                </div>
              </div>

              {/* Master Download Button */}
              <button
                onClick={handleDownloadMaster}
                disabled={isDownloading}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-xl shadow-emerald-950/40 transition flex items-center justify-center gap-3 text-base sm:text-lg"
              >
                {isDownloading ? (
                  <span>{downloadStatus || "Downloading Master Asset..."}</span>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    <span>Download Commercial Master Asset (.JPG)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Unpaid State: PayPal Box */}
          {!isPaid && (
            <div className="max-w-2xl w-full mt-6 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col items-center">
              <div className="flex items-center justify-between w-full mb-4">
                <span className="text-sm font-semibold text-slate-300">
                  Full Commercial License & Master Asset
                </span>
                <span className="text-lg font-bold text-emerald-400">$4.99 USD</span>
              </div>

              <div
                ref={paypalContainerRef}
                className={`w-full min-h-[150px] ${!paypalReady ? "flex items-center justify-center" : ""}`}
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
                onClick={() => {
                  setTransactionId(`SANDBOX-TEST-${Date.now()}`);
                  setIsPaid(true);
                }}
                className="mt-3 text-xs text-slate-400 hover:text-slate-200 underline transition"
              >
                [Hackathon Demo]: Instant Unlock Without PayPal Sandbox Login
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}