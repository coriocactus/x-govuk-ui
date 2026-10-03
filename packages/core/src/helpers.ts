// The library's pure functions, together and without the client directive, so a server component
// can call them. From a client module they would be client references, which a server cannot call.

/** The three fields of a Date input, as typed. */
export type DateParts = { day: string; month: string; year: string };

/** The date the parts make, when they make a valid date. */
export function dateFromParts({ day, month, year }: DateParts) {
  const [d, m, y] = [day, month, year].map((part) => Number(part.trim()));
  if (!d || !m || !y || year.trim().length !== 4) return null;
  const date = new Date(y, m - 1, d);
  return date.getDate() === d && date.getMonth() === m - 1 ? date : null;
}

/** A date and time as GOV.UK writes them, such as 15 March 2026 at 4:27pm, or at midday. */
export function formatDateTime(date: Date) {
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const hours = date.getHours();
  const minutes = date.getMinutes();
  let time: string;
  if (minutes === 0 && hours === 12) time = "midday";
  else if (minutes === 0 && hours === 0) time = "midnight";
  else {
    const minute = minutes ? `:${String(minutes).padStart(2, "0")}` : "";
    time = `${hours % 12 || 12}${minute}${hours < 12 ? "am" : "pm"}`;
  }
  return `${day} at ${time}`;
}

/**
 * @internal Which way something turned, for a `data-direction` that drives its slide. Forward is
 * `next`, back is `previous`, and no turn yet is undefined.
 */
export function directionOf(direction: number): "next" | "previous" | undefined {
  if (direction > 0) return "next";
  if (direction < 0) return "previous";
  return undefined;
}

/**
 * The page numbers to show around the current page, with `null` for an ellipsis, in a fixed number
 * of slots. There are seven slots, or five where there is little room. A list of that many pages or
 * fewer shows every page. The number of slots never changes as the page does, so the pagination
 * keeps its width.
 */
export function pagesAround(page: number, pageCount: number, slots: 5 | 7 = 7): (number | null)[] {
  const pages = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, index) => from + index);
  if (pageCount <= slots) return pages(1, pageCount);
  if (slots === 5) {
    if (page <= 3) return [...pages(1, 3), null, pageCount];
    if (page >= pageCount - 2) return [1, null, ...pages(pageCount - 2, pageCount)];
    return [1, null, page, null, pageCount];
  }
  if (page <= 4) return [...pages(1, 5), null, pageCount];
  if (page >= pageCount - 3) return [1, null, ...pages(pageCount - 4, pageCount)];
  return [1, null, page - 1, page, page + 1, null, pageCount];
}

/** How strong a password is, from 0 for too short to 4 for strong, by its length and variety. */
export function passwordStrength(password: string) {
  if (password.length < 8) return 0;
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((kind) =>
    kind.test(password),
  ).length;
  return Math.min(4, Math.max(1, variety - 1 + (password.length >= 12 ? 1 : 0)));
}
