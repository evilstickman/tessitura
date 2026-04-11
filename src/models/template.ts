import { prisma } from '@/lib/db';
import { ValidationError } from '@/lib/errors';
import {
  validateRowInput,
  generateCellPercentages,
  type RowInput,
  type ValidatedRowInput,
} from '@/models/row';

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

/**
 * Clones a LibraryTemplate into a new PracticeGrid owned by the given user.
 *
 * The clone is fully transactional — if any row or cell insert fails, the
 * entire operation rolls back (no partial grid left behind). `gridData` is
 * validated BEFORE entering the transaction so a 400 failure doesn't even
 * start a DB transaction.
 *
 * Returns:
 * - the ID of the created grid on success
 * - `'not-found'` if the template doesn't exist or is inactive
 * - throws ValidationError for malformed gridData (controller → 400)
 *
 * A string literal is used for the "not found" branch instead of null so
 * the caller can distinguish between "template missing" and "clone failed"
 * without sentinel arguments.
 *
 * Row structure:
 * - Each gridData row → one PracticeRow with sortOrder = array index
 * - pieceId is always null (template rows don't link to user pieces)
 * - passageLabel carries through if present
 * - Cells generated via generateCellPercentages (same formula as direct
 *   row creation) so clones behave identically to manual rows
 */
export async function cloneTemplate(
  templateId: string,
  userId: string,
): Promise<string | 'not-found'> {
  const template = await prisma.libraryTemplate.findFirst({
    where: { id: templateId, active: true, deletedAt: null },
  });
  if (!template) return 'not-found';

  const validated = validateGridData(template.gridData);

  return prisma.$transaction(async (tx) => {
    const grid = await tx.practiceGrid.create({
      data: {
        userId,
        name: template.title,
        gridType: template.gridType,
        sourceTemplateId: template.id,
        fadeEnabled: true,
      },
    });

    for (let sortOrder = 0; sortOrder < validated.rows.length; sortOrder++) {
      const rowData = validated.rows[sortOrder];
      const row = await tx.practiceRow.create({
        data: {
          practiceGridId: grid.id,
          sortOrder,
          startMeasure: rowData.startMeasure,
          endMeasure: rowData.endMeasure,
          targetTempo: rowData.targetTempo,
          steps: rowData.steps,
          passageLabel: rowData.passageLabel,
          // pieceId intentionally omitted — template rows have no user-piece link
        },
      });

      const percentages = generateCellPercentages(rowData.steps);
      await tx.practiceCell.createMany({
        data: percentages.map((pct, i) => ({
          practiceRowId: row.id,
          stepNumber: i,
          targetTempoPercentage: pct,
        })),
      });
    }

    return grid.id;
  });
}
