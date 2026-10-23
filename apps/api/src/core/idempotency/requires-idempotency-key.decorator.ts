import { applyDecorators } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiHeader } from '@nestjs/swagger';

export const IdempotencyKeyRequired = Reflector.createDecorator<undefined, true>({
  transform: () => true,
});

export const RequiresIdempotencyKey = () =>
  applyDecorators(
    IdempotencyKeyRequired(),
    ApiHeader({
      name: 'Idempotency-Key',
      required: true,
      description: 'A UUID created when the user acts, reused on every retry of that action',
      schema: { type: 'string', format: 'uuid' },
    }),
  );
