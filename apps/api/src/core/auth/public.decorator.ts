import { applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiExtension } from '@nestjs/swagger';

export const PublicRoute = Reflector.createDecorator<undefined, true>({ transform: () => true });

export const PUBLIC_OPERATION_EXTENSION = 'x-public';

export const Public = () =>
  applyDecorators(PublicRoute(), ApiExtension(PUBLIC_OPERATION_EXTENSION, true));
