import { locale } from '@/i18n/locale';

export const clubCountries = ['UY', 'AR'] as const;
export type ClubCountry = (typeof clubCountries)[number];

const countryTimeZones: Record<ClubCountry, readonly [string, ...string[]]> = {
  UY: ['America/Montevideo'],
  AR: ['America/Argentina/Buenos_Aires', 'America/Buenos_Aires'],
};

export const countryName = (country: ClubCountry) =>
  new Intl.DisplayNames([locale], { type: 'region' }).of(country) ?? country;

export const deviceTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const countryOfTimeZone = (timeZone: string) =>
  clubCountries.find(
    (country) =>
      countryTimeZones[country].includes(timeZone) ||
      (country === 'AR' && timeZone.startsWith('America/Argentina/')),
  );

export function defaultLocation(): { countryCode: ClubCountry; timezone: string } {
  const timezone = deviceTimeZone();
  const country = countryOfTimeZone(timezone);
  if (country) return { countryCode: country, timezone };
  return { countryCode: 'UY', timezone };
}

export const countryTimeZone = (country: ClubCountry, current: string) =>
  countryOfTimeZone(current) === country ? current : countryTimeZones[country][0];

export const timeZoneOptions = (current: string) => [
  ...new Set([current, deviceTimeZone(), ...clubCountries.map((c) => countryTimeZones[c][0])]),
];

export function timeZoneParts(timeZone: string) {
  const zone =
    new Intl.DateTimeFormat(locale, { timeZone, timeZoneName: 'longGeneric' })
      .formatToParts(new Date())
      .find(({ type }) => type === 'timeZoneName')?.value ?? timeZone;
  const city = timeZone.slice(timeZone.lastIndexOf('/') + 1).replaceAll('_', ' ');
  return { zone: zone.charAt(0).toLocaleUpperCase(locale) + zone.slice(1), city };
}
