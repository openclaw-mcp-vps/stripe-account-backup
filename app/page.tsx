import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPaidSessionFromCookies } from "@/lib/auth";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function one(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const faqs = [
  {
    question: "What exactly gets exported?",
    answer:
      "Each backup includes charges, customers, subscriptions, payouts, invoices, and balance transactions in both CSV and JSON files, plus a manifest with timestamps and record counts."
  },
  {
    question: "Will this work if my Stripe account is at risk?",
    answer:
      "Yes. As long as API access still works, you can generate exports immediately. The goal is to keep audit-ready records before limits, freezes, or shutdowns affect dashboard access."
  },
  {
    question: "How fast is setup?",
    answer:
      "Most teams complete setup in under five minutes: complete checkout, verify purchase email, connect Stripe, then run your first backup."
  },
  {
    question: "Where are backup files stored?",
    answer:
      "Files are stored in S3 when credentials are configured. If not, files are stored on local disk so you can still download complete ZIP archives."
  }
];

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const paywallError = one(params.paywallError);
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;
  const paidSession = await getPaidSessionFromCookies();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-8">
      <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Business Tools</p>
          <h1 className="mt-2 text-2xl font-bold">Stripe Account Backup</h1>
        </div>
        {paidSession ? (
          <Link className={buttonVariants({ variant: "default" })} href="/dashboard">
            Open Dashboard
          </Link>
        ) : null}
      </header>

      <section className="grid gap-8 py-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">Backup your Stripe data before account termination</p>
          <h2 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
            Protect your full payment history before account freezes, migrations, or compliance audits.
          </h2>
          <p className="mt-5 max-w-2xl text-base text-[var(--muted)] sm:text-lg">
            Stripe Account Backup exports transactions, customers, subscriptions, payouts, and linked records into structured CSV and JSON bundles. Instead of piecing together manual exports, you get a complete archive in one click.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              className={buttonVariants({ variant: "default", size: "lg" })}
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "#"}
              rel="noreferrer"
              target="_blank"
            >
              Start for $15/month
            </a>
            <a className={buttonVariants({ variant: "outline", size: "lg" })} href="#verify-access">
              I already purchased
            </a>
          </div>
          {!paymentLink ? (
            <p className="mt-4 text-sm text-[var(--warning)]">
              Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK to enable checkout.
            </p>
          ) : null}
        </div>

        <Card className="bg-[linear-gradient(160deg,rgba(35,134,54,0.18),rgba(13,17,23,0.92))]">
          <CardHeader>
            <CardTitle>Who this is for</CardTitle>
            <CardDescription>
              SaaS founders and ecommerce teams processing $10K+ monthly through Stripe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[var(--foreground)]">
            <p>High-risk industries that need defensive recordkeeping.</p>
            <p>Teams planning payment-provider migration with zero data loss.</p>
            <p>Finance leads preparing tax filings, dispute evidence, or investor diligence.</p>
            <p className="rounded-md border border-[var(--border)] bg-black/20 p-3 text-[var(--muted)]">
              Stripe exports can be fragmented and slow for relationship-heavy data. This tool creates complete, organized backups in one archive.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 py-8 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Problem</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            Manual exports take hours, break relationships across objects, and often miss payout or balance-transaction context needed for audits and disputes.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Solution</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            Connect Stripe once, generate on-demand backups, and download complete ZIP archives with CSV/JSON outputs ready for finance operations.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Value</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            Keep independent, audit-ready records under your control before account issues, compliance reviews, or migration deadlines create urgency.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-8 py-8 lg:grid-cols-[1fr_1fr]" id="verify-access">
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Simple monthly access with unlimited manual backups.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">$15<span className="text-lg font-medium text-[var(--muted)]">/month</span></p>
            <ul className="mt-5 space-y-3 text-sm text-[var(--foreground)]">
              <li>Complete Stripe object coverage in one archive</li>
              <li>CSV and JSON output for finance and engineering workflows</li>
              <li>Dashboard download history for repeatable recordkeeping</li>
              <li>Optional internal daily scheduler support</li>
            </ul>
            <a
              className={`${buttonVariants({ variant: "default", size: "lg" })} mt-6 w-full`}
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "#"}
              rel="noreferrer"
              target="_blank"
            >
              Buy on Stripe Checkout
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Unlock Dashboard</CardTitle>
            <CardDescription>
              After checkout, verify with the same email used in Stripe payment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action="/api/paywall/verify" className="space-y-4" method="post">
              <label className="block text-sm text-[var(--muted)]" htmlFor="email">
                Purchase email
              </label>
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--card-strong)] px-3 py-2 text-sm outline-none ring-0 focus:border-emerald-400"
                id="email"
                name="email"
                placeholder="founder@company.com"
                required
                type="email"
              />
              <Button className="w-full" type="submit">
                Verify Payment & Enter Dashboard
              </Button>
            </form>
            {paywallError ? (
              <p className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {safeDecode(paywallError)}
              </p>
            ) : (
              <p className="mt-4 text-sm text-[var(--muted)]">
                If your payment was just completed, verification can take a few seconds while Stripe webhook events sync.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="py-8">
        <h3 className="text-2xl font-bold">FAQ</h3>
        <div className="mt-5 grid gap-4">
          {faqs.map((faq) => (
            <Card key={faq.question}>
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[var(--muted)]">{faq.answer}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
