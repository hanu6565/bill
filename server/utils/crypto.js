import crypto from 'crypto';

// Use a 32-byte key from env or a secure fixed key for local encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, 'hex') 
  : crypto.scryptSync('restaurant-payroll-master-secret-key-2026', 'salt', 32);
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a plain text string (e.g. Resident Registration Number)
 * @param {string} text 
 * @returns {string} iv:authTag:encryptedHex
 */
export function encryptText(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt encrypted string
 * @param {string} encryptedString 
 * @returns {string} plain text
 */
export function decryptText(encryptedString) {
  if (!encryptedString) return '';
  try {
    const parts = encryptedString.split(':');
    if (parts.length !== 3) return encryptedString; // Fallback if plain
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return '******-*******';
  }
}

/**
 * Mask Resident Registration Number (주민등록번호 마스킹)
 * Format: 900101-1****** or 900101-1234567 -> 900101-1******
 * @param {string} rrn 
 * @returns {string}
 */
export function maskRRN(rrn) {
  if (!rrn) return '';
  const clean = rrn.replace(/[^0-9]/g, '');
  if (clean.length === 13) {
    return `${clean.substring(0, 6)}-${clean.substring(6, 7)}******`;
  }
  if (rrn.includes('-')) {
    const [first, second] = rrn.split('-');
    if (second && second.length > 0) {
      return `${first}-${second[0]}${'*'.repeat(Math.max(6, second.length - 1))}`;
    }
  }
  return rrn.length > 7 ? `${rrn.substring(0, 7)}******` : '******-*******';
}
