export interface ClubRoles {
  isAdmin: boolean;
  categories: readonly { staffRole: string | null }[];
}

// UX § 3.2–3.3: Club Admins and anyone with a staff role in a current category get the staff
// navigation; everyone else gets the player one.
export function usesStaffNavigation({ isAdmin, categories }: ClubRoles): boolean {
  return isAdmin || categories.some(({ staffRole }) => staffRole !== null);
}
