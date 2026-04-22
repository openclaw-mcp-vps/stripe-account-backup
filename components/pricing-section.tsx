import { CheckCircle2 } from "lucide-react";

const includedItems = [
  "Unlimited full and incremental backups",
  "One-click ZIP download with JSON + CSV exports",
  "Customer, subscription, payout, and transaction coverage",
  "Daily automated incremental snapshots",
  "Audit-friendly export structure for finance and compliance"
];

export function PricingSection() {
  return (
    <section id="pricing" className="rounded-2xl border border-slate-700 bg-slate-900/60 p-8 md:p-10">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Simple pricing</p>
          <h2 className="mt-3 text-3xl font-semibold text-white">One plan for complete Stripe continuity</h2>
          <p className="mt-3 max-w-2xl text-slate-300">
            Designed for SaaS and ecommerce teams processing serious volume who cannot afford data loss during
            account reviews, migration windows, or compliance events.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          Early access launch pricing
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          {includedItems.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-950/60 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm text-slate-200">{item}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-700 bg-[#111826] p-6">
          <p className="text-sm font-medium text-slate-300">Stripe Account Backup</p>
          <p className="mt-2 text-4xl font-bold text-white">$15<span className="text-lg text-slate-400">/month</span></p>
          <p className="mt-3 text-sm text-slate-300">
            Start backing up in minutes. Hosted Stripe checkout, no contract, cancel anytime.
          </p>
          <a
            href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-emerald-400 px-4 py-3 text-sm font-semibold text-[#0d1117] transition hover:bg-emerald-300"
          >
            Buy Secure Backup Access
          </a>
          <p className="mt-3 text-xs text-slate-400">
            Checkout opens directly on Stripe. After payment, return here and unlock your dashboard with your purchase
            email.
          </p>
        </div>
      </div>
    </section>
  );
}
