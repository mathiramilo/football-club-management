import { describe, expect, it } from 'vitest';

import { displayName } from './display-name.js';

describe('displayName (BR-AUTH-07)', () => {
  it('uses the nickname when set', () => {
    expect(displayName({ firstName: 'Nicolás', lastName: 'Pérez', nickname: 'Nico' })).toBe('Nico');
  });

  it('uses the first name and last-name initial without a nickname', () => {
    expect(displayName({ firstName: 'Nicolás', lastName: 'Pérez' })).toBe('Nicolás P.');
    expect(displayName({ firstName: 'Nicolás', lastName: 'Pérez', nickname: null })).toBe(
      'Nicolás P.',
    );
  });

  it('ignores a blank nickname', () => {
    expect(displayName({ firstName: 'Nicolás', lastName: 'Pérez', nickname: '   ' })).toBe(
      'Nicolás P.',
    );
  });

  it('capitalizes the initial, including accented letters', () => {
    expect(displayName({ firstName: 'Lucía', lastName: 'de León' })).toBe('Lucía D.');
    expect(displayName({ firstName: 'Martín', lastName: 'Álvarez' })).toBe('Martín Á.');
  });

  it('trims surrounding spaces', () => {
    expect(displayName({ firstName: ' Nicolás ', lastName: ' Pérez', nickname: ' Nico ' })).toBe(
      'Nico',
    );
    expect(displayName({ firstName: ' Nicolás ', lastName: ' Pérez' })).toBe('Nicolás P.');
  });

  it('falls back to the first name without a last name', () => {
    expect(displayName({ firstName: 'Nicolás', lastName: '' })).toBe('Nicolás');
  });
});
