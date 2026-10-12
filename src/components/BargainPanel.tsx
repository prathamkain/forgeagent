"use client";

import React, { useState } from "react";
import { BARGAIN_ENABLED } from "../lib/bargain";

interface BargainPanelProps {
  prompt: string;
  seed: number;
  aspect: string;
  currentPrice: number;
  deal: { price: number; token: string } | null;
  onDealAccepted: (deal: { price: number; token: string }) => void;
  onResetDeal: () => void;
}

export default function BargainPanel({
  prompt,
  seed,
  aspect,
  deal,
  onDealAccepted,
  onResetDeal,
}: BargainPanelProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [offerInput, setOfferInput] = useState<string>("3.49");
  const [round, setRound] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [merchantReply, setMerchantReply] = useState<string>(
    "Standard commercial license is $4.99 USD. What is your offer, creator?"
  );
  const [counterOffer, setCounterOffer] = useState<number | null>(null);

  if (!BARGAIN_ENABLED) {
    return null;
  }

  const handleBargain = async (offeredAmount: number) => {
    if (isNaN(offeredAmount) || offeredAmount <= 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bargain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          seed,
          aspect,
          offer: offeredAmount,
          round,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Negotiation failed");
      }

      setMerchantReply(data.message || "");
      if (data.status === "accepted" && typeof data.dealPrice === "number" && data.dealToken) {
        onDealAccepted({ price: data.dealPrice, token: data.dealToken });
        setCounterOffer(null);
      } else if (data.status === "counter" && typeof data.counterPrice === "number") {
        setCounterOffer(data.counterPrice);
        setRound((r) => r + 1);
      } else {
        setCounterOffer(typeof data.counterPrice === "number" ? data.counterPrice : null);
        setRound((r) => r + 1);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network glitch";
      setMerchantReply(`Transmission glitch: ${msg}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const applyCounter = (price: number) => {
    setOfferInput(price.toFixed(2));
    handleBargain(price);
  };

  return (
    <div className="w-full mb-4">
      {/* Toggle button */}
      <div className="flex items-center justify-between w-full">
        {!deal ? (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1.5 cursor-pointer underline"
          >
            <span>💬 Bargain with Merchant Android</span>
            <span className="text-[10px] text-slate-500 font-normal">
              {isOpen ? "(Close)" : "(Negotiate price)"}
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between w-full p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-xs">
            <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
              <span>✓ Bargain Struck:</span>
              <span className="font-mono">${deal.price.toFixed(2)} USD</span>
              <span className="text-slate-400 font-normal">
                (Saved ${(4.99 - deal.price).toFixed(2)})
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                onResetDeal();
                setCounterOffer(null);
                setRound(1);
                setMerchantReply("Offer reset to standard $4.99 USD.");
              }}
              className="text-[11px] text-slate-400 hover:text-red-400 underline transition cursor-pointer ml-2"
            >
              Reset to $4.99
            </button>
          </div>
        )}
      </div>

      {/* Bargain Drawer */}
      {isOpen && !deal && (
        <div className="mt-3 p-3.5 bg-slate-950/80 border border-indigo-500/20 rounded-xl flex flex-col gap-3 text-xs shadow-inner">
          {/* Merchant Dialog Bubble */}
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center shrink-0 font-bold text-[10px]">
              AI
            </div>
            <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-300 text-xs leading-relaxed">
              <div className="font-semibold text-indigo-400 text-[10px] uppercase tracking-wider mb-0.5">
                ForgeAgent Merchant:
              </div>
              {merchantReply}
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400">Quick Offers:</span>
            {[2.99, 3.49, 3.99].map((p) => (
              <button
                key={p}
                type="button"
                disabled={loading}
                onClick={() => {
                  setOfferInput(p.toFixed(2));
                  handleBargain(p);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600/40 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-mono transition cursor-pointer"
              >
                ${p.toFixed(2)}
              </button>
            ))}
          </div>

          {/* Offer Input and Action */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-slate-500 font-mono text-xs">$</span>
              <input
                type="number"
                step="0.10"
                min="0.50"
                max="4.99"
                value={offerInput}
                onChange={(e) => setOfferInput(e.target.value)}
                placeholder="Your offer (USD)"
                className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              disabled={loading || !offerInput}
              onClick={() => handleBargain(parseFloat(offerInput))}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
            >
              {loading ? "Negotiating…" : "Submit Offer"}
            </button>
          </div>

          {/* Counter offer prompt if available */}
          {counterOffer && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
              <span className="text-slate-300 text-[11px]">
                Accept Merchant&apos;s counter:{" "}
                <span className="font-mono text-indigo-400 font-bold">
                  ${counterOffer.toFixed(2)} USD
                </span>
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => applyCounter(counterOffer)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[11px] transition cursor-pointer"
              >
                Accept ${counterOffer.toFixed(2)}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
