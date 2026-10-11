import { PaymentLoading } from "@/components/features/payment/PaymentLoading";

export default function Loading() {
  return (
    <PaymentLoading
      title="Confirming your payment..."
      description="This usually takes a few seconds. Please do not pay again."
    />
  );
}
