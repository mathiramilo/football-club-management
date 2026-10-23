import { describe, expect, it } from 'vitest';

import { formatMessage } from './messages.js';

describe('formatMessage', () => {
  it('fills the ICU placeholders of a Spanish message', () => {
    const text = formatMessage('email.signInCode.text', { code: '048213', minutes: 10 });

    expect(text).toContain('048213');
    expect(text).toContain('10 minutos');
  });

  it('fails loudly on a message that is missing a value', () => {
    expect(() => formatMessage('email.signInCode.text')).toThrow();
  });
});
