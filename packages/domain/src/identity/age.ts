export const MINIMUM_AGE = 16;
export const ADULT_AGE = 18;

export type AgeStatus = 'under_minimum' | 'minor' | 'adult';

const localDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseLocalDate = (date: string) => {
  const match = localDatePattern.exec(date);
  if (!match) throw new RangeError('Expected a YYYY-MM-DD date');
  const [, year, month, day] = match;
  return { year: Number(year), month: Number(month), day: Number(day) };
};

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export function ageOn(birthdate: string, today: string): number {
  const birth = parseLocalDate(birthdate);
  const now = parseLocalDate(today);
  // Someone born on 29 February has their birthday on the 28th in common years, as with date-fns addYears.
  const birthdayThisYear =
    birth.month === 2 && birth.day === 29 && !isLeapYear(now.year) ? 28 : birth.day;
  const hadBirthday =
    now.month > birth.month || (now.month === birth.month && now.day >= birthdayThisYear);
  return now.year - birth.year - (hadBirthday ? 0 : 1);
}

// BR-AUTH-05: accounts start at 16; 16–17 are minors until they turn 18.
export function ageStatus(birthdate: string, today: string): AgeStatus {
  const age = ageOn(birthdate, today);
  if (age < MINIMUM_AGE) return 'under_minimum';
  return age < ADULT_AGE ? 'minor' : 'adult';
}
