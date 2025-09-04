//frontend/src/app/edit-template/[templateID]/page.tsx
import EditTemplate from '@/components/EditTemplate';

export default async function EditTemplatePage({ params }: { params: Promise<{ templateId: string }> }) {
  const { templateId } = await params;
  
  return <EditTemplate templateId={templateId} />;
}