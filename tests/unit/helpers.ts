/** A local date-time (this machine's time zone) as an ISO timestamp. */
export const local = (date: string, h = 12, m = 0) => {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(y, mo - 1, d, h, m).toISOString();
};

/** Every date from `from` to `to` inclusive, leaving out `skip`. */
export const days = (from: string, to: string, skip: string[] = []) => {
  const out: string[] = [];
  const [y, m, d] = from.split("-").map(Number);
  for (let date = new Date(y, m - 1, d); ; date.setDate(date.getDate() + 1)) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    if (key > to) break;
    if (!skip.includes(key)) out.push(key);
  }
  return out;
};
