import { expect } from 'vitest';

import { Prisma } from '../../src/generated/prisma/client.js';

interface DriverAdapterErrorMeta {
  cause?: { originalMessage?: string };
}

function violatedConstraint(error: unknown): string | undefined {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return undefined;
  }
  const adapterError = error.meta?.driverAdapterError as DriverAdapterErrorMeta | undefined;
  return /constraint "([^"]+)"/.exec(adapterError?.cause?.originalMessage ?? '')?.[1];
}

export async function expectViolation(write: Promise<unknown>, constraint: string): Promise<void> {
  const error = await write.then(
    () => undefined,
    (rejection: unknown) => rejection,
  );
  expect(violatedConstraint(error), String(error)).toBe(constraint);
}
