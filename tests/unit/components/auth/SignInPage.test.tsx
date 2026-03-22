// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

import SignInPage from '@/app/auth/signin/page';

afterEach(() => cleanup());

describe('SignInPage', () => {
  it('renders the Tessitura heading', () => {
    render(<SignInPage />);
    expect(screen.getByRole('heading', { name: 'Tessitura' })).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<SignInPage />);
    expect(screen.getByText('Practice grid platform for musicians')).toBeInTheDocument();
  });

  it('renders the Google sign-in button', () => {
    render(<SignInPage />);
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('does not show an error when no error param is present', () => {
    render(<SignInPage />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
