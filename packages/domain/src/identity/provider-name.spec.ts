import { describe, expect, it } from 'vitest';

import { splitProviderName } from './provider-name.js';

describe('splitProviderName (AUTH-05 prefill)', () => {
  it('takes the first word as the first name and the rest as the last name', () => {
    expect(splitProviderName('Nicolás Pérez')).toEqual({ firstName: 'Nicolás', lastName: 'Pérez' });
    expect(splitProviderName('Juan Pablo Rodríguez Silva')).toEqual({
      firstName: 'Juan',
      lastName: 'Pablo Rodríguez Silva',
    });
  });

  it('collapses extra spaces', () => {
    expect(splitProviderName('  Lucía   de  León ')).toEqual({
      firstName: 'Lucía',
      lastName: 'de León',
    });
  });

  it('leaves the last name empty for a single word', () => {
    expect(splitProviderName('Nicolás')).toEqual({ firstName: 'Nicolás', lastName: '' });
  });

  it('returns empty parts for an empty name', () => {
    expect(splitProviderName('')).toEqual({ firstName: '', lastName: '' });
    expect(splitProviderName('   ')).toEqual({ firstName: '', lastName: '' });
  });
});
