// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { GridCreateForm } from '@/components/presentation/GridCreateForm';

afterEach(() => cleanup());

describe('GridCreateForm', () => {
  it('renders name and notes inputs and buttons', () => {
    render(<GridCreateForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByPlaceholderText(/name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/notes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('submits with name and notes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GridCreateForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/name/i), 'My Grid');
    await user.type(screen.getByPlaceholderText(/notes/i), 'Some notes');
    await user.click(screen.getByRole('button', { name: /create/i }));

    expect(onSubmit).toHaveBeenCalledWith('My Grid', 'Some notes');
  });

  it('does not submit when name is empty or whitespace', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GridCreateForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onSubmit).not.toHaveBeenCalled();

    // Whitespace-only name
    await user.type(screen.getByPlaceholderText(/name/i), '   ');
    await user.click(screen.getByRole('button', { name: /create/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<GridCreateForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows error message', () => {
    render(<GridCreateForm onSubmit={vi.fn()} onCancel={vi.fn()} error="Grid name taken" />);
    const errorEl = screen.getByText('Grid name taken');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl).toHaveStyle({ color: '#ef4444' });
  });

  it('submits on Enter key from name input', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GridCreateForm onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/name/i), 'Quick Grid');
    await user.keyboard('{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('Quick Grid', '');
  });

  it('all interactive elements are keyboard-focusable with no outline:none', () => {
    const { container } = render(<GridCreateForm onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const inputs = container.querySelectorAll('input, button');
    inputs.forEach((el) => {
      const style = (el as HTMLElement).style;
      expect(style.outline).not.toBe('none');
    });

    // Verify tabIndex is not set to -1
    inputs.forEach((el) => {
      expect(el.getAttribute('tabindex')).not.toBe('-1');
    });
  });
});
