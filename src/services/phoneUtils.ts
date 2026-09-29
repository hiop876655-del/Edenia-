// Universal Phone Normalization Utility for Egyptian & International Phone Formats
// Ensures that 01121097822, +201121097822, 201121097822, and 1121097822 all resolve to the EXACT SAME merchant database ID

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  let digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return '';

  // E.g. 201121097822 -> 01121097822
  if (digits.startsWith('20') && digits.length === 12) {
    digits = '0' + digits.substring(2);
  }
  // E.g. 1121097822 -> 01121097822
  if (digits.length === 10 && (digits.startsWith('10') || digits.startsWith('11') || digits.startsWith('12') || digits.startsWith('15'))) {
    digits = '0' + digits;
  }
  return digits;
}
