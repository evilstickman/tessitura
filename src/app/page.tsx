import { GridListDirector } from '@/components/directors/GridListDirector';

export default function Home() {
  return (
    <main
      style={{
        backgroundColor: '#111827',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px 24px',
        color: '#f9fafb',
      }}
    >
      <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '32px' }}>
        Tessitura
      </h1>
      <GridListDirector />
    </main>
  );
}
