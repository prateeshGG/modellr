import { describe, it, expect } from 'vitest';
import { normalizeDonateUrl } from '../src/config';

describe('normalizeDonateUrl', () => {
  it('accepts Buy Me a Coffee page links', () => {
    expect(normalizeDonateUrl('https://buymeacoffee.com/someone')).toBe('https://buymeacoffee.com/someone');
    expect(normalizeDonateUrl('https://www.buymeacoffee.com/someone')).toContain('/someone');
    expect(normalizeDonateUrl('  https://bmc.link/someone  ')).toContain('/someone');
  });

  it('hides the button when unset or empty', () => {
    expect(normalizeDonateUrl('')).toBe('');
    expect(normalizeDonateUrl(undefined)).toBe('');
    expect(normalizeDonateUrl('   ')).toBe('');
  });

  it('rejects anything that is not an https Buy Me a Coffee page', () => {
    expect(normalizeDonateUrl('javascript:alert(1)')).toBe('');
    expect(normalizeDonateUrl('http://buymeacoffee.com/someone')).toBe('');
    expect(normalizeDonateUrl('https://evil.example/buymeacoffee.com/someone')).toBe('');
    expect(normalizeDonateUrl('https://buymeacoffee.com.evil.example/someone')).toBe('');
    expect(normalizeDonateUrl('https://buymeacoffee.com/')).toBe('');
    expect(normalizeDonateUrl('not a url')).toBe('');
  });
});
