'use client';

import { RowCreateForm } from '@/components/presentation/RowCreateForm';

interface AddRowToggleProps {
  showForm: boolean;
  onShowForm: () => void;
  onCancelForm: () => void;
  onSubmitRow: (data: {
    passageLabel: string;
    startMeasure: number;
    endMeasure: number;
    targetTempo: number;
    steps: number;
    priority: string;
  }) => void;
  error: string | null;
}

/**
 * Toggle + form for adding a new row to a grid. Keeps the "Add Row" CTA button
 * out of the director and off the layer boundary — directors should not render
 * raw `<button>` markup.
 */
export function AddRowToggle({
  showForm,
  onShowForm,
  onCancelForm,
  onSubmitRow,
  error,
}: AddRowToggleProps) {
  if (showForm) {
    return (
      <div style={{ padding: '0 12px' }}>
        <RowCreateForm onSubmit={onSubmitRow} onCancel={onCancelForm} error={error} />
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 12px' }}>
      <button
        type="button"
        onClick={onShowForm}
        style={{
          background: '#10b981',
          color: 'white',
          border: 'none',
          padding: '6px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        + Add Row
      </button>
    </div>
  );
}
