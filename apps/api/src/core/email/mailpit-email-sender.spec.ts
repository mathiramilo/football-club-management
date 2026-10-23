import { afterEach, describe, expect, it, vi } from 'vitest';

import { MailpitEmailSender } from './mailpit-email-sender.js';

describe('MailpitEmailSender', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the message to Mailpit's send API", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ ID: 'abc' }));
    vi.stubGlobal('fetch', fetchMock);
    const sender = new MailpitEmailSender('http://localhost:8025', 'no-reply@example.test');

    await sender.send({ to: 'lucia@example.test', subject: 'Asunto', text: 'Cuerpo' });

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toEqual(new URL('http://localhost:8025/api/v1/send'));
    expect(JSON.parse(init?.body as string)).toEqual({
      From: { Email: 'no-reply@example.test' },
      To: [{ Email: 'lucia@example.test' }],
      Subject: 'Asunto',
      Text: 'Cuerpo',
    });
  });

  it('fails when Mailpit rejects the message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 500 })),
    );
    const sender = new MailpitEmailSender('http://localhost:8025', 'no-reply@example.test');

    await expect(
      sender.send({ to: 'lucia@example.test', subject: 'Asunto', text: 'Cuerpo' }),
    ).rejects.toThrow('500');
  });
});
