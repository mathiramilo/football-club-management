import { z } from 'zod';

import { domainEvent } from '../../../core/outbox/domain-event.js';

// TODO(EVT-01): the events module subscribes to invite the player to the category's events that
// haven't started (BR-CLUB-05, BR-EVT-03).
export const categoryMembershipStarted = domainEvent('clubs.category_membership_started', {
  clubId: z.uuid(),
  categoryId: z.uuid(),
  clubMembershipId: z.uuid(),
  categoryMembershipId: z.uuid(),
  startsOn: z.iso.date(),
});
