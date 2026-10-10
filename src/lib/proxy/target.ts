function decodeOnce(segment: string): string | null {
  try {
    return decodeURIComponent(segment);
  } catch {
    return null;
  }
}

function isUnsafeSegment(segment: string): boolean {
  if (segment === "" || segment === "." || segment === "..") return true;
  const decoded = decodeOnce(segment);
  if (decoded === null) return true;
  return (
    decoded === "." ||
    decoded === ".." ||
    decoded.includes("/") ||
    decoded.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  );
}

/**
 * Builds the backend URL from API_URL plus the path segments only. Returns
 * null when any segment could climb out of the path or change the target.
 */
export function buildTargetUrl(
  apiUrl: string,
  segments: string[],
  search: string,
): string | null {
  if (segments.length === 0 || segments.some(isUnsafeSegment)) return null;
  const base = apiUrl.replace(/\/+$/, "");
  const query = search && search !== "?" ? search : "";
  return `${base}/${segments.join("/")}${query}`;
}
