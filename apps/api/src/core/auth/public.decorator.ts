import { Reflector } from '@nestjs/core';

export const Public = Reflector.createDecorator<undefined, true>({ transform: () => true });
