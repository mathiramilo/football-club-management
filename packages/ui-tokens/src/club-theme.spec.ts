import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { clubTheme, clubThemeVariables, neutralClubColor } from './club-theme';

const themeCss = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(first: string, second: string): number {
  const [a, b] = [luminance(first), luminance(second)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('clubTheme', () => {
  it.each([null, undefined, '', 'purple', '#4a238', '#4a2380ff'])(
    'falls back to the app neutral for %j',
    (input) => {
      expect(clubTheme(input)).toEqual({ club: '#1b1b1f', clubTint: '#dfdfe0' });
    },
  );

  it('keeps a readable club color and mixes its tint with 86% white', () => {
    expect(clubTheme('#4A2380')).toEqual({ club: '#4a2380', clubTint: '#e6e0ed' });
  });

  it.each(['#FFD700', '#F5F5F5', '#7EC8E3', '#FFFFFF', '#E30613'])(
    'darkens %s until club text reads on the tint and white text reads on the club',
    (input) => {
      const { club, clubTint } = clubTheme(input);

      expect(contrast(club, clubTint)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(club, '#ffffff')).toBeGreaterThanOrEqual(4.5);
      expect(contrast(club, clubTint)).toBeLessThan(5);
    },
  );

  it('exposes the theme as the CSS variables the token sheet reads', () => {
    expect(clubThemeVariables(clubTheme('#1f3b8c'))).toEqual({
      '--club': '#1f3b8c',
      '--club-tint': '#e0e4ef',
    });
  });

  it('matches the defaults in theme.css', () => {
    const neutral = clubTheme(null);

    expect(neutral.club).toBe(neutralClubColor);
    expect(themeCss).toContain(`--club: ${neutral.club};`);
    expect(themeCss).toContain(`--club-tint: ${neutral.clubTint};`);
  });
});
