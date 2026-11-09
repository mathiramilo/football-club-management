import { Reflector } from '@nestjs/core';

export const BeforeLegalAcceptance = Reflector.createDecorator<undefined, true>({
  transform: () => true,
});
