import { EmailSender, type EmailMessage } from './email-sender.js';

const SEND_TIMEOUT_MS = 5_000;

// Local development only: Mailpit catches every message. The production provider arrives with ADR-017.
export class MailpitEmailSender extends EmailSender {
  constructor(
    private readonly baseUrl: string,
    private readonly from: string,
  ) {
    super();
  }

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(new URL('/api/v1/send', this.baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        From: { Email: this.from },
        To: [{ Email: message.to }],
        Subject: message.subject,
        Text: message.text,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(`Mailpit rejected the message with status ${String(response.status)}`);
  }
}
