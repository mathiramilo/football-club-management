import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { REQUEST_ID_HEADER } from '@repo/contracts';
import type { ClsMiddlewareOptions, ClsService, ClsStore } from 'nestjs-cls';

import type { Actor } from './auth/actor.js';
import type { ClubActor } from './authorization/club-actor.js';
import { type ClientInfo, clientInfoFrom } from './client/client-info.js';

export interface JobContext {
  id: string;
  queue: string;
}

export interface RequestContext extends ClsStore {
  actor?: Actor;
  clubActor?: ClubActor;
  client?: ClientInfo;
  job?: JobContext;
}

export const requestContextOptions = {
  generateId: true,
  idGenerator: () => randomUUID(),
  setup: (cls: ClsService<RequestContext>, request: IncomingMessage, response: ServerResponse) => {
    cls.set('client', clientInfoFrom(request.headers));
    response.setHeader(REQUEST_ID_HEADER, cls.getId());
  },
} satisfies ClsMiddlewareOptions;
