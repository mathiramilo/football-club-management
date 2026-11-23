import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type ProfileResponse,
  profileResponse,
  type UpdateProfileBody,
  updateProfileBody,
} from '@repo/contracts';

import { type Actor, CurrentActor } from '../../core/auth/actor.js';
import { Can, Policies } from '../../core/authorization/policy.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import { identityPolicies } from './identity.policy.js';
import { ProfileService } from './profile.service.js';

@ApiTags('identity')
@Policies(identityPolicies)
@Controller('me')
export class ProfileController {
  constructor(private readonly profiles: ProfileService) {}

  @Get()
  @Can('identity.profile.read')
  @ResponseSchema(profileResponse)
  get(@CurrentActor() actor: Actor): Promise<ProfileResponse> {
    return this.profiles.get(actor.userId);
  }

  @Patch()
  @Can('identity.profile.update')
  @ResponseSchema(profileResponse)
  update(
    @CurrentActor() actor: Actor,
    @Body({ schema: updateProfileBody }) body: UpdateProfileBody,
  ): Promise<ProfileResponse> {
    return this.profiles.update(actor.userId, body);
  }
}
