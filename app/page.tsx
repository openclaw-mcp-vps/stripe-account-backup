export default function Home() {
  const checkoutUrl = process.env.NEXT_PUBLIC_LS_CHECKOUT_URL || "#";

  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      {/* Nav */}
      <nav className="border-b border-[#21262d] px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="font-bold text-[#58a6ff] text-lg">StripeBackup</span>
        <a href={checkoutUrl} className="bg-[#58a6ff] text-[#0d1117] text-sm font-semibold px-4 py-2 rounded-md hover:bg-[#79b8ff] transition-colors">
          Get Started
        </a>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-24 text-center">
        <span className="inline-block bg-[#161b22] border border-[#30363d] text-[#58a6ff] text-xs font-medium px-3 py-1 rounded-full mb-6">
          Protect your business data
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
          Backup Your Stripe Data<br />
          <span className="text-[#58a6ff]">Before It&apos;s Too Late</span>
        </h1>
        <p className="text-[#8b949e] text-lg md:text-xl max-w-2xl mx-auto mb-10">
          Connect your Stripe account via OAuth and instantly export all your customers, payments, subscriptions, products, and invoices into downloadable backups — before account termination wipes everything.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href={checkoutUrl} className="bg-[#58a6ff] text-[#0d1117] font-bold px-8 py-4 rounded-lg text-lg hover:bg-[#79b8ff] transition-colors">
            Start Backing Up — $15/mo
          </a>
          <a href="#faq" className="border border-[#30363d] text-[#c9d1d9] font-semibold px-8 py-4 rounded-lg text-lg hover:border-[#58a6ff] hover:text-[#58a6ff] transition-colors">
            Learn More
          </a>
        </div>
        <p className="text-[#8b949e] text-sm mt-4">Cancel anytime. Instant access after payment.</p>
      </section>

      {/* Features strip */}
      <section className="bg-[#161b22] border-y border-[#21262d] py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { icon: "👥", label: "Customers" },
            { icon: "💳", label: "Payments" },
            { icon: "📦", label: "Products" },
            { icon: "🧾", label: "Invoices" },
          ].map((f) => (
            <div key={f.label}>
              <div className="text-3xl mb-2">{f.icon}</div>
              <div className="text-[#c9d1d9] font-semibold">{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { step: "1", title: "Connect Stripe", desc: "Authorize read-only OAuth access to your Stripe account in seconds." },
            { step: "2", title: "Select Data", desc: "Choose which data types to export: customers, charges, subscriptions, and more." },
            { step: "3", title: "Download Backup", desc: "Get a ZIP with JSON and CSV exports of all selected data, ready to store safely." },
          ].map((s) => (
            <div key={s.step} className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
              <div className="w-10 h-10 rounded-full bg-[#58a6ff] text-[#0d1117] font-bold flex items-center justify-center mb-4 text-lg">{s.step}</div>
              <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
              <p className="text-[#8b949e] text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Simple Pricing</h2>
        <p className="text-[#8b949e] mb-12">One plan. Everything included. Cancel anytime.</p>
        <div className="max-w-sm mx-auto bg-[#161b22] border-2 border-[#58a6ff] rounded-2xl p-8">
          <div className="text-[#58a6ff] font-semibold text-sm uppercase tracking-widest mb-2">Pro Plan</div>
          <div className="text-5xl font-extrabold text-white mb-1">$15</div>
          <div className="text-[#8b949e] mb-6">per month</div>
          <ul className="text-left space-y-3 mb-8">
            {[
              "Unlimited Stripe account backups",
              "Export customers, payments, products",
              "Subscriptions, invoices & refunds",
              "JSON + CSV download formats",
              "Scheduled automatic backups",
              "Secure OAuth — read-only access",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-[#c9d1d9]">
                <span className="text-[#58a6ff] mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <a href={checkoutUrl} className="block w-full bg-[#58a6ff] text-[#0d1117] font-bold py-3 rounded-lg hover:bg-[#79b8ff] transition-colors text-center">
            Get Started Now
          </a>
          <p className="text-[#8b949e] text-xs mt-3">Secure payment via Lemon Squeezy</p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-12">Frequently Asked Questions</h2>
        <div className="space-y-6">
          {[
            {
              q: "Is my Stripe data safe?",
              a: "Yes. We use Stripe's official OAuth flow with read-only permissions. We never store your secret keys and only access data you explicitly authorize during the backup process."
            },
            {
              q: "What data can I export?",
              a: "You can export customers, charges, payment intents, subscriptions, products, prices, invoices, refunds, and disputes — everything you need to reconstruct your business records."
            },
            {
              q: "Can I cancel my subscription?",
              a: "Absolutely. Cancel anytime from your account dashboard with no questions asked. You keep access until the end of your billing period."
            },
          ].map((item) => (
            <div key={item.q} className="bg-[#161b22] border border-[#21262d] rounded-xl p-6">
              <h3 className="text-white font-semibold mb-2">{item.q}</h3>
              <p className="text-[#8b949e] text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#21262d] py-8 text-center text-[#8b949e] text-sm">
        <p>&copy; {new Date().getFullYear()} StripeBackup. Not affiliated with Stripe, Inc.</p>
      </footer>
    </main>
  );
}
