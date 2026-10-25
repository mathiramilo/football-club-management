export const nameOf = (error: unknown) => (error instanceof Error ? error.name : typeof error);

// Error messages can carry request data (Prisma prints the query arguments), so only frames are kept.
export const framesOf = (error: unknown) => {
  if (!(error instanceof Error) || error.stack === undefined) return undefined;
  const firstFrame = error.stack.indexOf('\n    at ');
  return firstFrame === -1 ? undefined : error.stack.slice(firstFrame + 1);
};
