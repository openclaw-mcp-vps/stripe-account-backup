# Build Task: stripe-account-backup

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: stripe-account-backup
HEADLINE: Backup your Stripe data before account termination
WHAT: None
WHY: None
WHO PAYS: None
NICHE: business-tools
PRICE: $$15/mo

ARCHITECTURE SPEC:
A Next.js web app that connects to users' Stripe accounts via OAuth, extracts all account data (customers, payments, products, etc.), and generates downloadable backups in multiple formats. Users authenticate with Stripe, select data types to backup, and receive comprehensive exports before potential account closure.

PLANNED FILES:
- app/page.tsx
- app/dashboard/page.tsx
- app/backup/page.tsx
- app/api/stripe/connect/route.ts
- app/api/stripe/data/route.ts
- app/api/backup/generate/route.ts
- app/api/webhooks/lemonsqueezy/route.ts
- lib/stripe-client.ts
- lib/backup-generator.ts
- lib/lemonsqueezy.ts
- components/stripe-connect-button.tsx
- components/backup-progress.tsx
- components/data-selector.tsx

DEPENDENCIES: next, react, tailwindcss, stripe, @lemonsqueezy/lemonsqueezy.js, archiver, csv-writer, prisma, @prisma/client, next-auth, lucide-react

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.


PREVIOUS ATTEMPT FAILED WITH:
Codex exited 1: Reading additional input from stdin...
OpenAI Codex v0.121.0 (research preview)
--------
workdir: /tmp/openclaw-builds/stripe-account-backup
model: gpt-5.3-codex
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: none
reasoning summaries: none
session id: 019d94ce-ccbb-7680-afb3-f871811e73d3
--------
user
# Build Task: stripe-account-backup

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: stripe-account-backup
HEADLINE: Backup your Stri
Please fix the above errors and regenerate.