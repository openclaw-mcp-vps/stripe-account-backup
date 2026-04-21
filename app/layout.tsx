import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stripe-account-backup.app"),
  title: {
    default: "Stripe Account Backup",
    template: "%s | Stripe Account Backup"
  },
  description:
    "Backup your Stripe data before account termination. Export customers, transactions, payouts, and subscriptions into audit-ready CSV and JSON archives.",
  keywords: [
    "stripe backup",
    "stripe export",
    "payment history backup",
    "stripe migration",
    "financial records"
  ],
  openGraph: {
    title: "Stripe Account Backup",
    description:
      "One-click Stripe backups with complete CSV and JSON exports for taxes, disputes, migrations, and compliance.",
    url: "https://stripe-account-backup.app",
    siteName: "Stripe Account Backup",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Stripe Account Backup",
    description:
      "Protect your Stripe records before account freezes or migrations with organized backups you can download anytime."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="font-[var(--font-sans)] antialiased">{children}</body>
    </html>
  );
}
