// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SignOutButton } from '@/components/presentation/SignOutButton';

afterEach(() => cleanup());

describe('SignOutButton', () => {
  it('renders "Sign out" text', () => {
    render(<SignOutButton onSignOut={() => {}} />);
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('calls onSignOut when clicked', () => {
    const onSignOut = vi.fn();
    render(<SignOutButton onSignOut={onSignOut} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('uses transparent background', () => {
    render(<SignOutButton onSignOut={() => {}} />);
    const button = screen.getByRole('button');
    expect(button.style.backgroundColor).toBe('transparent');
  });
});
