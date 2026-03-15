import { describe, it, expect } from 'vitest';
import { validateGridInput } from '@/models/grid';

describe('Grid model — validateGridInput', () => {
  // Test 1
  it('accepts a valid name and returns it trimmed', () => {
    const result = validateGridInput({ name: 'My Practice Grid' });
    expect(result.name).toBe('My Practice Grid');
  });

  // Test 2
  it('rejects an empty string name', () => {
    expect(() => validateGridInput({ name: '' })).toThrow();
  });

  // Test 3
  it('rejects a whitespace-only name', () => {
    expect(() => validateGridInput({ name: '   ' })).toThrow();
  });

  // Test 4
  it('rejects a name over 200 characters', () => {
    const longName = 'a'.repeat(201);
    expect(() => validateGridInput({ name: longName })).toThrow();
  });

  // Test 5
  it('accepts a name at exactly 200 characters', () => {
    const name = 'a'.repeat(200);
    const result = validateGridInput({ name });
    expect(result.name).toBe(name);
  });

  // Test 6
  it('trims leading and trailing whitespace from name', () => {
    const result = validateGridInput({ name: '  My Grid  ' });
    expect(result.name).toBe('My Grid');
  });

  // Test 7
  it('accepts a name with special characters', () => {
    const name = "Grieg's Holberg Suite — Mvt. III";
    const result = validateGridInput({ name });
    expect(result.name).toBe(name);
  });

  // Test 8
  it('accepts null notes and stores as null', () => {
    const result = validateGridInput({ name: 'Grid' });
    expect(result.notes).toBeNull();
  });

  // Test 9
  it('accepts non-empty notes as-is', () => {
    const result = validateGridInput({ name: 'Grid', notes: 'Some notes' });
    expect(result.notes).toBe('Some notes');
  });

  // Test 10
  it('trims notes whitespace', () => {
    const result = validateGridInput({ name: 'Grid', notes: '  padded  ' });
    expect(result.notes).toBe('padded');
  });

  // Test 10a
  it('normalizes whitespace-only notes to null', () => {
    const result = validateGridInput({ name: 'Grid', notes: '   ' });
    expect(result.notes).toBeNull();
  });

  // Test 11
  it('accepts notes with 10,000+ characters', () => {
    const longNotes = 'x'.repeat(10_001);
    const result = validateGridInput({ name: 'Grid', notes: longNotes });
    expect(result.notes).toBe(longNotes);
  });
});
