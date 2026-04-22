import type Stripe from "stripe";
import type {
  CustomerCsvRow,
  PayoutCsvRow,
  SubscriptionCsvRow,
  TransactionCsvRow
} from "@/types/stripe-data";

function formatUnixTimestamp(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) {
    return "";
  }

  return new Date(unixSeconds * 1000).toISOString();
}

function formatAmount(amount: number | null | undefined): string {
  if (amount == null) {
    return "0.00";
  }

  return (amount / 100).toFixed(2);
}

function resolveCustomerId(customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string {
  if (!customer) {
    return "";
  }

  if (typeof customer === "string") {
    return customer;
  }

  return customer.id;
}

function resolveCurrency(value: string | null | undefined): string {
  return (value ?? "").toUpperCase();
}

export function mapCustomersToCsvRows(customers: Stripe.Customer[]): CustomerCsvRow[] {
  return customers.map((customer) => ({
    id: customer.id,
    email: customer.email ?? "",
    name: customer.name ?? "",
    createdAt: formatUnixTimestamp(customer.created),
    currency: resolveCurrency(customer.currency),
    delinquent: customer.delinquent ? "yes" : "no"
  }));
}

export function mapSubscriptionsToCsvRows(subscriptions: Stripe.Subscription[]): SubscriptionCsvRow[] {
  return subscriptions.map((subscription) => {
    const item = subscription.items.data[0];
    const amount = item?.price?.unit_amount;
    const subscriptionLike = subscription as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
    };

    return {
      id: subscription.id,
      customerId: resolveCustomerId(subscription.customer),
      status: subscription.status,
      currentPeriodStart: formatUnixTimestamp(subscriptionLike.current_period_start),
      currentPeriodEnd: formatUnixTimestamp(subscriptionLike.current_period_end),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? "yes" : "no",
      amount: formatAmount(amount),
      currency: resolveCurrency(item?.price?.currency)
    };
  });
}

export function mapTransactionsToCsvRows(charges: Stripe.Charge[]): TransactionCsvRow[] {
  return charges.map((charge) => ({
    id: charge.id,
    amount: formatAmount(charge.amount),
    currency: resolveCurrency(charge.currency),
    status: charge.status,
    paid: charge.paid ? "yes" : "no",
    customerId: resolveCustomerId(charge.customer),
    description: charge.description ?? "",
    createdAt: formatUnixTimestamp(charge.created)
  }));
}

export function mapPayoutsToCsvRows(payouts: Stripe.Payout[]): PayoutCsvRow[] {
  return payouts.map((payout) => ({
    id: payout.id,
    amount: formatAmount(payout.amount),
    currency: resolveCurrency(payout.currency),
    status: payout.status,
    arrivalDate: formatUnixTimestamp(payout.arrival_date),
    createdAt: formatUnixTimestamp(payout.created),
    method: payout.method
  }));
}
