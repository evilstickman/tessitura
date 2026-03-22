import Link from 'next/link';

interface NavBarProps {
  onSignOut?: () => void;
}

export function NavBar({ onSignOut }: NavBarProps) {
  return (
    <nav
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid #374151',
        backgroundColor: '#111827',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link
          href="/"
          style={{
            color: '#f9fafb',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 600,
          }}
        >
          Tessitura
        </Link>
        <Link
          href="/grids"
          style={{
            color: '#9ca3af',
            textDecoration: 'none',
            fontSize: '13px',
          }}
        >
          All Grids
        </Link>
      </div>
      {onSignOut && (
        <button
          type="button"
          onClick={onSignOut}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          Sign out
        </button>
      )}
    </nav>
  );
}
