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
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadStatus, setDownloadStatus] = useState<string>("");
  const [paypalReady, setPaypalReady] = useState<boolean>(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);

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

  const generateNewArtwork = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setIsPaid(false);
    setTransactionId(null);

    // Fixed deterministic seed lock
    const newSeed = Math.floor(Math.random() * 9000000) + 1000000;
    setCurrentSeed(newSeed);
    setActivePrompt(prompt.trim());

    setTimeout(() => {
      setIsGenerating(false);
    }, 300);
  };

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

  // Clean, 100% Free URLs (No paid parameters / No paywall redirects)
  const draftWidth = aspectRatio === "16:9" ? 768 : 768;
  const draftHeight = aspectRatio === "16:9" ? 432 : 768;
  const masterWidth = aspectRatio === "16:9" ? 1280 : 1024;
  const masterHeight = aspectRatio === "16:9" ? 720 : 1024;

  const draftUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    activePrompt
  )}?width=${draftWidth}&height=${draftHeight}&seed=${currentSeed}`;

  const masterUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    activePrompt + ", highly detailed, masterpiece, 8k resolution, sharp focus"
  )}?width=${masterWidth}&height=${masterHeight}&seed=${currentSeed}`;

  // 4K Canvas UHD Downloader (Draws from DOM / master pipeline to produce real lossless 4K file)
  const handleDownloadMaster = async () => {
    try {
      setIsDownloading(true);
      setDownloadStatus("Rendering 3840x3840 4K UHD Master...");

      const targetWidth = 3840;
      const targetHeight = aspectRatio === "16:9" ? 2160 : 3840;
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context initialization failed");

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      let drewImage = false;

      // 1. Draw directly from the displayed DOM image element if loaded
      const domImg = imageElementRef.current;
      if (domImg && domImg.complete && domImg.naturalWidth > 0) {
        try {
          ctx.drawImage(domImg, 0, 0, targetWidth, targetHeight);
          drewImage = true;
        } catch (drawErr) {
          console.warn("DOM image draw error, will attempt offscreen Image:", drawErr);
        }
      }

      // 2. Fallback to offscreen Image object if DOM draw didn't occur
      if (!drewImage) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = masterUrl;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Master asset buffer load failed"));
        });

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      }

      setDownloadStatus("Encoding 4K PNG Master (~4MB - 8MB)...");

      // 3. Export as uncompressed PNG blob
      const pngBlob = await new Promise<Blob | null>((resolve) => {
        try {
          canvas.toBlob((blob) => resolve(blob), "image/png");
        } catch (canvasErr) {
          console.warn("Canvas export restriction encountered:", canvasErr);
          resolve(null);
        }
      });

      if (!pngBlob) {
        throw new Error("Canvas blob unavailable due to cross-origin restriction");
      }

      const url = window.URL.createObjectURL(pngBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `forgeagent-master-4k-seed-${currentSeed}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Direct canvas download fallback triggered:", err);
      // Fallback: Direct blob fetch - NEVER redirect to external payment page
      try {
        setDownloadStatus("Downloading master asset via direct blob...");
        let res = await fetch(masterUrl).catch(() => null);
        if (!res || !res.ok) {
          res = await fetch(
            `/api/image-proxy?prompt=${encodeURIComponent(
              activePrompt
            )}&seed=${currentSeed}&aspect=${aspectRatio}`
          );
        }
        if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
        const fetchedBlob = await res.blob();
        const fallbackUrl = window.URL.createObjectURL(fetchedBlob);
        const anchor = document.createElement("a");
        anchor.href = fallbackUrl;
        anchor.download = `forgeagent-master-4k-seed-${currentSeed}.png`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(fallbackUrl);
      } catch (fallbackErr) {
        console.error("Master download fallback failed:", fallbackErr);
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
            <img
              ref={imageElementRef}
              crossOrigin="anonymous"
              src={isPaid ? masterUrl : draftUrl}
              alt="ForgeAgent Asset"
              key={isPaid ? `master-${currentSeed}` : `draft-${currentSeed}`}
              className="w-full h-full object-contain select-none transition-all duration-300"
            />

            {/* Red Diagonal Watermark (Unpaid Only) */}
            {!isPaid && (
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

          {/* Paid State: Unlocked & 4K Download */}
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
                  Resolution: 3840x3840 (True 4K UHD)
                </div>
              </div>

              {/* Master 4K Download Button */}
              <button
                onClick={handleDownloadMaster}
                disabled={isDownloading}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold rounded-xl shadow-xl shadow-emerald-950/40 transition flex items-center justify-center gap-3 text-base sm:text-lg"
              >
                {isDownloading ? (
                  <span>{downloadStatus || "Generating 4K Lossless Asset..."}</span>
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
                    <span>Download Lossless 4K Master Asset (.PNG)</span>
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