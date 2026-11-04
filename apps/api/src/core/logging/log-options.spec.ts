import { pino } from 'pino';
import { describe, expect, it } from 'vitest';

import { loggerOptions } from './log-options.js';

describe('Log options (NFR-OBS-02)', () => {
  const capture = () => {
    const lines: string[] = [];
    const logger = pino(loggerOptions({ LOG_LEVEL: 'info', LOG_FORMAT: 'json' }), {
      write: (line: string) => lines.push(line),
    });
    return { logger, lines };
  };

  it('redacts tokens, codes and emails wherever a log line carries them', () => {
    const { logger, lines } = capture();

    logger.info(
      { token: 'session-token', user: { email: 'lucia.prueba@example.test', otp: '482913' } },
      'signed in',
    );

    expect(JSON.parse(lines[0] ?? '')).toMatchObject({
      token: '[redacted]',
      user: { email: '[redacted]', otp: '[redacted]' },
    });
    expect(lines.join()).not.toMatch(/session-token|lucia\.prueba|482913/);
  });

  it('writes the level as a name and the time as ISO 8601', () => {
    const { logger, lines } = capture();

    logger.warn('lagging');

    const line = JSON.parse(lines[0] ?? '') as Record<string, unknown>;
    expect(line).toMatchObject({ level: 'warn', msg: 'lagging' });
    expect(line.time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
