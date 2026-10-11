/** The refund rule shown on the salon page and in the booking review. */
export function refundRuleText(cancellationHours: number): string {
  const unit = cancellationHours === 1 ? "hour" : "hours";
  return `Refund only if you cancel more than ${cancellationHours} ${unit} before your appointment.`;
}
