type Rgb = readonly [number, number, number];

const white: Rgb = [255, 255, 255];
const black: Rgb = [0, 0, 0];
const neutral: Rgb = [0x1b, 0x1b, 0x1f];
const tintWhiteShare = 0.86;
const minimumContrast = 4.5;
const darkenStep = 0.01;

export const neutralClubColor = toHex(neutral);

export interface ClubTheme {
  club: string;
  clubTint: string;
}

export function clubTheme(primaryColor: string | null | undefined): ClubTheme {
  const base = parseHex(primaryColor) ?? neutral;
  let club = base;
  for (let share = darkenStep; !isReadable(club) && share <= 1; share += darkenStep) {
    club = mix(base, black, share);
  }
  return { club: toHex(club), clubTint: toHex(tintOf(club)) };
}

export function clubThemeVariables(theme: ClubTheme) {
  return { '--club': theme.club, '--club-tint': theme.clubTint };
}

// UX § 7.1: the club color carries white text and is also used as text on its own tint.
// The tint sits between the club color and white, so passing on the tint means passing on white.
function isReadable(club: Rgb): boolean {
  return contrast(club, tintOf(club)) >= minimumContrast;
}

function tintOf(club: Rgb): Rgb {
  return mix(club, white, tintWhiteShare);
}

function mix(from: Rgb, to: Rgb, share: number): Rgb {
  const channel = (index: 0 | 1 | 2) => Math.round(from[index] * (1 - share) + to[index] * share);
  return [channel(0), channel(1), channel(2)];
}

function contrast(a: Rgb, b: Rgb): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

function luminance([r, g, b]: Rgb): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function parseHex(value: string | null | undefined): Rgb | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value ?? '');
  if (!match) {
    return null;
  }
  const [, r = '', g = '', b = ''] = match;
  return [parseInt(r, 16), parseInt(g, 16), parseInt(b, 16)];
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
