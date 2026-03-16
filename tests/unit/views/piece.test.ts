import { describe, it, expect } from 'vitest';
import { formatPiece, formatPieceList } from '@/views/piece';

const basePiece = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-id',
  title: 'Firebird Suite',
  composer: 'Stravinsky',
  part: '1st Trumpet',
  studyReference: null,
  createdAt: new Date('2026-03-15T10:00:00Z'),
  updatedAt: new Date('2026-03-15T11:00:00Z'),
  deletedAt: null,
};

describe('Piece View — formatPiece', () => {
  it('strips userId and deletedAt', () => {
    const result = formatPiece(basePiece);
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('formats timestamps as ISO 8601', () => {
    const result = formatPiece(basePiece);
    expect(result.createdAt).toBe('2026-03-15T10:00:00.000Z');
    expect(result.updatedAt).toBe('2026-03-15T11:00:00.000Z');
  });

  it('includes all piece fields', () => {
    const result = formatPiece(basePiece);
    expect(result.id).toBe(basePiece.id);
    expect(result.title).toBe('Firebird Suite');
    expect(result.composer).toBe('Stravinsky');
    expect(result.part).toBe('1st Trumpet');
    expect(result.studyReference).toBeNull();
  });

  it('handles null optional fields', () => {
    const piece = { ...basePiece, composer: null, part: null };
    const result = formatPiece(piece);
    expect(result.composer).toBeNull();
    expect(result.part).toBeNull();
  });
});

describe('Piece View — formatPieceList', () => {
  it('maps formatPiece over array', () => {
    const result = formatPieceList([basePiece]);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('userId');
  });
});
