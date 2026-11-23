export interface PersonName {
  firstName: string;
  lastName: string;
  nickname?: string | null;
}

// BR-AUTH-07: the nickname, otherwise the first name and the last-name initial ("Nicolás P.").
export function displayName({ firstName, lastName, nickname }: PersonName): string {
  const alias = nickname?.trim();
  if (alias) return alias;
  const first = firstName.trim();
  const [initial] = Array.from(lastName.trim());
  return initial ? `${first} ${initial.toLocaleUpperCase('es')}.` : first;
}
