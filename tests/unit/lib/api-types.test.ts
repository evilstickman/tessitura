import { describe, it, expect } from 'vitest';
import { getRowLabel } from '@/lib/api-types';

describe('getRowLabel', () => {
  it('returns "Title — PassageLabel" when both present', () => {
    expect(getRowLabel({ title: 'Sonata' }, 'Exposition')).toBe('Sonata — Exposition');
  });

  it('returns piece title when only piece is present', () => {
    expect(getRowLabel({ title: 'Sonata' }, null)).toBe('Sonata');
  });

  it('returns passage label when only passage label is present', () => {
    expect(getRowLabel(null, 'Exposition')).toBe('Exposition');
  });

  it('returns "Untitled" when neither is present', () => {
    expect(getRowLabel(null, null)).toBe('Untitled');
  });
});
