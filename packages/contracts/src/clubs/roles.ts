import { z } from 'zod';

export const staffRole = z.enum(['dt', 'coach']);

export type StaffRole = z.infer<typeof staffRole>;
