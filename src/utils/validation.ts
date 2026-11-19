/**
 * Verbatim validation constants synchronized with firebase-blueprint.json & firestore.rules.
 */
export const ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const FIELD_LIMITS = {
  id: 128,
  displayName: 120,
  email: 200,
  companyName: 160,
  location: 200,
  gstNumber: 32,
  departmentName: 120,
  departmentCode: 24,
  supplierName: 160,
  category: 80,
  phone: 40,
  city: 100,
  sku: 64,
  itemName: 160,
  unit: 24,
  code: 64,
  productName: 160,
  parametersChecked: 500,
  defectCategory: 120,
  correctiveAction: 500,
  reason: 240,
  title: 160,
  framework: 80,
  message: 1500,
  summary: 2000,
  recommendedAction: 1500,
  auditDetails: 600,
} as const;

export function sanitizeId(raw: string): string {
  const cleaned = raw.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return cleaned.slice(0, FIELD_LIMITS.id) || `rec_${Date.now()}`;
}

export function generateRecordId(prefix: string): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || 'rec';
  const rand = Math.random().toString(36).slice(2, 8);
  return `${safePrefix}_${Date.now()}_${rand}`;
}

export function clampText(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length >= 3 && trimmed.length <= FIELD_LIMITS.email && EMAIL_PATTERN.test(trimmed);
}

export function validatePositiveNumber(val: number, fieldLabel: string): string | null {
  if (!Number.isFinite(val) || val < 0) {
    return `${fieldLabel} must be zero or a positive number.`;
  }
  return null;
}
