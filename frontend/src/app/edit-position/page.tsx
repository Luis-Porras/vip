//frontend/src/app/edit-position/[positionId]/page.tsx
import EditPosition from '@/components/EditPosition';

export default async function EditPositionPage({ params }: { params: Promise<{ positionId: string }> }) {
  const { positionId } = await params;
  return <EditPosition positionId={positionId} />;
}