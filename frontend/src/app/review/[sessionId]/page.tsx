//frontend/src/app/review/[sessionId]/page.tsx
import VideoReviewInterface from '@/components/VideoReviewInterface';

export default async function SessionReviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  
  return (
    <div className="p-8">
      <VideoReviewInterface sessionId={sessionId} />
    </div>
  );
}

