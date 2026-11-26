export interface RequiredProfileFields {
  firstName: string | null;
  lastName: string | null;
  birthdate: string | null;
}

// BR-AUTH-06: first name, last name and birthdate are required before using the product.
export const isProfileComplete = ({ firstName, lastName, birthdate }: RequiredProfileFields) =>
  firstName !== null && lastName !== null && birthdate !== null;
