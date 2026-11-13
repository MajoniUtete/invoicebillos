/** Decimal-money helpers. Only non-negative decimal inputs are allowed here. */
export function decimalToMinor(value, scale = 2) {
  if (!Number.isInteger(scale) || scale < 0 || scale > 3) throw new RangeError('Unsupported currency scale');
  const raw = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) throw new TypeError('Invalid non-negative decimal amount');
  const [whole, fraction = ''] = raw.split('.');
  if (fraction.length > scale) throw new RangeError('Too many decimal places');
  return BigInt(whole) * 10n ** BigInt(scale) + BigInt((fraction.padEnd(scale, '0') || '0'));
}
export function minorToDecimal(minor, scale = 2) {
  if (typeof minor !== 'bigint' || minor < 0n) throw new TypeError('Invalid minor amount');
  if (!Number.isInteger(scale) || scale < 0 || scale > 3) throw new RangeError('Unsupported currency scale');
  const factor = 10n ** BigInt(scale);
  return scale === 0 ? minor.toString() : `${minor / factor}.${(minor % factor).toString().padStart(scale, '0')}`;
}
/** Half-up integer division; explicitly rejects negative values. */
export function divideRounded(numerator, denominator) {
  if (numerator < 0n || denominator <= 0n) throw new RangeError('Invalid ratio');
  return (numerator * 2n + denominator) / (2n * denominator);
}
/** Calculate each line in minor units, then tax; discount is a whole-invoice amount. */
export function calculateInvoice({ lines, taxBasisPoints = 0, discount = '0', scale = 2 }) {
  if (!Array.isArray(lines) || lines.length === 0) throw new TypeError('At least one line required');
  if (!Number.isInteger(taxBasisPoints) || taxBasisPoints < 0 || taxBasisPoints > 10000) throw new RangeError('Invalid tax rate');
  let subtotal = 0n;
  for (const line of lines) {
    const quantity = decimalToMinor(line.quantity, 2);
    if (quantity <= 0n) throw new RangeError('Quantity must be positive');
    subtotal += divideRounded(decimalToMinor(line.unitPrice, scale) * quantity, 100n);
  }
  const tax = divideRounded(subtotal * BigInt(taxBasisPoints), 10000n);
  const discountMinor = decimalToMinor(discount, scale);
  if (discountMinor > subtotal + tax) throw new RangeError('Discount exceeds invoice amount');
  return { subtotal: minorToDecimal(subtotal, scale), tax: minorToDecimal(tax, scale), discount: minorToDecimal(discountMinor, scale), total: minorToDecimal(subtotal + tax - discountMinor, scale) };
}

export function currencyScale(currency) {
  const supported = ['USD','EUR','GBP','ZAR','NGN','KES','GHS','EGP','AED','SAR','INR','CNY','JPY','CAD','AUD','CHF','SEK','NOK','DKK','NZD','SGD','HKD','BRL','MXN','TRY','ZiG'];
  if (!supported.includes(currency)) throw new RangeError('Unsupported currency');
  return currency === 'JPY' ? 0 : 2;
}
export function calculateFormInvoice(lines, taxPercent, discount, currency) {
  const basisPoints = decimalToMinor(taxPercent, 2);
  if (basisPoints > 10000n) throw new RangeError('Invalid tax rate');
  return calculateInvoice({ lines, taxBasisPoints: Number(basisPoints), discount, scale: currencyScale(currency) });
}
/** Invalid draft inputs have no monetary preview; saving reports the validation error. */
export function lineAmount(quantity, unitPrice, currency) {
  try { return calculateFormInvoice([{quantity,unitPrice}], '0', '0', currency).subtotal; }
  catch { return '—'; }
}
/** Never add different currencies without an explicit exchange-rate contract. */
export function currencyTotals(records) {
  const groups = new Map();
  for (const record of records) {
    const group = groups.get(record.currency) ?? {minor:0n,invalid:false};
    try { group.minor += decimalToMinor(record.total,currencyScale(record.currency)); }
    catch { group.invalid = true; }
    groups.set(record.currency,group);
  }
  return [...groups].sort(([a],[b])=>a.localeCompare(b)).map(([currency,group])=>group.invalid
    ? `${currency} unavailable`
    : `${currency} ${minorToDecimal(group.minor,currencyScale(currency))}`).join(' · ') || '—';
}
export function formatStoredMoney(currency, value) {
  if (value == null || value === '—') return '—';
  try {
    const scale=currencyScale(currency);
    return `${currency} ${minorToDecimal(decimalToMinor(value,scale),scale)}`;
  } catch {
    // Keep legacy values visible without assigning them an invented currency scale.
    return `${currency} ${String(value)}`;
  }
}
