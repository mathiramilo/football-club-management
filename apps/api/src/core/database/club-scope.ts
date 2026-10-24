import { Prisma } from '../../generated/prisma/client.js';

export interface ClubContext {
  readonly clubId: string;
}

export const CLUB_OWNED_MODELS = [
  'Category',
  'ClubMembership',
  'CategoryMembership',
  'Venue',
  'Event',
  'EventCategory',
  'EventInvitee',
  'RsvpChange',
] as const satisfies readonly Prisma.ModelName[];

export type ClubOwnedModel = (typeof CLUB_OWNED_MODELS)[number];

export class ClubScopeViolation extends Error {
  constructor(model: string, operation: string) {
    super(`${model}.${operation} would read or write outside its club`);
    this.name = 'ClubScopeViolation';
  }
}

type Fields = Record<string, unknown>;

const clubOwnedModels = new Set<string>(CLUB_OWNED_MODELS);

function scopedWhere(where: unknown, filter: Fields): Fields {
  const scoped: Fields = { ...(where as Fields | undefined) };
  const existing = scoped.AND;
  scoped.AND = [
    filter,
    ...(existing === undefined
      ? []
      : Array.isArray(existing)
        ? (existing as unknown[])
        : [existing]),
  ];
  return scoped;
}

function scopeClubArgs(operation: string, args: Fields, clubId: string): Fields {
  switch (operation) {
    case 'create':
    case 'createMany':
    case 'createManyAndReturn':
    case 'upsert':
      throw new ClubScopeViolation('Club', operation);
    default:
      if ((args.data as Fields | undefined)?.id !== undefined)
        throw new ClubScopeViolation('Club', operation);
      return { ...args, where: scopedWhere(args.where, { id: clubId }) };
  }
}

function scopeArgs(model: string, operation: string, args: Fields, clubId: string): Fields {
  if (model === 'Club') return scopeClubArgs(operation, args, clubId);
  if (!clubOwnedModels.has(model)) return args;

  const stamp = (data: unknown): Fields => {
    const row = data as Fields;
    if (row.clubId !== undefined && row.clubId !== clubId)
      throw new ClubScopeViolation(model, operation);
    return { ...row, clubId };
  };
  const unchanged = (data: unknown): unknown => {
    if ((data as Fields | undefined)?.clubId !== undefined)
      throw new ClubScopeViolation(model, operation);
    return data;
  };
  const where = scopedWhere(args.where, { clubId });

  switch (operation) {
    case 'create':
      return { ...args, data: stamp(args.data) };
    case 'createMany':
    case 'createManyAndReturn':
      return { ...args, data: Array.isArray(args.data) ? args.data.map(stamp) : stamp(args.data) };
    case 'upsert':
      return { ...args, where, create: stamp(args.create), update: unchanged(args.update) };
    case 'update':
    case 'updateMany':
    case 'updateManyAndReturn':
      return { ...args, where, data: unchanged(args.data) };
    default:
      return { ...args, where };
  }
}

export const clubScope = (club: ClubContext) =>
  Prisma.defineExtension({
    name: 'club-scope',
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          return query(scopeArgs(model, operation, args, club.clubId));
        },
      },
    },
  });
