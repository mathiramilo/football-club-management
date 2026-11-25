import { createHash, createHmac, randomInt } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { Env } from '../../core/config/env.js';

const TOKEN_BYTES = 16;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;
// AUTH-07: codes avoid characters people confuse, such as 0/O and 1/I.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

// Invite tokens are stored hashed (data model § 1), yet staff copy a link again at any time (CLUB-05):
// the token is an HMAC of the link id, so the API can recompute it and a database leak alone reveals none.
@Injectable()
export class InviteTokens {
  private readonly secret: string;

  constructor(config: ConfigService<Env, true>) {
    this.secret = config.get('INVITE_LINK_SECRET', { infer: true });
  }

  tokenOf(linkId: string): string {
    return createHmac('sha256', this.secret)
      .update(`invite-link:${linkId}`)
      .digest()
      .subarray(0, TOKEN_BYTES)
      .toString('base64url');
  }

  hashOf(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  isWellFormed(token: string): boolean {
    return TOKEN_PATTERN.test(token);
  }

  newCode(): string {
    return Array.from(
      { length: CODE_LENGTH },
      () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)],
    ).join('');
  }
}
