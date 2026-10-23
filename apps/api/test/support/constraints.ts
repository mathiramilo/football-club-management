import { expect } from 'vitest';

import { Prisma } from '../../src/generated/prisma/client.js';

function violatedConstraint(error: unknown): string | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return undefined;
  }
  const text = `${error.message} ${JSON.stringify(error.meta ?? {})}`;
  return /constraint \\?"([^"\\]+)\\?"/.exec(text)?.[1];
}

export async function expectViolation(write: Promise<unknown>, constraint: string): Promise<void> {
  const error = await write.then(
    () => undefined,
    (rejection: unknown) => rejection,
  );
  expect(violatedConstraint(error), String(error)).toBe(constraint);
}
