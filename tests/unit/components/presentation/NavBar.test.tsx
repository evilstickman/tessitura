// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { NavBar } from '@/components/presentation/NavBar';

afterEach(() => cleanup());

describe('NavBar', () => {
  it('renders Tessitura home link', () => {
    render(<NavBar />);
    expect(screen.getByText('Tessitura')).toBeInTheDocument();
    expect(screen.getByText('Tessitura').closest('a')).toHaveAttribute('href', '/');
  });

  it('renders All Grids link', () => {
    render(<NavBar />);
    expect(screen.getByText('All Grids')).toBeInTheDocument();
    expect(screen.getByText('All Grids').closest('a')).toHaveAttribute('href', '/grids');
  });

  it('renders sign-out button when onSignOut is provided', () => {
    render(<NavBar onSignOut={vi.fn()} />);
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('does not render sign-out button when onSignOut is not provided', () => {
    render(<NavBar />);
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
  });

  it('calls onSignOut when sign-out button is clicked', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(<NavBar onSignOut={onSignOut} />);
    await user.click(screen.getByText('Sign out'));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
