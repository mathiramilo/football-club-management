import type { ClsStore } from 'nestjs-cls';

import type { Actor } from './auth/actor.js';
import type { ClubActor } from './authorization/club-actor.js';
import type { ClientInfo } from './client/client-info.js';

export interface RequestContext extends ClsStore {
  actor?: Actor;
  clubActor?: ClubActor;
  client?: ClientInfo;
}
