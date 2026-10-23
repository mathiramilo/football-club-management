import { createParamDecorator, UnauthorizedException } from '@nestjs/common';
import { type ClsStore, ClsServiceManager } from 'nestjs-cls';

export interface Actor {
  userId: string;
  sessionId: string;
}

export interface RequestContext extends ClsStore {
  actor?: Actor;
}

export const CurrentActor = createParamDecorator((): Actor => {
  const actor = ClsServiceManager.getClsService<RequestContext>().get('actor');
  if (!actor) throw new UnauthorizedException();
  return actor;
});
