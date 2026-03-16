import { describe, it, expect } from 'vitest';
import { validatePieceInput, validatePieceUpdate } from '@/models/piece';
import { ValidationError } from '@/lib/errors';

describe('Piece Model — validatePieceInput', () => {
  it('returns normalized data for valid input', () => {
    const result = validatePieceInput({
      title: '  Firebird Suite  ',
      composer: '  Stravinsky  ',
      part: null,
      studyReference: null,
    });
    expect(result).toEqual({
      title: 'Firebird Suite',
      composer: 'Stravinsky',
      part: null,
      studyReference: null,
    });
  });

  it('throws when title is missing', () => {
    expect(() => validatePieceInput({ title: '' })).toThrow(ValidationError);
  });

  it('throws when title is whitespace only', () => {
    expect(() => validatePieceInput({ title: '   ' })).toThrow(ValidationError);
  });

  it('throws when title exceeds 200 chars', () => {
    expect(() => validatePieceInput({ title: 'a'.repeat(201) })).toThrow(ValidationError);
  });

  it('normalizes whitespace-only optional fields to null', () => {
    const result = validatePieceInput({
      title: 'Test',
      composer: '   ',
      part: '   ',
      studyReference: '   ',
    });
    expect(result.composer).toBeNull();
    expect(result.part).toBeNull();
    expect(result.studyReference).toBeNull();
  });

  it('throws when optional field exceeds 200 chars', () => {
    expect(() =>
      validatePieceInput({ title: 'Test', composer: 'a'.repeat(201) }),
    ).toThrow(ValidationError);
  });
});

describe('Piece Model — validatePieceUpdate', () => {
  it('returns only provided fields', () => {
    const result = validatePieceUpdate({ title: '  New Title  ' });
    expect(result).toEqual({ title: 'New Title' });
  });

  it('throws when title is provided but empty', () => {
    expect(() => validatePieceUpdate({ title: '' })).toThrow(ValidationError);
  });

  it('throws when title is provided but whitespace only', () => {
    expect(() => validatePieceUpdate({ title: '   ' })).toThrow(ValidationError);
  });

  it('returns empty object when no fields provided', () => {
    const result = validatePieceUpdate({});
    expect(result).toEqual({});
  });

  it('normalizes whitespace-only optional fields to null', () => {
    const result = validatePieceUpdate({ composer: '   ' });
    expect(result).toEqual({ composer: null });
  });

  it('throws when title exceeds 200 chars in update', () => {
    expect(() => validatePieceUpdate({ title: 'a'.repeat(201) })).toThrow(ValidationError);
  });

  it('validates and normalizes part field', () => {
    const result = validatePieceUpdate({ part: '  Trumpet 1  ' });
    expect(result).toEqual({ part: 'Trumpet 1' });
  });

  it('throws when part exceeds 200 chars in update', () => {
    expect(() => validatePieceUpdate({ part: 'a'.repeat(201) })).toThrow(ValidationError);
  });

  it('normalizes whitespace-only part to null', () => {
    const result = validatePieceUpdate({ part: '   ' });
    expect(result).toEqual({ part: null });
  });

  it('validates and normalizes studyReference field', () => {
    const result = validatePieceUpdate({ studyReference: '  Page 42  ' });
    expect(result).toEqual({ studyReference: 'Page 42' });
  });

  it('throws when studyReference exceeds 200 chars in update', () => {
    expect(() => validatePieceUpdate({ studyReference: 'a'.repeat(201) })).toThrow(ValidationError);
  });

  it('normalizes whitespace-only studyReference to null', () => {
    const result = validatePieceUpdate({ studyReference: '   ' });
    expect(result).toEqual({ studyReference: null });
  });
});
