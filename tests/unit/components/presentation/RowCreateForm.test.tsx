// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { RowCreateForm } from '@/components/presentation/RowCreateForm';

afterEach(() => cleanup());

describe('RowCreateForm', () => {
  it('renders all input fields', () => {
    render(<RowCreateForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByPlaceholderText('Passage label (optional)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Start measure')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('End measure')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Target tempo (BPM)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Steps (1-50)')).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RowCreateForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    const startInput = screen.getByPlaceholderText('Start measure');
    const endInput = screen.getByPlaceholderText('End measure');
    const tempoInput = screen.getByPlaceholderText('Target tempo (BPM)');
    const stepsInput = screen.getByPlaceholderText('Steps (1-50)');

    await user.clear(startInput);
    await user.type(startInput, '1');
    await user.clear(endInput);
    await user.type(endInput, '16');
    await user.clear(tempoInput);
    await user.type(tempoInput, '120');
    await user.clear(stepsInput);
    await user.type(stepsInput, '5');

    // Submit via form submission (fireEvent since userEvent.click on submit
    // button triggers HTML5 validation which jsdom doesn't fully support)
    const { fireEvent } = await import('@testing-library/react');
    const form = startInput.closest('form')!;
    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledWith({
      passageLabel: '',
      startMeasure: 1,
      endMeasure: 16,
      targetTempo: 120,
      steps: 5,
    });
  });

  it('includes passage label when provided', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<RowCreateForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText('Passage label (optional)'), 'Exposition');
    const startInput = screen.getByPlaceholderText('Start measure');
    await user.clear(startInput);
    await user.type(startInput, '1');
    await user.clear(screen.getByPlaceholderText('End measure'));
    await user.type(screen.getByPlaceholderText('End measure'), '8');
    await user.clear(screen.getByPlaceholderText('Target tempo (BPM)'));
    await user.type(screen.getByPlaceholderText('Target tempo (BPM)'), '100');
    await user.clear(screen.getByPlaceholderText('Steps (1-50)'));
    await user.type(screen.getByPlaceholderText('Steps (1-50)'), '3');

    const { fireEvent } = await import('@testing-library/react');
    fireEvent.submit(startInput.closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ passageLabel: 'Exposition' }));
  });

  it('does not submit with invalid numeric values', () => {
    const onSubmit = vi.fn();
    render(<RowCreateForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    // Submit with empty fields — parseInt returns NaN, form handler returns early
    const { fireEvent } = require('@testing-library/react');
    const form = screen.getByPlaceholderText('Start measure').closest('form')!;
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<RowCreateForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows error message when provided', () => {
    render(<RowCreateForm onSubmit={vi.fn()} onCancel={vi.fn()} error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
