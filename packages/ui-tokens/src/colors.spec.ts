import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { colors } from './colors';

const themeCss = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

describe('colors', () => {
  it.each(Object.entries(colors))('matches theme.css for %s', (name, value) => {
    const variable = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

    expect(themeCss).toContain(`--color-${variable}: ${value};`);
  });
});
