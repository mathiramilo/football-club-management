import { z } from 'zod';

export type PayloadShape = Record<string, z.ZodType<string | number | boolean | null>>;

export interface DomainEvent<
  Type extends string = string,
  Shape extends PayloadShape = PayloadShape,
> {
  readonly type: Type;
  readonly payload: z.ZodObject<Shape, z.core.$strict>;
}

export type DomainEventPayload<Event extends DomainEvent> = z.output<Event['payload']>;

export function domainEvent<const Type extends `${string}.${string}`, Shape extends PayloadShape>(
  type: Type,
  shape: Shape,
): DomainEvent<Type, Shape> {
  return { type, payload: z.strictObject(shape) };
}
