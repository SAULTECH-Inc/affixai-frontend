import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';

export default function DocumentViewPage() {
  const { id } = useParams();
  return (
    <div>
      <PageHeader title="Document" description={`ID: ${id}`} />
      <Card>
        <CardContent>
          <p className="text-fg-muted">
            Document viewer is a follow-up. The signed file is downloadable from
            the Auto-Sign result screen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
