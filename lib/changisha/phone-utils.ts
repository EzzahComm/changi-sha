/**
 * Phone number utilities for Changisha
 *
 * [INVARIANT I7] MSISDN normalization: all phone numbers stored as 254-prefixed
 * Supports Kenya (KE) format: 07xxx or +2547xxx
 */

/**
 * Normalize a Kenyan phone number to E.164 format (254-prefixed)
 *
 * Examples:
 * - "0712345678" → "254712345678"
 * - "+254712345678" → "254712345678"
 * - "254712345678" → "254712345678"
 */
export function normalizeKenyaPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  // Remove spaces and dashes
  let normalized = phone.trim().replace(/[\s-]/g, '');

  // If already 254-prefixed, return as-is
  if (normalized.startsWith('254') && normalized.length === 12) {
    return normalized;
  }

  // If has +, remove it
  if (normalized.startsWith('+254')) {
    return normalized.slice(1);
  }

  // If has +2547 (with plus), remove plus
  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1);
  }

  // If 07xxx format, convert to 2547xxx
  if (normalized.startsWith('07') && normalized.length === 10) {
    return '254' + normalized.slice(1);
  }

  // If already 2547xxx format, return as-is
  if (normalized.startsWith('2547') && normalized.length === 12) {
    return normalized;
  }

  // Invalid format
  return null;
}

/**
 * Validate a normalized Kenyan phone number
 *
 * Returns true if phone is in format: 254[7-9]xxxxxxxxx (12 digits total)
 */
export function isValidKenyaPhone(phone: string): boolean {
  return /^254[7-9]\d{8}$/.test(phone);
}

/**
 * Mask a phone number for display (privacy)
 *
 * Example: "254712345678" → "+2547••••5678"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return '••••••••';
  }

  const normalized = normalizeKenyaPhone(phone);
  if (!normalized) {
    return '••••••••';
  }

  // Show first 3 chars (254) and last 4 digits
  const prefix = normalized.slice(0, 3);
  const suffix = normalized.slice(-4);
  return `+${prefix}••••${suffix}`;
}

/**
 * Extract phone number from various formats
 * Returns normalized 254-prefixed phone, or null if invalid
 */
export function extractPhone(phone: unknown): string | null {
  if (typeof phone === 'string') {
    return normalizeKenyaPhone(phone);
  }
  if (typeof phone === 'number') {
    return normalizeKenyaPhone(String(phone));
  }
  return null;
}

/**
 * Test helper: generate valid test phone numbers
 */
export function generateTestPhone(index: number = 1): string {
  // Generate 254712345678, 254712345679, etc.
  return `25471234${String(5678 + index).padStart(4, '0')}`;
}

export { };
