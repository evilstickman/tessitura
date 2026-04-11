import { describe, it, expect } from 'vitest';
import { formatTemplate, formatTemplateDetail, formatTemplateList } from '@/views/template';

const baseRecord = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Clarke Technical Studies',
  author: 'Herbert L. Clarke',
  collection: 'Technical Studies for the Cornet',
  description: 'A collection of technical studies',
  instrumentTags: ['trumpet', 'cornet'],
  gridType: 'REPERTOIRE' as const,
  tierRequired: 'FREE' as const,
  gridData: {
    rows: [
      { passageLabel: 'Study #1', startMeasure: 1, endMeasure: 16, targetTempo: 120, steps: 5 },
    ],
  },
  active: true,
  createdAt: new Date('2026-04-01T12:00:00.000Z'),
  updatedAt: new Date('2026-04-02T12:00:00.000Z'),
  deletedAt: null,
};

describe('formatTemplate', () => {
  it('returns list-view fields and omits gridData, deletedAt', () => {
    const result = formatTemplate(baseRecord);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('author');
    expect(result).toHaveProperty('collection');
    expect(result).toHaveProperty('description');
    expect(result).toHaveProperty('instrumentTags');
    expect(result).toHaveProperty('gridType');
    expect(result).toHaveProperty('tierRequired');
    expect(result).toHaveProperty('active');
    expect(result).toHaveProperty('createdAt');
    expect(result).toHaveProperty('updatedAt');
    expect(result).not.toHaveProperty('gridData');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('renders timestamps as ISO 8601', () => {
    const result = formatTemplate(baseRecord);
    expect(result.createdAt).toBe('2026-04-01T12:00:00.000Z');
    expect(result.updatedAt).toBe('2026-04-02T12:00:00.000Z');
  });
});

describe('formatTemplateDetail', () => {
  it('includes all list-view fields plus gridData', () => {
    const result = formatTemplateDetail(baseRecord);
    expect(result).toHaveProperty('gridData');
    expect(result.gridData).toEqual(baseRecord.gridData);
    expect(result).toHaveProperty('title');
    expect(result).toHaveProperty('instrumentTags');
    expect(result).not.toHaveProperty('deletedAt');
  });
});

describe('formatTemplateList', () => {
  it('maps and strips gridData', () => {
    const list = formatTemplateList([
      baseRecord,
      { ...baseRecord, id: '00000000-0000-0000-0000-000000000002' },
    ]);
    expect(list).toHaveLength(2);
    expect(list[0]).not.toHaveProperty('gridData');
    expect(list[1]).not.toHaveProperty('gridData');
  });
});
