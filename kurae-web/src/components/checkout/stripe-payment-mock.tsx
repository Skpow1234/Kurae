"use client";

import { CreditCard, Lock } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";

type StripePaymentMockProps = {
  email: string;
  onEmailChange: (email: string) => void;
  disabled?: boolean;
};

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)} / ${digits.slice(2)}`;
}

export function StripePaymentMock({
  email,
  onEmailChange,
  disabled,
}: StripePaymentMockProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-sakura-mist">
        <Lock className="h-3.5 w-3.5" />
        <span>Secured by Stripe (mock UI)</span>
      </div>

      <div>
        <label htmlFor="checkout-email" className="mb-1 block text-sm font-medium">
          Email
        </label>
        <Input
          id="checkout-email"
          type="email"
          required
          placeholder="you@email.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="rounded-md border border-sakura-petal bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 border-b border-sakura-petal pb-3">
          <CreditCard className="h-4 w-4 text-sakura-mist" />
          <span className="text-sm font-medium text-sakura-ink">Card</span>
        </div>
        <div className="space-y-3">
          <Input
            placeholder="4242 4242 4242 4242"
            disabled={disabled}
            aria-label="Card number"
            inputMode="numeric"
            autoComplete="cc-number"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="MM / YY"
              disabled={disabled}
              aria-label="Expiry"
              inputMode="numeric"
              autoComplete="cc-exp"
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            />
            <Input
              placeholder="CVC"
              disabled={disabled}
              aria-label="CVC"
              type="password"
              inputMode="numeric"
              autoComplete="cc-csc"
              maxLength={4}
              value={cvc}
              onChange={(e) =>
                setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              className="font-mono tracking-widest"
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-sakura-mist">
        Apple Pay and Google Pay appear here when enabled by the seller.
      </p>
    </div>
  );
}
