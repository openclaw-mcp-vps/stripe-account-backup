import { ArrowRight, FileArchive, ShieldCheck, TriangleAlert } from "lucide-react";
import { PricingSection } from "@/components/pricing-section";
import { UnlockAccessForm } from "@/components/unlock-access-form";

const faqs = [
  {
    question: "What data is included in each backup?",
    answer:
      "Each archive includes JSON and CSV files for customers, subscriptions, charges/transactions, and payouts. Files are timestamped and organized for audit or migration workflows."
  },
  {
    question: "How does purchase access work?",
    answer:
      "Checkout happens on Stripe using the hosted payment link. Once payment is confirmed via webhook, enter the same checkout email to unlock your dashboard cookie and manage backups."
  },
  {
    question: "Can I run backups before a migration deadline?",
    answer:
      "Yes. You can run a full backup on demand, then generate incremental snapshots so you keep a final, complete record right before cutover."
  },
  {
    question: "Where are backup archives stored?",
    answer:
      "Backups are stored locally by default. If AWS credentials are configured, archives are uploaded to S3 and download links are served as short-lived signed URLs."
  }
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-10 md:px-8 md:py-14">
      <header className="rounded-2xl border border-slate-700 bg-slate-900/55 p-6 md:p-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Stripe data continuity
        </div>

        <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-white md:text-5xl">
          Backup your Stripe data before account termination or migration risk.
        </h1>

        <p className="mt-5 max-w-3xl text-lg text-slate-300">
          Stripe Account Backup automatically exports transactions, customers, subscriptions, and payouts into
          structured CSV and JSON archives, so your financial history stays intact when you need it most.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#pricing"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#0d1117] transition hover:bg-emerald-300"
          >
            Start Protecting My Data
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-slate-600 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-emerald-400 hover:text-emerald-300"
          >
            Open Dashboard
          </a>
        </div>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-rose-500/30 bg-rose-950/25 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-rose-200">
            <TriangleAlert className="h-5 w-5" />
            The risk
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-rose-100/85">
            Stripe account reviews and sudden restrictions can block your access with minimal notice. Native exports are
            fragmented across dashboards, are slow to assemble, and often miss relationships needed for taxes, chargeback
            defense, and investor diligence.
          </p>
        </article>

        <article className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-emerald-200">
            <FileArchive className="h-5 w-5" />
            The solution
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-emerald-100/90">
            Connect Stripe once with read-only OAuth, run full and incremental backups on demand, and download one
            archive containing all core payment records in machine-readable and spreadsheet-ready formats.
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Who pays</p>
          <p className="mt-2 text-sm text-slate-200">
            SaaS founders and ecommerce operators processing $10K+ monthly who need reliable financial archives.
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Best fit</p>
          <p className="mt-2 text-sm text-slate-200">
            High-risk verticals, migration planning, and teams preparing compliance or investor audits.
          </p>
        </div>
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Time saved</p>
          <p className="mt-2 text-sm text-slate-200">
            Replace hours of manual exports with one-click archives and daily incremental snapshots.
          </p>
        </div>
      </section>

      <PricingSection />

      <section className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-6">
          <h2 className="text-2xl font-semibold text-white">Frequently asked questions</h2>
          <div className="mt-5 space-y-4">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-lg border border-slate-700 bg-[#101827] p-4">
                <h3 className="text-sm font-semibold text-slate-100">{faq.question}</h3>
                <p className="mt-2 text-sm text-slate-300">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>

        <UnlockAccessForm />
      </section>
    </main>
  );
}
