'use client';

import { useState } from 'react';

const PRIORITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

interface RowCreateFormProps {
  onSubmit: (data: { passageLabel: string; startMeasure: number; endMeasure: number; targetTempo: number; steps: number; priority: string }) => void;
  onCancel: () => void;
  error?: string | null;
}

export function RowCreateForm({ onSubmit, onCancel, error }: RowCreateFormProps) {
  const [passageLabel, setPassageLabel] = useState('');
  const [startMeasure, setStartMeasure] = useState('');
  const [endMeasure, setEndMeasure] = useState('');
  const [targetTempo, setTargetTempo] = useState('');
  const [steps, setSteps] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const start = parseInt(startMeasure, 10);
    const end = parseInt(endMeasure, 10);
    const tempo = parseInt(targetTempo, 10);
    const stepCount = parseInt(steps, 10);
    if (isNaN(start) || isNaN(end) || isNaN(tempo) || isNaN(stepCount)) return;
    if (start < 1 || end < 1 || tempo < 1 || stepCount < 1) return;
    onSubmit({
      passageLabel: passageLabel.trim() || '',
      startMeasure: start,
      endMeasure: end,
      targetTempo: tempo,
      steps: stepCount,
      priority,
    });
    // Clear fields so user can add another row
    setPassageLabel('');
    setStartMeasure('');
    setEndMeasure('');
    setTargetTempo('');
    setSteps('');
    setPriority('MEDIUM');
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    background: '#111827',
    color: '#f9fafb',
    border: '1px solid #374151',
    borderRadius: '4px',
    fontSize: '12px',
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: '#1f2937', borderRadius: '6px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
        Add Row
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
        <input type="text" placeholder="Passage label (optional)" value={passageLabel} onChange={(e) => setPassageLabel(e.target.value)} style={{ ...inputStyle, gridColumn: '1 / -1' }} />
        <input type="number" placeholder="Start measure" value={startMeasure} onChange={(e) => setStartMeasure(e.target.value)} style={inputStyle} min={1} required />
        <input type="number" placeholder="End measure" value={endMeasure} onChange={(e) => setEndMeasure(e.target.value)} style={inputStyle} min={1} required />
        <input type="number" placeholder="Target tempo (BPM)" value={targetTempo} onChange={(e) => setTargetTempo(e.target.value)} style={inputStyle} min={1} max={999} required />
        <input type="number" placeholder="Steps (1-50)" value={steps} onChange={(e) => setSteps(e.target.value)} style={inputStyle} min={1} max={50} required />
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={{ ...inputStyle, gridColumn: '1 / -1' }} aria-label="Priority">
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
          ))}
        </select>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
          Add Row
        </button>
        <button type="button" onClick={onCancel} style={{ background: '#374151', color: '#9ca3af', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '6px' }}>{error}</div>}
    </form>
  );
}
