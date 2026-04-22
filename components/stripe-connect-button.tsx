"use client";

import { CreditCard, Link2 } from "lucide-react";

interface StripeConnectButtonProps {
  connected: boolean;
}

export function StripeConnectButton({ connected }: StripeConnectButtonProps) {
  return (
    <a
      href="/api/stripe/connect"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
    >
      {connected ? <Link2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
      {connected ? "Reconnect Stripe Account" : "Connect Stripe Account"}
    </a>
  );
}
