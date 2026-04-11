/**
 * PracticeSession response formatting.
 *
 * `sessionDate` is stored as `@db.Date` in Prisma (date-only, no time
 * component) but Prisma returns it as a JavaScript Date — the view layer
 * is responsible for re-serializing it as a YYYY-MM-DD string at the API
 * boundary so clients never see a full ISO timestamp for what is semantically
 * a calendar date.
 *
 * Uses `.toISOString().slice(0, 10)` instead of local-date formatting to
 * stay timezone-independent: the stored date was inserted at UTC midnight,
 * so the ISO string's first 10 chars are always the intended calendar date
 * regardless of the server's local time.
 */

type SessionSource = 'MANUAL' | 'INFERRED';

interface SessionRecord {
  id: string;
  userId: string;
  practiceGridId: string | null;
  sessionDate: Date;
  durationMinutes: number;
  notes: string | null;
  source: SessionSource;
  createdAt: Date;
  deletedAt: Date | null;
}

export function formatSession(session: SessionRecord) {
  return {
    id: session.id,
    practiceGridId: session.practiceGridId,
    sessionDate: session.sessionDate.toISOString().slice(0, 10),
    durationMinutes: session.durationMinutes,
    notes: session.notes,
    source: session.source,
    createdAt: session.createdAt.toISOString(),
  };
}

export function formatSessionList(sessions: SessionRecord[]) {
  return sessions.map(formatSession);
}
