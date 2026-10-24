import { randomUUID } from 'node:crypto';

import {
  Body,
  Controller,
  HttpStatus,
  type INestApplication,
  Injectable,
  Logger,
  Module,
  Post,
} from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Can, Policies } from '../../src/core/authorization/policy.js';
import { Clock } from '../../src/core/clock/clock.js';
import { ResponseSchema } from '../../src/core/contract/response-schema.decorator.js';
import { PrismaService } from '../../src/core/database/prisma.service.js';
import { EmailSender } from '../../src/core/email/email-sender.js';
import { DomainError } from '../../src/core/errors/domain-error.js';
import { RequiresIdempotencyKey } from '../../src/core/idempotency/requires-idempotency-key.decorator.js';
import {
  FakeEmailSender,
  type SignedIn,
  signInWithEmailCode,
  uniqueEmail,
} from '../support/auth-fixtures.js';
import { createTestApp } from '../support/create-test-app.js';
import { SIGNED_IN_TEST_ACTION, signedInTestPolicies } from '../support/test-policies.js';
import { FakeClock } from '../support/fake-clock.js';

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

@Injectable()
class Executions {
  private readonly counts = new Map<string, number>();

  record(marker: string): number {
    const attempt = this.of(marker) + 1;
    this.counts.set(marker, attempt);
    return attempt;
  }

  of(marker: string): number {
    return this.counts.get(marker) ?? 0;
  }
}

@Injectable()
class Gate {
  opened = Promise.resolve();
  private release: () => void = () => undefined;

  close(): void {
    this.opened = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  open(): void {
    this.release();
  }
}

const noteBody = z.object({ marker: z.string() });
const noteResponse = z.object({ marker: z.string(), attempt: z.int() });
type NoteBody = z.infer<typeof noteBody>;

@Policies(signedInTestPolicies)
@Controller('test/idempotent')
class IdempotentTestController {
  constructor(
    private readonly executions: Executions,
    private readonly gate: Gate,
  ) {}

  @Can(SIGNED_IN_TEST_ACTION)
  @Post('notes')
  @RequiresIdempotencyKey()
  @ResponseSchema(noteResponse, { status: HttpStatus.CREATED })
  create(@Body({ schema: noteBody }) { marker }: NoteBody) {
    return { marker, attempt: this.executions.record(marker), internalNote: 'never stored' };
  }

  @Can(SIGNED_IN_TEST_ACTION)
  @Post('optional')
  @ResponseSchema(noteResponse, { status: HttpStatus.CREATED })
  optional(@Body({ schema: noteBody }) { marker }: NoteBody) {
    return { marker, attempt: this.executions.record(marker) };
  }

  @Can(SIGNED_IN_TEST_ACTION)
  @Post('conflicts')
  @RequiresIdempotencyKey()
  conflict(@Body({ schema: noteBody }) { marker }: NoteBody) {
    this.executions.record(marker);
    throw new DomainError('CONFLICT', 'Someone else took it');
  }

  @Can(SIGNED_IN_TEST_ACTION)
  @Post('flaky')
  @RequiresIdempotencyKey()
  @ResponseSchema(noteResponse, { status: HttpStatus.CREATED })
  flaky(@Body({ schema: noteBody }) { marker }: NoteBody) {
    const attempt = this.executions.record(marker);
    if (attempt === 1) throw new Error('Connection lost');
    return { marker, attempt };
  }

