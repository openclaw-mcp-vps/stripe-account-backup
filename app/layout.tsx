import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://stripe-account-backup.app"),
  title: "Stripe Account Backup | Export Stripe data before account termination",
  description:
    "Back up your complete Stripe history into organized CSV and JSON archives before account reviews, migrations, or compliance events.",
  keywords: [
    "Stripe backup",
    "Stripe export",
    "Stripe data retention",
    "Stripe account termination",
    "Stripe compliance records",
    "payment migration"
  ],
  openGraph: {
    title: "Stripe Account Backup",
    description:
      "Automatically export transactions, customers, subscriptions, and payouts into audit-ready archives.",
    type: "website",
    url: "https://stripe-account-backup.app"
  },
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
