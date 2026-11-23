export interface NameParts {
  firstName: string;
  lastName: string;
}

export function splitProviderName(name: string): NameParts {
  const [firstName = '', ...rest] = name.trim().split(/\s+/);
  return { firstName, lastName: rest.join(' ') };
}
