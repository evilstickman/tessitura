export interface SignOutButtonProps {
  onSignOut: () => void;
}

export function SignOutButton({ onSignOut }: SignOutButtonProps) {
  return (
    <button
      onClick={onSignOut}
      style={{
        backgroundColor: 'transparent',
        border: 'none',
        color: '#6b7280',
        fontSize: '11px',
        cursor: 'pointer',
        padding: '4px 8px',
      }}
    >
      Sign out
    </button>
  );
}
