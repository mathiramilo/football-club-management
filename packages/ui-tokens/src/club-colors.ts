// Common kit colors offered when a club picks its colors (BR-CLUB-01). Any #rrggbb is accepted.
export const clubColorSwatches = {
  red: '#c8102e',
  maroon: '#7a1f2b',
  orange: '#f26b1d',
  yellow: '#f4c300',
  green: '#00843d',
  skyBlue: '#6cace4',
  blue: '#0033a0',
  violet: '#5b2c86',
  black: '#111114',
  white: '#ffffff',
} as const;

export type ClubColorSwatch = keyof typeof clubColorSwatches;
