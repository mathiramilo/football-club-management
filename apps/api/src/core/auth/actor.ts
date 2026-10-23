import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';

import type { RequestContext } from '../request-context.js';

export interface Actor {
  userId: string;
  sessionId: string;
}

export const CurrentActor = createParamDecorator((): Actor => {
  const actor = ClsServiceManager.getClsService<RequestContext>().get('actor');
  if (!actor) throw new UnauthorizedException();
  return actor;
});
