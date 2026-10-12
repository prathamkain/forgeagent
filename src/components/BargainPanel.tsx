"use client";

import React, { useState, useEffect } from "react";
import { BARGAIN_ENABLED, MAX_ROUNDS } from "../lib/bargain";

interface ChatMessage {
  id: string;
  sender: "merchant" | "user";
  text: string;
  counterPrice?: number;
}

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
  const [negotiationToken, setNegotiationToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [latestCounter, setLatestCounter] = useState<number | null>(null);

  const initialGreeting: ChatMessage = {
    id: "init",
    sender: "merchant",
    text: "Price is $4.99 for the 4K master. Make me an offer!",
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);

  // Reset negotiation whenever artwork lock parameters change
  useEffect(() => {
    setRound(1);
    setNegotiationToken(null);
    setLatestCounter(null);
    setErrorMessage("");
    setOfferInput("3.49");
    setMessages([
      {
        id: `init-${seed}`,
        sender: "merchant",
        text: "Price is $4.99 for the 4K master. Make me an offer!",
      },
    ]);
  }, [prompt, seed, aspect]);

  if (!BARGAIN_ENABLED) {
    return null;
  }

  const handleBargain = async (offeredAmount: number) => {
    if (isNaN(offeredAmount) || offeredAmount <= 0) {
      setErrorMessage("Please enter a valid positive dollar amount.");
      return;
    }
    if (offeredAmount > 4.99) {
      setErrorMessage("Offer cannot exceed the base price of $4.99.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    setMessages((prev) => [
      ...prev,
      {
        id: `user-${prev.length + 1}`,
        sender: "user",
        text: `Offer: $${offeredAmount.toFixed(2)} USD`,
      },
    ]);

    try {
      const res = await fetch("/api/bargain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          seed,
          aspect,
          offer: offeredAmount,
          negotiationToken: negotiationToken ?? undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Negotiation failed. Please try again.");
      }

      if (data.decision === "accept" && typeof data.agreedPrice === "number" && data.dealToken) {
        setMessages((prev) => [
          ...prev,
          {
            id: `merchant-${prev.length + 1}`,
            sender: "merchant",
            text: data.message || `Deal agreed at $${data.agreedPrice.toFixed(2)} USD!`,
          },
        ]);
        setLatestCounter(null);
        onDealAccepted({ price: data.agreedPrice, token: data.dealToken });
        setIsOpen(false); // Collapse panel on deal accepted
      } else {
        // Counter or reject_low
        setMessages((prev) => [
          ...prev,
          {
            id: `merchant-${prev.length + 1}`,
            sender: "merchant",
            text: data.message || "I cannot accept that offer.",
            counterPrice: typeof data.counterPrice === "number" ? data.counterPrice : undefined,
          },
        ]);

        if (typeof data.counterPrice === "number") {
          setLatestCounter(data.counterPrice);
        }
        if (data.negotiationToken) {
          setNegotiationToken(data.negotiationToken);
        }
        if (typeof data.round === "number") {
          setRound(data.round + 1);
        } else {
          setRound((r) => r + 1);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network glitch";
      setErrorMessage(`Merchant connection interrupted: ${msg}`);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "merchant",
          text: `Neural connection hiccup: ${msg}. Try again!`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const currentDisplayRound = Math.min(MAX_ROUNDS, round);

  return (
    <div className="w-full mb-3">
      {/* Top action row */}
      <div className="flex items-center justify-between w-full">
        {!deal ? (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-medium transition cursor-pointer"
          >
            <span>🤝 Bargain with ForgeAgent</span>
            <span className="text-[10px] text-indigo-400 font-normal">
              {isOpen ? "▲ (Hide)" : "▼ (Negotiate price)"}
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between w-full p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-xs">
            <span className="text-emerald-300 font-semibold flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                ✓
              </span>
              <span>Deal locked: ${deal.price.toFixed(2)} USD</span>
              <span className="text-slate-400 font-normal text-[11px]">
                (Saved ${(4.99 - deal.price).toFixed(2)})
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                onResetDeal();
                setRound(1);
                setNegotiationToken(null);
                setLatestCounter(null);
                setErrorMessage("");
                setOfferInput("3.49");
                setMessages([
                  {
                    id: "reset-1",
                    sender: "merchant",
                    text: "Price is $4.99 for the 4K master. Make me an offer!",
                  },
                ]);
              }}
              className="text-[11px] text-slate-400 hover:text-red-400 underline transition cursor-pointer ml-2"
            >
              Reset to $4.99
            </button>
          </div>
        )}
      </div>

      {/* Inline Collapsible Panel */}
      {isOpen && !deal && (
        <div className="mt-3 p-3.5 bg-slate-950/90 border border-indigo-500/30 rounded-xl flex flex-col gap-3 text-xs shadow-xl animate-in fade-in duration-200">
          {/* Header indicator */}
          <div className="flex items-center justify-between text-[11px] border-b border-slate-800 pb-2 text-slate-400">
            <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <span>🤖 ForgeAgent Merchant</span>
            </span>
            <span className="font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Round {currentDisplayRound} of {MAX_ROUNDS}
            </span>
          </div>

          {/* Chat bubbles list */}
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 py-1">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${
                  m.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-indigo-600 text-white rounded-br-none"
                      : "bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 border border-slate-800 text-slate-400 rounded-lg px-3 py-2 text-xs flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span>Merchant considering offer…</span>
                </div>
              </div>
            )}
          </div>

          {/* Error notification if any */}
          {errorMessage && (
            <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-500/30 rounded-md px-2.5 py-1.5">
              {errorMessage}
            </div>
          )}

          {/* Quick chips ($3.99, $3.49, $2.99) */}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400">Quick chips:</span>
            {[3.99, 3.49, 2.99].map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={loading}
                onClick={() => {
                  setOfferInput(chip.toFixed(2));
                  handleBargain(chip);
                }}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-indigo-600/40 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-mono transition cursor-pointer disabled:opacity-50"
              >
                ${chip.toFixed(2)}
              </button>
            ))}
          </div>

          {/* Counter offer accept chip if merchant made a counter */}
          {latestCounter && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30">
              <span className="text-slate-300 text-[11px]">
                Accept Merchant counter:{" "}
                <span className="font-mono text-indigo-400 font-bold">
                  ${latestCounter.toFixed(2)} USD
                </span>
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleBargain(latestCounter)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-[11px] transition cursor-pointer disabled:opacity-50"
              >
                Accept ${latestCounter.toFixed(2)}
              </button>
            </div>
          )}

          {/* Input and Send button */}
          <div className="flex items-center gap-2 pt-1">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1.5 text-slate-500 font-mono text-xs">
                $
              </span>
              <input
                type="number"
                step="0.10"
                min="0.50"
                max="4.99"
                value={offerInput}
                onChange={(e) => setOfferInput(e.target.value)}
                placeholder="Offer in USD"
                className="w-full pl-6 pr-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <button
              type="button"
              disabled={loading || !offerInput}
              onClick={() => handleBargain(parseFloat(offerInput))}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
            >
              Send Offer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
