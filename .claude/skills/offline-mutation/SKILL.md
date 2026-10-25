---
name: offline-mutation
description: Make a mobile write work offline with TanStack Query paused mutations persisted to MMKV - Idempotency-Key per action, optimistic update, resume after app restart, sync-state UI and error rollback. Use for RSVP, bulk RSVP, roll call, wellness check-ins and routine logs (NFR-OFF-01), or any new mobile mutation that must survive no connectivity.
argument-hint: <mutation, e.g. own RSVP> [story ID]
---

# Offline mutation (mobile)

Specs: NFR-OFF-01–03, `docs/tech/01-architecture-overview.md` § 6.8, ADR-016, BR-EVT-21 (roll call conflicts). The shared setup (persister, online manager, resume on hydrate) is built once in TECH-08; this skill adds one mutation to it.

## How it works

1. The user acts → the mutation is created with its variables, **including an `Idempotency-Key` generated at that moment**.
2. No connection → TanStack Query pauses the mutation (`networkMode: 'online'`) and the persister writes it to MMKV with the query cache.
3. The app restarts → the cache and paused mutations are restored. A mutation function can't be serialized, so it comes from **mutation defaults registered by key** before the restore.
4. After the restore, and whenever connectivity returns, `resumePausedMutations()` sends them. The server replays the stored result if the same key arrives twice.

## 1. Register defaults for the mutation key

Register at startup, before `PersistQueryClientProvider` restores, in the feature's `mutations.ts`:

```ts
export const ownRsvpKey = ['events', 'rsvp', 'own'] as const;

export type OwnRsvpVariables = {
  clubId: string;
  eventId: string;
  body: UpdateOwnRsvpBody;
  idempotencyKey: string;
};

queryClient.setMutationDefaults(ownRsvpKey, {
  mutationFn: ({ clubId, eventId, body, idempotencyKey }: OwnRsvpVariables) =>
    updateOwnRsvp(clubId, eventId, body, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  onMutate: async (variables: OwnRsvpVariables) => {
    const key = getEventQueryKey(variables.clubId, variables.eventId);
    await queryClient.cancelQueries({ queryKey: key });
    const previous = queryClient.getQueryData(key);
    queryClient.setQueryData(key, applyOwnRsvp(previous, variables.body));
    return { previous, key };
  },
  onError: (error, _variables, context) => {
    if (context && isProblem(error)) {
      queryClient.setQueryData(context.key, context.previous);
    }
  },
  onSettled: (_data, _error, variables) =>
    queryClient.invalidateQueries({
      queryKey: getEventQueryKey(variables.clubId, variables.eventId),
    }),
});
```

`updateOwnRsvp`, `getEventQueryKey` and `UpdateOwnRsvpBody` come from `packages/api-client` and `packages/contracts`. Adapt names to the generated output.

## 2. Use it in the screen

```ts
const rsvp = useMutation<RsvpResponse, unknown, OwnRsvpVariables>({ mutationKey: ownRsvpKey });

const confirm = (body: UpdateOwnRsvpBody) =>
  rsvp.mutate({ clubId, eventId, body, idempotencyKey: Crypto.randomUUID() });
```

Generate the key **once per user action** (`expo-crypto`), never inside `mutationFn`, so retries and replays reuse it.

## 3. Show sync state

Every offline-capable action shows its state: queued (paused), syncing (pending, not paused), failed with retry.

```ts
const states = useMutationState({
  filters: { mutationKey: ownRsvpKey },
  select: (mutation) => ({
    eventId: (mutation.state.variables as OwnRsvpVariables).eventId,
    status: mutation.state.status,
    isPaused: mutation.state.isPaused,
  }),
});
```

Copy comes from `packages/i18n` (for example "Se envía cuando vuelva la conexión").

## 4. Errors

| Error | Behavior |
|---|---|
| No connection | Stays paused; resumes automatically. Never discard. |
| problem+json business error (e.g. `RSVP_LOCKED`) | Roll back the optimistic update and show the localized `errors.<CODE>` message. Don't retry. |
| 409 on a versioned document | Refetch, show the current state, let the user redo the action. |
| 5xx or timeout | Retry with backoff (bounded), then show failed with a retry action. |

## 5. Shared setup checklist (TECH-08)

Built in TECH-08 (`apps/mobile/lib/query-client.ts`, `components/query-provider.tsx`, `app/_layout.tsx`):
- `onlineManager` follows `expo-network` and `focusManager` follows `AppState`;
- `PersistQueryClientProvider` with an MMKV persister, a 14-day `maxAge`, the app version as `buster`, and `onSuccess` resuming paused mutations;
- the splash screen stays up until the cache is restored; the session is read synchronously from SecureStore, so a cold start never flashes the sign-in screen;
- a 401 ends the session, and ending a session clears the cache with any queued writes (sign-out warns first when some are queued).

For each new mutation:
- register its defaults in `lib/query-client.ts` (or a module it imports), so they exist before the provider restores;
- the API endpoint requires and honors `Idempotency-Key` (`@RequiresIdempotencyKey()`).

## 6. Verify manually

No frontend tests (NFR-MAINT-02). On a device or emulator: go offline, act, see "queued", kill the app, reopen, go online, and confirm a single server write. Repeat with a business error to see the rollback.
