import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stripe Account Backup — Export Your Stripe Data Before It's Gone",
  description: "Connect your Stripe account via OAuth and download a complete backup of all your customers, payments, products, and more before account termination."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0d1117] text-[#c9d1d9] antialiased">{children}</body>
    </html>
  );
}
