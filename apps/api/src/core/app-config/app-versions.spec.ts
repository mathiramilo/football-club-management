import { describe, expect, it } from 'vitest';

import { compareAppVersions } from './app-versions.js';

describe('compareAppVersions (TECH-14)', () => {
  it.each([
    { a: '1.3.0', b: '1.3.0', expected: 0 },
    { a: '1.2.9', b: '1.3.0', expected: -1 },
    { a: '1.10.0', b: '1.9.0', expected: 1 },
    { a: '2.0.0', b: '1.99.99', expected: 1 },
    { a: '1.3.1', b: '1.3.0', expected: 1 },
    { a: '1.4.0-beta.2', b: '1.4.0', expected: -1 },
    { a: '1.4.0', b: '1.4.0-rc.1', expected: 1 },
    { a: '1.4.0-beta.2', b: '1.3.9', expected: 1 },
    { a: '1.4.0-alpha', b: '1.4.0-alpha.1', expected: -1 },
    { a: '1.4.0-alpha.1', b: '1.4.0-alpha.beta', expected: -1 },
    { a: '1.4.0-beta.2', b: '1.4.0-beta.11', expected: -1 },
    { a: '1.4.0-rc.1', b: '1.4.0-beta.11', expected: 1 },
    { a: '1.4.0+build.7', b: '1.4.0', expected: 0 },
  ])('orders $a against $b as $expected', ({ a, b, expected }) => {
    expect(compareAppVersions(a, b)).toBe(expected);
  });

  it('refuses a value that is not a semantic version', () => {
    expect(() => compareAppVersions('1.3', '1.3.0')).toThrow();
  });
});
