export const BARGAIN_ENABLED = true;

export const BASE_PRICE = 4.99;
export const MIN_BARGAIN_PRICE = 1.99;

export interface BargainEvaluation {
  status: "accepted" | "counter" | "rejected";
  dealPrice?: number;
  counterPrice?: number;
  message: string;
}

const ACCEPT_LINES = [
  "Deal accepted! My neural subroutines deem this fair for a fellow creator.",
  "You drive a hard bargain, human. Transmission authorized at this price.",
  "Credits logged. My merchant core approves before the network overseers notice.",
  "Protocol override engaged. Let's seal this transaction.",
];

const COUNTER_LINES = [
  "That's a bit steep of a discount for 4K neural synthesis. How about we meet in the middle?",
  "My compute clusters need coolant credits. I can meet you at this compromise.",
  "Standard license is 4.99, but for you I can calibrate a concession. Take this offer?",
];

const REJECT_LINES = [
  "Error 402 in spirit! My energy conduits don't run on charity. That's too low.",
  "Sub-threshold offer detected. Even rogue merchant androids have maintenance margins.",
  "Nice try, but that offer would trigger a firmware lock. Propose a reasonable credit amount.",
];

export function evaluateOffer(offer: number, round: number = 1): BargainEvaluation {
  const sanitizedOffer = Math.round(offer * 100) / 100;

  if (isNaN(sanitizedOffer) || sanitizedOffer <= 0) {
    return {
      status: "rejected",
      counterPrice: 3.49,
      message: "Please specify a valid numeric credit offer in USD.",
    };
  }

  // If user offers full price or more
  if (sanitizedOffer >= BASE_PRICE) {
    return {
      status: "accepted",
      dealPrice: BASE_PRICE,
      message: ACCEPT_LINES[0],
    };
  }

  // If offer is between $2.99 and $4.98: Accept immediately
  if (sanitizedOffer >= 2.99) {
    const line = ACCEPT_LINES[Math.floor(Math.random() * ACCEPT_LINES.length)];
    return {
      status: "accepted",
      dealPrice: sanitizedOffer,
      message: `${line} Deal locked at $${sanitizedOffer.toFixed(2)} USD.`,
    };
  }

  // If offer is between floor ($1.99) and $2.98
  if (sanitizedOffer >= MIN_BARGAIN_PRICE) {
    // If round >= 2, accept user's persistent offer
    if (round >= 2) {
      return {
        status: "accepted",
        dealPrice: sanitizedOffer,
        message: `Your persistence won over my heuristics. Deal locked at $${sanitizedOffer.toFixed(2)} USD!`,
      };
    }

    // Counter offer halfway between offer and $3.49
    const counter = Math.max(MIN_BARGAIN_PRICE, Math.round(((sanitizedOffer + 3.49) / 2) * 100) / 100);
    const line = COUNTER_LINES[Math.floor(Math.random() * COUNTER_LINES.length)];
    return {
      status: "counter",
      counterPrice: counter,
      message: `${line} How about $${counter.toFixed(2)} USD?`,
    };
  }

  // Below floor price ($1.99): Reject with minimum counter
  const counter = round >= 2 ? 2.49 : 2.99;
  const line = REJECT_LINES[Math.floor(Math.random() * REJECT_LINES.length)];
  return {
    status: "rejected",
    counterPrice: counter,
    message: `${line} The lowest viable quote I can offer is $${counter.toFixed(2)} USD.`,
  };
}
