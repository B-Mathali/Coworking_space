const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf']);
const THREE_DECIMAL = new Set(['bhd', 'jod', 'kwd', 'omr', 'tnd']);

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface PriceBreakdown {
  unitPrice: number;
  hours: number;
  amountHT: number;
  vatRate: number;
  vatAmount: number;
  amountTTC: number;
}

/**
 * Prix HT = heures × tarif horaire, puis TVA. Tout est arrondi au centime :
 * pour le dinar (3 décimales), Stripe exige de toute façon un multiple de 10 millimes.
 */
export function computePrice(pricePerHour: number, start: Date, end: Date, vatRate: number): PriceBreakdown {
  const hours = round2((end.getTime() - start.getTime()) / 3_600_000);
  const amountHT = round2(hours * pricePerHour);
  const vatAmount = round2(amountHT * vatRate);
  return {
    unitPrice: pricePerHour,
    hours,
    amountHT,
    vatRate,
    vatAmount,
    amountTTC: round2(amountHT + vatAmount),
  };
}

/** Montant dans la plus petite unité de la devise, comme l'attend Stripe (centimes, millimes…). */
export function toMinorUnits(amount: number, currency: string): number {
  const c = currency.toLowerCase();
  if (ZERO_DECIMAL.has(c)) return Math.round(amount);
  if (THREE_DECIMAL.has(c)) return Math.round(amount * 100) * 10;
  return Math.round(amount * 100);
}
