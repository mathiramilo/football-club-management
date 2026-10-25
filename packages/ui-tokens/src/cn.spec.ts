import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { cn, radii, shadows, textStyles } from './cn';

const themeCss = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

function themeNames(namespace: string): string[] {
  const pattern = new RegExp(`--${namespace}-([a-z-]+?): `, 'g');
  return [...themeCss.matchAll(pattern)]
    .map(([, name = '']) => name)
    .filter((name) => !name.includes('--'));
}

describe('cn', () => {
  it('knows every text style, radius and shadow in theme.css', () => {
    expect(textStyles).toEqual(themeNames('text'));
    expect(radii).toEqual(themeNames('radius'));
    expect(shadows).toEqual(themeNames('shadow'));
  });

  it('keeps a text style next to a text color', () => {
    expect(cn('text-title text-foreground')).toBe('text-title text-foreground');
  });

  it('lets the later text style, radius or shadow win', () => {
    expect(cn('text-body', 'text-meta')).toBe('text-meta');
    expect(cn('rounded-card', 'rounded-full')).toBe('rounded-full');
    expect(cn('shadow-card', 'shadow-raised')).toBe('shadow-raised');
  });
});
