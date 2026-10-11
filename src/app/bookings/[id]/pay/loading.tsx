import { PaymentLoading } from "@/components/features/payment/PaymentLoading";

export default function Loading() {
  return (
    <PaymentLoading
      title="Loading your booking..."
      description="The first visit after a quiet spell can take up to a minute."
    />
  );
}
