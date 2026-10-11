/** Leaves the app for another address (used for Paystack). A function so tests can replace it. */
export function leaveTo(url: string): void {
  window.location.assign(url);
}