  @Can(SIGNED_IN_TEST_ACTION)
  @Post('slow')
  @RequiresIdempotencyKey()
  @ResponseSchema(noteResponse, { status: HttpStatus.CREATED })
  async slow(@Body({ schema: noteBody }) { marker }: NoteBody) {
    const attempt = this.executions.record(marker);
    await this.gate.opened;
    return { marker, attempt };
  }
}

@Module({ controllers: [IdempotentTestController], providers: [Executions, Gate] })
class IdempotentTestModule {}

describe('Idempotency-Key (TECH-06, NFR-OFF-01)', () => {
  const email = new FakeEmailSender();
  const clock = new FakeClock(new Date());
  let app: INestApplication<App>;
  let executions: Executions;
  let gate: Gate;
  let ana: SignedIn;
  let bruno: SignedIn;

  const post = (path: string, as: SignedIn, body: NoteBody, key?: string) => {
    const test = request(app.getHttpServer())
      .post(`/v1/test/idempotent/${path}`)
      .set('Authorization', `Bearer ${as.token}`);
    return (key ? test.set('Idempotency-Key', key) : test).send(body);
  };
  const newMarker = () => `note-${randomUUID()}`;

  beforeAll(async () => {
    app = await createTestApp(
      (builder) =>
        builder
          .overrideProvider(EmailSender)
          .useValue(email)
          .overrideProvider(Clock)
          .useValue(clock),
      [IdempotentTestModule],
    );
    executions = app.get(Executions);
    gate = app.get(Gate);
    ana = await signInWithEmailCode(app, email, uniqueEmail('ana'));
    bruno = await signInWithEmailCode(app, email, uniqueEmail('bruno'));
  });

  beforeEach(() => {
    gate.open();
  });

  afterAll(async () => {
    await app.close();
  });

  it('replays the stored response for a repeated key and runs the handler once', async () => {
    const key = randomUUID();
    const marker = newMarker();

    const first = await post('notes', ana, { marker }, key).expect(201);
    const retry = await post('notes', ana, { marker }, key).expect(201);

    expect(first.body).toEqual({ marker, attempt: 1 });
    expect(first.headers).not.toHaveProperty('idempotent-replayed');
    expect(retry.body).toEqual({ marker, attempt: 1 });
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(executions.of(marker)).toBe(1);
  });

  it('requires a UUID key where the route declares it', async () => {
    const marker = newMarker();

    const missing = await post('notes', ana, { marker }).expect(400);
    const malformed = await post('notes', ana, { marker }, 'retry-1').expect(400);

    expect(missing.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
    expect(malformed.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REQUIRED' });
    expect(executions.of(marker)).toBe(0);
  });

  it('honors a key on a mutation that does not require one', async () => {
    const marker = newMarker();
    const key = randomUUID();

    await post('optional', ana, { marker }).expect(201, { marker, attempt: 1 });
    await post('optional', ana, { marker }, key).expect(201, { marker, attempt: 2 });
    await post('optional', ana, { marker }, key).expect(201, { marker, attempt: 2 });
  });

  it('keeps keys apart per user', async () => {
    const key = randomUUID();
    const marker = newMarker();

    await post('notes', ana, { marker }, key).expect(201, { marker, attempt: 1 });
    const other = await post('notes', bruno, { marker }, key).expect(201);

    expect(other.body).toEqual({ marker, attempt: 2 });
    expect(other.headers).not.toHaveProperty('idempotent-replayed');
    await expect(app.get(PrismaService).idempotencyKey.count({ where: { key } })).resolves.toBe(2);
  });

  it('rejects a key reused for a different request', async () => {
    const key = randomUUID();
    const marker = newMarker();
    const otherMarker = newMarker();

    await post('notes', ana, { marker }, key).expect(201);
    const reused = await post('notes', ana, { marker: otherMarker }, key).expect(422);

    expect(reused.body).toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED' });
    expect(executions.of(otherMarker)).toBe(0);
  });

  it('answers 409 while the first request is still running, then replays it', async () => {
    const key = randomUUID();
    const marker = newMarker();
    gate.close();

    const running = post('slow', ana, { marker }, key).then((response) => response);
    await vi.waitFor(() => {
      expect(executions.of(marker)).toBe(1);
    });
    const concurrent = await post('slow', ana, { marker }, key).expect(409);

    expect(concurrent.body).toMatchObject({ code: 'IDEMPOTENCY_REQUEST_IN_PROGRESS' });
    gate.open();
    expect((await running).body).toEqual({ marker, attempt: 1 });
    await post('slow', ana, { marker }, key).expect(201, { marker, attempt: 1 });
    expect(executions.of(marker)).toBe(1);
  });

  it('lets a retry run a request left unfinished for a minute', async () => {
    const key = randomUUID();
    const marker = newMarker();
    gate.close();

    const abandoned = post('slow', ana, { marker }, key).then((response) => response);
    await vi.waitFor(() => {
      expect(executions.of(marker)).toBe(1);
    });
    clock.advance(MINUTE_MS);
    const retry = post('slow', ana, { marker }, key).then((response) => response);
    await vi.waitFor(() => {
      expect(executions.of(marker)).toBe(2);
    });

    gate.open();
    expect((await abandoned).status).toBe(201);
    expect((await retry).status).toBe(201);
  });

  it('stores a business error and replays it', async () => {
    const key = randomUUID();
    const marker = newMarker();

    const first = await post('conflicts', ana, { marker }, key).expect(409);
    const retry = await post('conflicts', ana, { marker }, key).expect(409);

    expect(retry.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(retry.body).toEqual(first.body);
    expect(retry.body).toMatchObject({ code: 'CONFLICT' });
    expect(executions.of(marker)).toBe(1);
  });

  it('runs a retry again after a server error', async () => {
    const key = randomUUID();
    const marker = newMarker();
    const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      await post('flaky', ana, { marker }, key).expect(500);
    } finally {
      logged.mockRestore();
    }

    const retry = await post('flaky', ana, { marker }, key).expect(201);

    expect(retry.body).toEqual({ marker, attempt: 2 });
    expect(retry.headers).not.toHaveProperty('idempotent-replayed');
  });

  it('forgets a key after 24 hours', async () => {
    const key = randomUUID();
    const marker = newMarker();
    const later = newMarker();

    await post('notes', ana, { marker }, key).expect(201);
    clock.advance(DAY_MS);

    await post('notes', ana, { marker: later }, key).expect(201, { marker: later, attempt: 1 });
  });
});
