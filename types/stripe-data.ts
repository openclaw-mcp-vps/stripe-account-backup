import type Stripe from "stripe";

export type BackupKind = "full" | "incremental";
export type BackupStatus = "running" | "completed" | "failed";

export interface StripeBackupData {
  customers: Stripe.Customer[];
  subscriptions: Stripe.Subscription[];
  payouts: Stripe.Payout[];
  transactions: Stripe.Charge[];
}

export interface CustomerCsvRow {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  currency: string;
  delinquent: string;
}

export interface SubscriptionCsvRow {
  id: string;
  customerId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: string;
  amount: string;
  currency: string;
}

export interface TransactionCsvRow {
  id: string;
  amount: string;
  currency: string;
  status: string;
  paid: string;
  customerId: string;
  description: string;
  createdAt: string;
}

export interface PayoutCsvRow {
  id: string;
  amount: string;
  currency: string;
  status: string;
  arrivalDate: string;
  createdAt: string;
  method: string;
}
