/** Where a signed-in user lands: owners on the dashboard, everyone else on salons. */
export function homeForRole(role: string): string {
  return role === "owner" ? "/dashboard" : "/salons";
}
