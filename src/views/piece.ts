interface PieceRecord {
  id: string;
  userId: string;
  title: string;
  composer: string | null;
  part: string | null;
  studyReference: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function formatPiece(piece: PieceRecord) {
  return {
    id: piece.id,
    title: piece.title,
    composer: piece.composer,
    part: piece.part,
    studyReference: piece.studyReference,
    createdAt: piece.createdAt.toISOString(),
    updatedAt: piece.updatedAt.toISOString(),
  };
}

export function formatPieceList(pieces: PieceRecord[]) {
  return pieces.map(formatPiece);
}

export function formatPieceInline(piece: PieceRecord | null) {
  if (!piece) return null;
  return {
    id: piece.id,
    title: piece.title,
    composer: piece.composer,
    part: piece.part,
    studyReference: piece.studyReference,
  };
}
