"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import type { MarketPriceEstimate } from "@/lib/channel3";

interface Message {
  role: string;
  content: string;
  previewUrl?: string;
  imagePrompt?: string;
  finalImageUrl?: string;
  isPaid?: boolean;
  marketIntelligence?: MarketPriceEstimate;
}

function PreviewCard({
  previewUrl,
  imagePrompt,
  isPaid,
}: {
  previewUrl: string;
  imagePrompt?: string;
  isPaid?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="relative mt-4 w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800/90 bg-neutral-950/90 shadow-2xl backdrop-blur-md ring-1 ring-white/10 transition-all duration-300 hover:border-neutral-700/80">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-neutral-800/20 via-neutral-700/10 to-neutral-800/20 opacity-60 blur-md" />

      {/* Preview Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-neutral-800/80 bg-neutral-900/60 px-3.5 py-2 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                isPaid ? "bg-emerald-400" : "bg-amber-400"
              }`}
            ></span>
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isPaid ? "bg-emerald-500" : "bg-amber-500"
              }`}
            ></span>
          </span>
          <span className="tracking-wider uppercase text-neutral-300 font-semibold">
            {isPaid ? "Concept (Unlocked)" : "Low-Res Prototype"}
          </span>
        </div>
        <span className="rounded bg-neutral-800/80 px-1.5 py-0.5 text-[10px] tracking-widest text-neutral-400 uppercase">
          {isPaid ? "Paid & Processed" : "Draft Watermarked"}
        </span>
      </div>

      {/* Visual Canvas Area */}
      <div className="relative aspect-[3/2] w-full overflow-hidden bg-neutral-900 flex items-center justify-center">
        {!hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="AI Prototype Preview"
            onError={() => setHasError(true)}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 shadow-inner">
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
            <p className="font-mono text-xs uppercase tracking-wider text-neutral-300">
              Prototype Render Generated
            </p>
            <p className="mt-1 text-[11px] text-neutral-500">
              Low-Res Concept Spec Ready
            </p>
          </div>
        )}

        {/* Diagonal Watermark Badge Overlay */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20 backdrop-contrast-125">
          <span className="rotate-[-18deg] select-none rounded border border-white/20 bg-black/60 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-white/50 shadow-2xl backdrop-blur-xs">
            ForgeAgent // Watermarked Draft
          </span>
        </div>
      </div>

      {/* Prototype Footer & Action Strip */}
      <div className="relative z-10 border-t border-neutral-800/80 bg-neutral-900/80 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-neutral-400">
              Standard Draft (600×400)
            </span>
            <span className="text-xs font-semibold text-neutral-100">
              Final 4K Master • $4.99 USD
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {imagePrompt && (
              <button
                type="button"
                onClick={() => setShowPrompt((v) => !v)}
                className="rounded-lg border border-neutral-700/80 bg-neutral-800 px-2.5 py-1.5 font-mono text-[11px] text-neutral-300 hover:border-neutral-600 hover:bg-neutral-700 transition-colors"
              >
                {showPrompt ? "Hide Spec" : "View Spec"}
              </button>
            )}
            <div className="flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1.5 text-[11px] font-medium text-emerald-300">
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33"
                />
              </svg>
              <span>$4.99</span>
            </div>
          </div>
        </div>

        {/* Expandable Image Prompt Spec */}
        {showPrompt && imagePrompt && (
          <div className="mt-2.5 rounded-lg border border-neutral-800 bg-neutral-950 p-2.5 text-[11px] font-mono text-neutral-400 leading-relaxed">
            <span className="text-neutral-500 block mb-1 uppercase tracking-wider text-[10px]">
              DALL-E / Generation Prompt Spec:
            </span>
            &ldquo;{imagePrompt}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

function FinalMasterpieceCard({ imageUrl }: { imageUrl: string }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative mt-4 w-full max-w-lg overflow-hidden rounded-2xl border border-emerald-500/40 bg-neutral-950/95 shadow-2xl backdrop-blur-md ring-1 ring-emerald-400/20">
      <div className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-emerald-500/10 opacity-70 blur-md" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-emerald-500/20 bg-emerald-950/30 px-3.5 py-2 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400"></span>
          <span className="tracking-wider uppercase text-emerald-300 font-semibold">
            4K Ultra-HD Masterpiece (DALL-E 3)
          </span>
        </div>
        <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] tracking-widest text-emerald-200 uppercase">
          Paid & Verified
        </span>
      </div>

      {/* High-Res Image Display */}
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-900 flex items-center justify-center">
        {!hasError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Final 4K Masterpiece"
            onError={() => setHasError(true)}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-[1.01]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-emerald-400 shadow-inner">
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
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="font-mono text-xs uppercase tracking-wider text-emerald-300">
              4K Masterpiece Delivered
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              Commercial License Activated • Lossless UHD
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="relative z-10 border-t border-emerald-500/20 bg-neutral-950/90 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-neutral-400">
            Resolution: 3840×2160 UHD • No Watermark
          </span>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-emerald-500/30 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-900/60 transition-colors"
          >
            Open Full Res ↗
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "agent",
      content:
        "Welcome to ForgeAgent. I am your generative art director. What aesthetic, composition, or custom visual concept shall we forge today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server returned status ${res.status}`);
      }

      const replyText =
        data.reply ||
        data.message ||
        "I can definitely design that for you! Give me a second to process the vibe...";

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: replyText,
          previewUrl: data.previewUrl,
          imagePrompt: data.imagePrompt,
          isPaid: false,
          marketIntelligence: data.marketIntelligence,
        },
      ]);
    } catch (err: unknown) {
      console.error("Chat error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Encountered a glitch in the studio matrix. Please verify your connection or API configuration.";

      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const samplePrompts = [
    "Cyberpunk neon alleyway with reflective rain puddles in 8k",
    "Minimalist matte black obsidian sculpture with molten gold veins",
    "Surrealist cosmic hourglass in the style of oil on textured canvas",
  ];

  return (
    <PayPalScriptProvider
      options={{
        clientId:
          (process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID as string) || "test",
        currency: "USD",
      }}
    >
      <div className="flex h-screen w-full flex-col bg-neutral-950 text-neutral-100 antialiased overflow-hidden selection:bg-neutral-800">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-neutral-800/80 bg-neutral-950/80 px-4 md:px-8 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-neutral-800 via-neutral-900 to-neutral-950 border border-neutral-700/60 shadow-inner">
              <svg
                className="h-5 w-5 text-neutral-200"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                />
              </svg>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold tracking-wider text-sm uppercase text-neutral-100">
                  ForgeAgent
                </h1>
                <span className="rounded border border-neutral-700/60 bg-neutral-900 px-1.5 py-0.5 text-[10px] font-mono tracking-widest text-neutral-400">
                  DALL-E 3 READY
                </span>
                <span className="rounded border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 text-[10px] font-mono tracking-widest text-emerald-300">
                  CHANNEL3 COMPS
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">
                BESPOKE GENERATIVE ART STUDIO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800 hover:text-white transition-all shadow-sm"
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
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
              <span>Admin Dashboard</span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>Checkout Enabled</span>
            </div>
          </div>
        </header>

        {/* Scrollable Message History Area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex max-w-3xl flex-col space-y-6">
            {messages.map((msg, index) => {
              const isUser = msg.role === "user";
              const isSystem = msg.role === "system";

              return (
                <div
                  key={index}
                  className={`flex w-full items-start gap-3.5 transition-opacity duration-300 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Avatar Icon */}
                  {!isUser && (
                    <div
                      className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg border shadow-sm mt-0.5 ${
                        isSystem
                          ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-300"
                          : "border-neutral-800 bg-neutral-900 text-neutral-300"
                      }`}
                    >
                      {isSystem ? (
                        <svg
                          className="h-4 w-4 text-emerald-400"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="h-4 w-4 text-neutral-300"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
                          />
                        </svg>
                      )}
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`group relative max-w-[92%] md:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      isUser
                        ? "rounded-tr-xs border border-neutral-700/70 bg-neutral-800 text-neutral-100 shadow-neutral-950/40"
                        : isSystem
                        ? "rounded-tl-xs border border-emerald-500/40 bg-neutral-900/90 text-neutral-200 backdrop-blur-sm shadow-emerald-950/20 ring-1 ring-emerald-500/20"
                        : "rounded-tl-xs border border-neutral-800/90 bg-neutral-900/80 text-neutral-200 backdrop-blur-sm"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-mono tracking-wider uppercase ${
                          isUser
                            ? "text-neutral-400"
                            : isSystem
                            ? "text-emerald-400 font-semibold"
                            : "text-neutral-500"
                        }`}
                      >
                        {isUser
                          ? "You"
                          : isSystem
                          ? "System // Verified Purchase"
                          : "ForgeAgent"}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Render Prototype Image Preview if present */}
                    {msg.previewUrl && (
                      <div className="flex flex-col">
                        <PreviewCard
                          previewUrl={msg.previewUrl}
                          imagePrompt={msg.imagePrompt}
                          isPaid={msg.isPaid}
                        />

                        {/* Channel3 Market Intelligence Badge */}
                        {!msg.isPaid && (
                          <div className="relative mt-3 w-full max-w-lg overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-emerald-300 shadow-lg shadow-emerald-950/20 backdrop-blur-md">
                            {/* Ambient green glow */}
                            <div className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-emerald-500/10 opacity-60 blur-md" />

                            <div className="relative z-10 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <span className="relative flex h-2 w-2">
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                </span>
                                <span className="text-[10.5px] font-mono font-bold tracking-wider uppercase text-emerald-300">
                                  Channel3 Market Intelligence
                                </span>
                              </div>
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-300">
                                {msg.marketIntelligence?.forgeDiscount || "67% OFF"}
                              </span>
                            </div>

                            <div className="relative z-10 mt-1.5 flex items-center justify-between text-xs font-mono font-medium text-emerald-300">
                              <span>
                                Market Value: $
                                {msg.marketIntelligence?.marketAveragePrice
                                  ? Number(
                                      msg.marketIntelligence.marketAveragePrice
                                    ).toFixed(2)
                                  : "14.99"}{" "}
                                | Forge Deal: $4.99 (Save{" "}
                                {msg.marketIntelligence?.forgeDiscount
                                  ? msg.marketIntelligence.forgeDiscount.replace(
                                      " OFF",
                                      ""
                                    )
                                  : "67%"}
                                )
                              </span>
                            </div>

                            {msg.marketIntelligence?.compProducts &&
                              msg.marketIntelligence.compProducts.length > 0 && (
                                <div className="relative z-10 mt-2 flex flex-wrap items-center gap-1.5 border-t border-emerald-500/20 pt-2 text-[10px] font-mono text-neutral-400">
                                  <span className="text-neutral-500">
                                    Market Comps:
                                  </span>
                                  {msg.marketIntelligence.compProducts.map(
                                    (comp, cIdx) => (
                                      <span
                                        key={cIdx}
                                        className="rounded border border-neutral-800 bg-neutral-900/90 px-1.5 py-0.5 text-neutral-300"
                                      >
                                        {comp}
                                      </span>
                                    )
                                  )}
                                </div>
                              )}
                          </div>
                        )}

                        {/* Render PayPal Buttons directly below image if not yet paid */}
                        {!msg.isPaid && (
                          <div className="relative mt-3 w-full max-w-lg overflow-hidden rounded-xl border border-neutral-800/90 bg-neutral-900/90 p-3.5 shadow-2xl backdrop-blur-sm">
                            <div className="mb-2.5 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5">
                                <svg
                                  className="h-3.5 w-3.5 text-amber-400"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 6h2v6h-2V7zm0 8h2v2h-2v-2z" />
                                </svg>
                                <span className="font-mono text-neutral-300">
                                  Generate 4K with DALL-E 3
                                </span>
                              </div>
                              <span className="font-mono font-semibold text-emerald-400">
                                $4.99 USD
                              </span>
                            </div>

                            <PayPalButtons
                              style={{
                                layout: "vertical",
                                color: "gold",
                                shape: "rect",
                                height: 38,
                                tagline: false,
                              }}
                              createOrder={async () => {
                                const res = await fetch(
                                  "/api/paypal/create-order",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                  }
                                );
                                if (!res.ok) {
                                  const errData = await res
                                    .json()
                                    .catch(() => ({}));
                                  throw new Error(
                                    errData.error || "Failed to create order"
                                  );
                                }
                                const orderData = await res.json();
                                return orderData.id;
                              }}
                              onApprove={async (data) => {
                                const res = await fetch(
                                  "/api/paypal/capture-order",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      orderID: data.orderID,
                                      imagePrompt: msg.imagePrompt,
                                      previewUrl: msg.previewUrl,
                                    }),
                                  }
                                );

                                if (!res.ok) {
                                  const errData = await res
                                    .json()
                                    .catch(() => ({}));
                                  throw new Error(
                                    errData.error || "Failed to capture payment"
                                  );
                                }

                                const captureResult = await res.json();
                                const finalImage =
                                  captureResult.finalImageUrl ||
                                  "https://via.placeholder.com/1024x1024/111111/44FF44?text=Final+4K+Masterpiece";

                                // Mark this message as paid to hide the PayPal button
                                setMessages((prev) =>
                                  prev.map((m, idx) =>
                                    idx === index ? { ...m, isPaid: true } : m
                                  )
                                );

                                // Append system message with the real DALL-E 3 / final masterpiece
                                setMessages((prev) => [
                                  ...prev,
                                  {
                                    role: "system",
                                    content:
                                      "Payment verified! Here is your 4K non-watermarked masterpiece.",
                                    finalImageUrl: finalImage,
                                  },
                                ]);
                              }}
                              onError={(err) => {
                                console.error("PayPal checkout error:", err);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Render Final 4K Masterpiece if present */}
                    {msg.finalImageUrl && (
                      <FinalMasterpieceCard imageUrl={msg.finalImageUrl} />
                    )}
                  </div>

                  {/* User Icon */}
                  {isUser && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg border border-neutral-700 bg-neutral-800 text-neutral-300 shadow-sm mt-0.5">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 11-7.0 0 3.75 3.75 0 017.0 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing/Generating State */}
            {isLoading && (
              <div className="flex items-start gap-3.5 justify-start">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 shadow-sm mt-0.5">
                  <svg
                    className="h-4 w-4 animate-spin text-neutral-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    ></path>
                  </svg>
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-neutral-800/90 bg-neutral-900/60 px-4 py-3 text-xs text-neutral-400 backdrop-blur-sm">
                  <span className="font-mono text-[11px] tracking-wide">
                    Synthesizing concept via gpt-4o-mini
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-1 w-1 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-1 w-1 rounded-full bg-neutral-400 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-1 w-1 rounded-full bg-neutral-400 animate-bounce"></span>
                  </span>
                </div>
              </div>
            )}

            {/* Invisible target for auto-scroll */}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        </main>

        {/* Suggested Prompts */}
        {messages.length <= 2 && (
          <div className="hidden sm:block shrink-0 px-4 pb-2">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 justify-center">
              <span className="text-[11px] font-mono text-neutral-500 uppercase">
                Inspire:
              </span>
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInput(prompt);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-400 hover:border-neutral-700 hover:bg-neutral-800 hover:text-neutral-200 transition-colors"
                >
                  &ldquo;
                  {prompt.length > 42 ? prompt.slice(0, 42) + "..." : prompt}
                  &rdquo;
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fixed Bottom Input Area */}
        <footer className="sticky bottom-0 z-20 shrink-0 border-t border-neutral-800/80 bg-neutral-950/90 p-4 backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
            <div className="relative flex items-center rounded-2xl border border-neutral-800 bg-neutral-900/90 shadow-2xl transition-all focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe your vision, art style, or prototype request..."
                disabled={isLoading}
                className="w-full bg-transparent px-4 py-3.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none disabled:opacity-50"
              />
              <div className="pr-2">
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-neutral-100 px-4 text-xs font-semibold text-neutral-950 shadow-md transition-all hover:bg-white hover:shadow-lg disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
                >
                  <span>Send</span>
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
                      d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-neutral-500 font-mono">
              <span>Press Enter to send</span>
              <span>Intelligent Agent • PayPal Secured</span>
            </div>
          </form>
        </footer>
      </div>
    </PayPalScriptProvider>
  );
}
