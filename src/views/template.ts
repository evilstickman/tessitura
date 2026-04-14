type GridType = 'REPERTOIRE' | 'TECHNIQUE';
type TierRequired = 'FREE' | 'PRO';

/**
 * Public fields for LibraryTemplate, excluding gridData. Used by list view.
 * LibraryTemplateRecord is intentionally loose on gridData (`unknown`) because
 * Prisma returns it as Prisma.JsonValue and the view doesn't touch it except
 * in the detail variant.
 */
interface LibraryTemplateRecord {
  id: string;
  title: string;
  author: string;
  collection: string;
  description: string | null;
  instrumentTags: string[];
  gridType: GridType;
  tierRequired: TierRequired;
  gridData: unknown;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export function formatTemplate(template: LibraryTemplateRecord) {
  return {
    id: template.id,
    title: template.title,
    author: template.author,
    collection: template.collection,
    description: template.description,
    instrumentTags: template.instrumentTags,
    gridType: template.gridType,
    tierRequired: template.tierRequired,
    active: template.active,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
}

/**
 * Detail formatter — same as formatTemplate but includes gridData. Used by
 * `GET /api/templates/{id}` so clients can preview the blueprint before
 * cloning.
 */
export function formatTemplateDetail(template: LibraryTemplateRecord) {
  return {
    ...formatTemplate(template),
    gridData: template.gridData,
  };
}

export function formatTemplateList(templates: LibraryTemplateRecord[]) {
  return templates.map(formatTemplate);
}
