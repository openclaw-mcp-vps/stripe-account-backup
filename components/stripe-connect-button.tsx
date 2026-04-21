import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";

type StripeConnectButtonProps = {
  connected: boolean;
};

export function StripeConnectButton({ connected }: StripeConnectButtonProps) {
  if (connected) {
    return (
      <Button variant="outline" disabled>
        Stripe Connected
      </Button>
    );
  }

  return (
    <Link className={buttonVariants({ variant: "default", size: "default" })} href="/api/stripe/connect">
      Connect Stripe Account
    </Link>
  );
}
