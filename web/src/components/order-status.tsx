"use client";

import { useEffect, useState } from "react";

type State = { status: string; reference?: string; amountCents?: number };

/**
 * Polls until the webhook marks the order paid. The page never flips the
 * status itself; it only reports what the webhook has already recorded.
 */
export function OrderStatus({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<State>({ status: "checking" });
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let live = true;
    if (state.status === "paid" || tries > 15) return;

    const timer = setTimeout(
      async () => {
        try {
          const res = await fetch(
            `/api/orders/status?session_id=${encodeURIComponent(sessionId)}`,
            { cache: "no-store" },
          );
          const j = (await res.json()) as State;
          if (live) {
            setState(j);
            setTries((t) => t + 1);
          }
        } catch {
          if (live) setTries((t) => t + 1);
        }
      },
      tries === 0 ? 300 : 2000,
    );

    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [sessionId, tries, state.status]);

  if (state.status === "paid") {
    return (
      <p className="text-[14.5px] text-body max-w-[46ch]">
        Payment confirmed{state.reference ? ` (${state.reference})` : ""}. Your
        category is locked on this mailing. Check your email for a receipt, and
        we will be in touch about your ad artwork.
      </p>
    );
  }

  if (tries > 15) {
    return (
      <p className="text-[14.5px] text-body max-w-[46ch]">
        Your payment went through and we are still finishing the confirmation.
        Nothing more is needed from you; if you do not get a receipt within a
        few minutes, call us on 843-212-2969 and we will sort it.
      </p>
    );
  }

  return (
    <p className="text-[14.5px] text-body max-w-[46ch]">
      Confirming your payment with Stripe. This usually takes a couple of
      seconds.
    </p>
  );
}
