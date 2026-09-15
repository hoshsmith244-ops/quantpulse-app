/** Signed percentage, e.g. +4.82% */
export const fmtPct = (n: number, digits = 2) =>
  `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;

/** Unsigned percentage, e.g. 53.0% */
export const fmtPctPlain = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

export const fmtNum = (n: number, digits = 2) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

export const fmtInt = (n: number) => n.toLocaleString("en-US");

export const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
