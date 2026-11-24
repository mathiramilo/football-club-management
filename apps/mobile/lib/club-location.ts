export const clubCountries = ['UY', 'AR'] as const;
export type ClubCountry = (typeof clubCountries)[number];

const countryTimeZones: Record<ClubCountry, readonly [string, ...string[]]> = {
  UY: ['America/Montevideo'],
  AR: ['America/Argentina/Buenos_Aires', 'America/Buenos_Aires'],
};

const deviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
};

const countryOfTimeZone = (timeZone: string | undefined) =>
  timeZone === undefined
    ? undefined
    : clubCountries.find(
        (country) =>
          countryTimeZones[country].includes(timeZone) ||
          (country === 'AR' && timeZone.startsWith('America/Argentina/')),
      );

export function defaultLocation(): { countryCode: ClubCountry; timezone: string } {
  const timezone = deviceTimeZone();
  const country = countryOfTimeZone(timezone);
  if (country && timezone) return { countryCode: country, timezone };
  return { countryCode: 'UY', timezone: timezone ?? countryTimeZones.UY[0] };
}

export const countryTimeZone = (country: ClubCountry, current: string) =>
  countryOfTimeZone(current) === country ? current : countryTimeZones[country][0];

export const timeZoneOptions = (current: string) => [
  ...new Set(
    [
      current,
      deviceTimeZone(),
      ...clubCountries.map((country) => countryTimeZones[country][0]),
    ].filter((zone): zone is string => zone !== undefined),
  ),
];

export const timeZoneCity = (timeZone: string) =>
  timeZone.slice(timeZone.lastIndexOf('/') + 1).replaceAll('_', ' ');
