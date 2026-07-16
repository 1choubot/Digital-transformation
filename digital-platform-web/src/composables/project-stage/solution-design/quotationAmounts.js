function normalizeDecimal(value, { scale, fixed = false } = {}) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const pattern = new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${scale}})?$`);
  if (!pattern.test(text)) return null;

  const [integerPart, fractionalPart = ''] = text.split('.');
  const fraction = fractionalPart.padEnd(scale, '0');
  const normalizedFraction = fixed ? fraction : fraction.replace(/0+$/, '');
  return normalizedFraction ? `${integerPart}.${normalizedFraction}` : integerPart;
}

function parseDecimalToScaled(value, scale) {
  const normalized = normalizeDecimal(value, { scale, fixed: true });
  if (normalized === null) return null;
  const [integerPart, fractionalPart = ''] = normalized.split('.');
  return BigInt(integerPart) * 10n ** BigInt(scale) + BigInt(fractionalPart.padEnd(scale, '0'));
}

function formatScaledDecimal(value, scale) {
  const factor = 10n ** BigInt(scale);
  const integerPart = value / factor;
  const fractionalPart = (value % factor).toString().padStart(scale, '0');
  return scale ? `${integerPart}.${fractionalPart}` : integerPart.toString();
}

function roundHalfUpDivision(numerator, denominator) {
  return (numerator + denominator / 2n) / denominator;
}

const RMB_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const RMB_SECTION_UNITS = ['', '万', '亿', '兆'];
const RMB_DIGIT_UNITS = ['', '拾', '佰', '仟'];

function convertRmbSection(section) {
  let result = '';
  let zeroPending = false;
  let value = Number(section);

  for (let index = 0; index < 4; index += 1) {
    const digit = value % 10;
    if (digit === 0) {
      if (result) zeroPending = true;
    } else {
      result = `${RMB_DIGITS[digit]}${RMB_DIGIT_UNITS[index]}${zeroPending ? '零' : ''}${result}`;
      zeroPending = false;
    }
    value = Math.floor(value / 10);
  }

  return result;
}

export function parseAmountToCents(amountText) {
  return parseDecimalToScaled(amountText, 2);
}

export function formatRmbInteger(integerValue) {
  if (integerValue === 0n) return '零';

  const sections = [];
  let value = integerValue;
  while (value > 0n) {
    sections.push(Number(value % 10000n));
    value /= 10000n;
  }

  let result = '';
  let zeroPending = false;
  for (let index = sections.length - 1; index >= 0; index -= 1) {
    const section = sections[index];
    if (section === 0) {
      zeroPending = Boolean(result);
      continue;
    }

    const sectionText = convertRmbSection(section);
    const needsBridgeZero = zeroPending || (section < 1000 && Boolean(result));
    result += `${needsBridgeZero ? '零' : ''}${sectionText}${RMB_SECTION_UNITS[index]}`;
    zeroPending = false;
  }

  return result;
}

export function formatRmbUppercaseFromCents(totalCents) {
  const cents = BigInt(totalCents);
  const integerPart = cents / 100n;
  const decimalPart = cents % 100n;
  const jiao = Number(decimalPart / 10n);
  const fen = Number(decimalPart % 10n);
  const integerText = `${formatRmbInteger(integerPart)}元`;

  if (jiao === 0 && fen === 0) return `${integerText}整`;
  if (jiao === 0) return `${integerText}零${RMB_DIGITS[fen]}分`;
  return `${integerText}${RMB_DIGITS[jiao]}角${fen === 0 ? '' : `${RMB_DIGITS[fen]}分`}`;
}

export function formatRmbUppercaseFromAmount(amountText) {
  const cents = parseAmountToCents(amountText);
  return cents === null ? '' : formatRmbUppercaseFromCents(cents);
}

export function normalizeQuantity(value) {
  return normalizeDecimal(value, { scale: 4 });
}

export function normalizeUnitPrice(value) {
  return normalizeDecimal(value, { scale: 2, fixed: true });
}

export function roundMoney(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(text)) return null;

  const [integerPart, fractionalPart = ''] = text.split('.');
  const centsText = fractionalPart.slice(0, 2).padEnd(2, '0');
  const shouldRoundUp = Number(fractionalPart[2] || '0') >= 5;
  const cents = BigInt(integerPart) * 100n + BigInt(centsText) + (shouldRoundUp ? 1n : 0n);
  return formatScaledDecimal(cents, 2);
}

export function calculateLineAmount(quantity, unitPrice) {
  const quantityScaled = parseDecimalToScaled(quantity, 4);
  const unitPriceCents = parseDecimalToScaled(unitPrice, 2);
  if (quantityScaled === null || unitPriceCents === null) return null;

  const lineAmountCents = roundHalfUpDivision(quantityScaled * unitPriceCents, 10000n);
  return formatScaledDecimal(lineAmountCents, 2);
}

export function calculateTotalAmount(items = []) {
  if (!Array.isArray(items)) return '0.00';
  const totalCents = items.reduce((sum, item) => {
    const lineAmount = calculateLineAmount(item?.quantity, item?.unitPrice);
    if (lineAmount === null) return sum;
    return sum + parseDecimalToScaled(lineAmount, 2);
  }, 0n);
  return formatScaledDecimal(totalCents, 2);
}
