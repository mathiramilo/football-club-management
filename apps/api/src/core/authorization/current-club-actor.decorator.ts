import { createParamDecorator } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

import type { RequestContext } from '../request-context.js';
import type { ClubActor } from './club-actor.js';

export const CurrentClubActor = createParamDecorator((): ClubActor => {
  const actor = ClsServiceManager.getClsService<RequestContext>().get('clubActor');
  if (!actor) throw new Error('@CurrentClubActor() needs a signed-in route with a :clubId');
  return actor;
});
