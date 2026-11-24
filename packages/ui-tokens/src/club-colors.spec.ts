import { describe, expect, it } from 'vitest';

import { clubColorSwatches } from './club-colors';

describe('clubColorSwatches', () => {
  it.each(Object.entries(clubColorSwatches))('stores %s as a lowercase #rrggbb', (_name, value) => {
    expect(value).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('has no duplicate colors', () => {
    const values = Object.values(clubColorSwatches);

    expect(new Set(values).size).toBe(values.length);
  });
});
