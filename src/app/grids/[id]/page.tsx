import { GridViewDirector } from '@/components/directors/GridViewDirector';

export default async function GridDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main style={{ backgroundColor: '#111827', minHeight: '100vh', padding: '24px', color: '#f9fafb' }}>
      <GridViewDirector gridId={id} />
    </main>
  );
}
