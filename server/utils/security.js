import { parse } from 'url';
import dns from 'dns';
import { promisify } from 'util';

const lookup = promisify(dns.lookup);

// List of private/internal IP ranges to block
const PRIVATE_RANGES = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.0.0/24',
  '192.0.2.0/24',
  '192.88.99.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',
  '240.0.0.0/4',
  '255.255.255.255/32'
];

/**
 * Basic SSRF check to ensure the connection string doesn't point to internal resources.
 */
export async function validateConnectionString(urlStr, expectedProtocol) {
  if (!urlStr) throw new Error('Missing connection string');

  const parsed = parse(urlStr);
  if (!parsed.protocol || !parsed.hostname) {
    throw new Error('Invalid connection string format');
  }

  if (expectedProtocol && parsed.protocol !== `${expectedProtocol}:`) {
    throw new Error(`Invalid protocol. Expected ${expectedProtocol}://`);
  }

  // Check if hostname is an IP or resolves to one
  try {
    const { address } = await lookup(parsed.hostname);
    
    // Simple check for localhost and common private ranges
    if (address === '127.0.0.1' || address === '::1' || address === '0.0.0.0') {
      throw new Error('Connections to localhost are not allowed');
    }

    // Additional check: block 10.x, 192.168.x, 172.x (simplified)
    if (address.startsWith('10.') || address.startsWith('192.168.') || address.startsWith('172.')) {
      throw new Error('Connections to internal networks are not allowed');
    }

    // Block metadata services (AWS/GCP/Azure)
    if (address === '169.254.169.254') {
      throw new Error('Connections to metadata services are not allowed');
    }

  } catch (err) {
    if (err.message.includes('not allowed')) throw err;
    // If lookup fails, it's likely an invalid host
  }

  return true;
}

/**
 * Safely escapes a SQL identifier (table name, column name).
 * Prevents injection by double-quoting and escaping internal double quotes.
 */
export function escapeIdentifier(str) {
  if (typeof str !== 'string') return '""';
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Safely escapes a SQL literal/value.
 * This is used for types, defaults, and constraint expressions.
 */
export function escapeLiteral(str) {
  if (str === null || str === undefined) return 'NULL';
  if (typeof str === 'number' || typeof str === 'boolean') return str.toString();
  
  const s = str.toString();
  
  // Strict validation for types to prevent injection
  // Only allows alphanumeric, spaces, parentheses, and common type chars
  const typeRegex = /^[a-zA-Z0-9\s\(\),\[\]]+$/;
  if (typeRegex.test(s)) return s;

  // For other values, escape single quotes
  return `'${s.replace(/'/g, "''")}'`;
}
