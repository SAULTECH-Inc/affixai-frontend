import { useSearchParams } from 'react-router-dom';
import { Mic, NotebookPen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/layout/PageHeader';
import HandwritingNotes from '@/components/notes/HandwritingNotes';
import VoiceNotes from '@/components/notes/VoiceNotes';

const SOURCES = [
  { id: 'handwriting', label: 'Handwritten pages', icon: NotebookPen },
  { id: 'voice', label: 'Voice recording', icon: Mic },
] as const;

type Source = (typeof SOURCES)[number]['id'];

export default function NotesPage() {
  // In the URL so /notes?from=voice can be linked to directly.
  const [params, setParams] = useSearchParams();
  const source: Source = params.get('from') === 'voice' ? 'voice' : 'handwriting';

  return (
    <div>
      <PageHeader
        title="AI Notes"
        description="Turn handwritten notes or a voice recording into a clean, typed lesson note, ready to print or share."
        actions={
          <Badge tone="brand">
            <Sparkles className="h-3 w-3" />
            AI
          </Badge>
        }
      />

      <div
        role="tablist"
        className="flex gap-1 mb-4 p-1 rounded-xl bg-bg-inset border border-border w-fit"
      >
        {SOURCES.map((s) => {
          const Icon = s.icon;
          const active = source === s.id;
          return (
            <button
              key={s.id}
              role="tab"
              aria-selected={active}
              onClick={() => setParams(s.id === 'voice' ? { from: 'voice' } : {})}
              className={cn(
                'px-3 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2',
                active ? 'bg-bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg'
              )}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Keyed so switching source starts that flow fresh. */}
      {source === 'voice' ? <VoiceNotes key="voice" /> : <HandwritingNotes key="handwriting" />}
    </div>
  );
}
