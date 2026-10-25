import { Reflector } from '@nestjs/core';

export const AnyAppVersion = Reflector.createDecorator<undefined, true>({ transform: () => true });
