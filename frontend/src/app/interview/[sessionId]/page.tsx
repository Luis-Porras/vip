//frontend/src/app/interview/[sessionId]/page.tsx
import CandidateInterview from '@/components/CandidateInterview';

export default async function InterviewPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  
  return <CandidateInterview sessionId={sessionId} />;
}