export const BARGAIN_ENABLED = true;

export const BASE_PRICE = 4.99;
export const FLOOR_PRICE = 2.99;
export const MAX_ROUNDS = 3;

export const ROUND_COUNTERS: Record<number, number> = {
  1: 4.49,
  2: 3.79,
  3: 3.29,
};

export type BargainDecision = "accept" | "counter" | "reject_low";

export interface BargainEvaluation {
  decision: BargainDecision;
  price: number;
  message: string;
}

const ACCEPT_VARIANTS = [
  "Deal accepted! Seed #{seed} is uniquely yours in full 4K master resolution.",
  "You've got an eye for art and an edge in bargaining. Deal locked for your one-of-a-kind master!",
  "A worthy trade for a masterwork! 4K commercial license unlocked at your agreed price.",
  "Deal sealed! My merchant heuristics honor this valuation for your custom 4K asset.",
];

const COUNTER_VARIANTS_R1 = [
  "This 4K master is locked to a unique seed with pristine detail. How about $4.49 USD?",
  "A one-of-a-kind render deserves proper recognition. I can bring it down to $4.49 for you.",
  "Between raw compute and 4K commercial licensing, $4.49 is a fair compromise. Deal?",
];

const COUNTER_VARIANTS_R2 = [
  "You're a sharp negotiator! For this locked-seed 4K render, I'll meet you at $3.79 USD.",
  "The gallery directors wouldn't approve, but I'll calibrate this master asset down to $3.79.",
  "Let's make this happen. $3.79 for full commercial 4K rights with no watermark.",
];

const FINAL_ROUND_VARIANTS = [
  "Final round, friend! My absolute bottom line for this 4K one-of-a-kind artwork is $3.29 USD. Take it or leave it!",
  "Last call from the forge! $3.29 is as low as this master asset can ever go. Deal?",
  "Final take-it-or-leave-it offer: $3.29 for the full commercial 4K license and locked seed master.",
];

const REJECT_LOW_VARIANTS = [
  "That's below my compute floor ($2.99). This 4K master asset is one-of-a-kind!",
  "I appreciate the enthusiasm, but high-res 4K renders have real value. We can't go below $2.99.",
  "My merchant core cannot go that low for commercial 4K artwork. Here is my best counter offer.",
  "A unique seed and 4K upscaling deserve respect! Propose something above our $2.99 floor.",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function evaluateOffer(rawOffer: number, roundInput: number = 1): BargainEvaluation {
  const round = Math.max(1, Math.floor(roundInput));
  const offer = Math.round(rawOffer * 100) / 100;

  // Determine counter price based on round (round 1 -> 4.49, round 2 -> 3.79, round >= 3 -> 3.29)
  const currentCounter = round === 1 ? 4.49 : round === 2 ? 3.79 : 3.29;

  // 1. Offer below FLOOR_PRICE (2.99)
  if (offer < FLOOR_PRICE) {
    const msg = `${pickRandom(REJECT_LOW_VARIANTS)} I can do $${currentCounter.toFixed(2)} USD.`;
    return {
      decision: "reject_low",
      price: currentCounter,
      message: msg,
    };
  }

  // 2. Accept if offer is >= current round's counter price
  if (offer >= currentCounter) {
    const agreedPrice = Math.min(BASE_PRICE, Math.max(FLOOR_PRICE, offer));
    const formattedAgreed = Math.round(agreedPrice * 100) / 100;
    const msg = `${pickRandom(ACCEPT_VARIANTS)} Agreed at $${formattedAgreed.toFixed(2)} USD.`;
    return {
      decision: "accept",
      price: formattedAgreed,
      message: msg,
    };
  }

  // 3. User offered between FLOOR_PRICE and currentCounter
  if (round >= MAX_ROUNDS) {
    // After round 3: final take-it-or-leave-it at 3.29
    const msg = pickRandom(FINAL_ROUND_VARIANTS);
    return {
      decision: "counter",
      price: 3.29,
      message: msg,
    };
  }

  // Round 1 or 2 counter
  const counterMsg = round === 1 ? pickRandom(COUNTER_VARIANTS_R1) : pickRandom(COUNTER_VARIANTS_R2);
  return {
    decision: "counter",
    price: currentCounter,
    message: counterMsg,
  };
}
