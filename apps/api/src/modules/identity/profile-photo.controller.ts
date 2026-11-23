import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type CreateProfilePhotoUploadBody,
  createProfilePhotoUploadBody,
  type ProfilePhotoUploadResponse,
  profilePhotoUploadResponse,
  type ProfileResponse,
  profileResponse,
  type SetProfilePhotoBody,
  setProfilePhotoBody,
} from '@repo/contracts';

import { type Actor, CurrentActor } from '../../core/auth/actor.js';
import { Can, Policies } from '../../core/authorization/policy.js';
import { ResponseSchema } from '../../core/contract/response-schema.decorator.js';
import { identityPolicies } from './identity.policy.js';
import { ProfileService } from './profile.service.js';
import { ProfilePhotoService } from './profile-photo.service.js';

@ApiTags('identity')
@Policies(identityPolicies)
@Controller('me/photo')
export class ProfilePhotoController {
  constructor(
    private readonly photos: ProfilePhotoService,
    private readonly profiles: ProfileService,
  ) {}

  @Post('uploads')
  @Can('identity.profile.update')
  @ResponseSchema(profilePhotoUploadResponse, { status: HttpStatus.CREATED })
  createUpload(
    @CurrentActor() actor: Actor,
    @Body({ schema: createProfilePhotoUploadBody }) body: CreateProfilePhotoUploadBody,
  ): Promise<ProfilePhotoUploadResponse> {
    return this.photos.createUpload(actor.userId, body);
  }

  @Put()
  @Can('identity.profile.update')
  @ResponseSchema(profileResponse)
  async set(
    @CurrentActor() actor: Actor,
    @Body({ schema: setProfilePhotoBody }) body: SetProfilePhotoBody,
  ): Promise<ProfileResponse> {
    await this.photos.set(actor.userId, body.uploadKey);
    return this.profiles.get(actor.userId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @Can('identity.profile.update')
  @ResponseSchema(profileResponse)
  async remove(@CurrentActor() actor: Actor): Promise<ProfileResponse> {
    await this.photos.remove(actor.userId);
    return this.profiles.get(actor.userId);
  }
}
