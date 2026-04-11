import { prisma } from '@/lib/db';
import { ValidationError } from '@/lib/errors';
import { validateRowInput, type RowInput, type ValidatedRowInput } from '@/models/row';

/**
 * Shape of a LibraryTemplate's `gridData` JSON blob.
 *
 * A template's gridData is the single source of truth for how a cloned
 * PracticeGrid is structured. Each row here maps 1:1 to a PracticeRow on
 * clone (with pieceId always null — template rows are not linked to a
 * user's piece library).
 *
 * Row fields mirror PracticeRow create inputs: the same numeric bounds
 * apply (validateRowInput is re-used so the rules can't drift).
 */
export interface TemplateGridData {
  rows: Array<
    Partial<Pick<RowInput, 'passageLabel'>> & {
      startMeasure: number;
      endMeasure: number;
      targetTempo: number;
      steps: number;
    }
  >;
}

export interface ValidatedTemplateGridData {
  rows: ValidatedRowInput[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates a LibraryTemplate gridData JSON blob. Accepts `unknown` because
 * the blob comes from DB JSON (`Prisma.JsonValue`) which has no static shape.
 *
 * Rules:
 * - `rows` is an array with at least 1 row
 * - each row validates via `validateRowInput` from src/models/row.ts, so
 *   numeric bounds (startMeasure/endMeasure/targetTempo/steps) cannot drift
 *   from PracticeRow creation rules
 * - `pieceId` is always ignored / forced to null — templates are not tied
 *   to any user's piece library
 *
 * Used in two places:
 * - `cloneTemplate` before inserting rows
 * - `prisma/seed.ts` before inserting templates (so seed data stays valid)
 */
export function validateGridData(data: unknown): ValidatedTemplateGridData {
  if (!isObject(data)) {
    throw new ValidationError('gridData must be an object with a rows array');
  }
  if (!Array.isArray(data.rows)) {
    throw new ValidationError('gridData.rows must be an array');
  }
  if (data.rows.length === 0) {
    throw new ValidationError('gridData.rows must contain at least 1 row');
  }

  const rows: ValidatedRowInput[] = [];
  for (let i = 0; i < data.rows.length; i++) {
    const raw = data.rows[i];
    if (!isObject(raw)) {
      throw new ValidationError(`gridData.rows[${i}] must be an object`);
    }
    try {
      // validateRowInput covers numeric bounds, passageLabel length, and
      // start ≤ end cross-field check. Force pieceId: null — templates
      // never reference a user's pieces.
      rows.push(
        validateRowInput({
          startMeasure: raw.startMeasure as number,
          endMeasure: raw.endMeasure as number,
          targetTempo: raw.targetTempo as number,
          steps: raw.steps as number,
          passageLabel: (raw.passageLabel ?? null) as string | null,
          pieceId: null,
        }),
      );
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new ValidationError(`gridData.rows[${i}]: ${err.message}`);
      }
      throw err;
    }
  }

  return { rows };
}

/**
 * Lists active, non-deleted LibraryTemplates. Optional `instrument` filter
 * matches case-insensitively against any element of `instrumentTags`.
 *
 * Postgres arrays don't have a built-in case-insensitive `has` so we query
 * all active templates and filter in memory after lowercasing. This is fine
 * at M2.1 scale (≤ dozens of templates). If the catalog grows, swap to a
 * lowercased array column or a Postgres GIN index with custom expression.
 */
export async function listTemplates(instrument?: string | null) {
  const templates = await prisma.libraryTemplate.findMany({
    where: { active: true, deletedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!instrument) return templates;

  const needle = instrument.toLowerCase();
  return templates.filter((t) =>
    t.instrumentTags.some((tag) => tag.toLowerCase().includes(needle)),
  );
}

export async function getTemplateById(templateId: string) {
  return prisma.libraryTemplate.findFirst({
    where: { id: templateId, active: true, deletedAt: null },
  });
}
