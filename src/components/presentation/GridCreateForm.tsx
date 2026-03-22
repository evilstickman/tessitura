'use client';

import { useState } from 'react';

export interface GridCreateFormProps {
  onSubmit: (name: string, notes: string) => void;
  onCancel: () => void;
  error?: string | null;
}

const inputStyle: React.CSSProperties = {
  backgroundColor: '#111827',
  color: '#f9fafb',
  border: '1px solid #374151',
  borderRadius: '4px',
  padding: '6px 8px',
  fontSize: '13px',
  width: '100%',
  boxSizing: 'border-box',
};

export function GridCreateForm({ onSubmit, onCancel, error }: GridCreateFormProps) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');

  function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (name.trim() === '') return;
    onSubmit(name, notes);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        type="text"
        placeholder="Grid name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={inputStyle}
      />
      <input
        type="text"
        placeholder="Notes (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        style={inputStyle}
      />
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="submit"
          style={{
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Create
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            backgroundColor: '#374151',
            color: '#f9fafb',
            border: 'none',
            borderRadius: '4px',
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
      {error && (
        <div style={{ color: '#ef4444', fontSize: '12px' }}>{error}</div>
      )}
    </form>
  );
}
