import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, FileAudio, Mic, NotebookPen, Square, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import {
  ContextFields,
  Mode,
  ModePicker,
  NoteEditor,
  StepTitle,
  Warnings,
  errorDetail,
  isPaymentError,
} from './shared';

interface VoiceResponse {
  mode: Mode;
  note_markdown: string;
  transcript: string;
  providers_used: string[];
  unsure_count: number;
  warnings: string[];
}

// Backend cap (the transcription APIs' per-file limit).
const MAX_BYTES = 25 * 1024 * 1024;
// Long enough for a dictated note or a short lesson; longer recordings take
// minutes to process and are better split.
const MAX_RECORD_SECONDS = 15 * 60;
// Speech is perfectly clear at 32 kbit/s Opus: about 4MB for 15 minutes,
// which keeps uploads quick on mobile data.
const AUDIO_BITRATE = 32_000;
const ACCEPT = 'audio/*,.mp3,.m4a,.wav,.webm,.ogg,.oga,.flac,.mp4';

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Detect automatically (best for Pidgin or mixed speech)' },
  { value: 'en', label: 'English' },
  { value: 'yo', label: 'Yoruba' },
  { value: 'ha', label: 'Hausa' },
  { value: 'ig', label: 'Igbo' },
];

/** The best recording format this browser supports. Chrome and Firefox do
 *  WebM/Opus; Safari does MP4/AAC. Both are accepted by the backend. */
function pickMimeType(): { mime: string; ext: string } {
  const candidates = [
    { mime: 'audio/webm;codecs=opus', ext: 'webm' },
    { mime: 'audio/webm', ext: 'webm' },
    { mime: 'audio/mp4', ext: 'm4a' },
    { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  ];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return { mime: '', ext: 'webm' };
}

function clock(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoiceNotes() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [audio, setAudio] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mode, setMode] = useState<Mode>('rewrite');
  const [language, setLanguage] = useState('');
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [result, setResult] = useState<VoiceResponse | null>(null);
  const [note, setNote] = useState('');

  const audioUrl = useMemo(() => (audio ? URL.createObjectURL(audio) : null), [audio]);
  useEffect(() => () => void (audioUrl && URL.revokeObjectURL(audioUrl)), [audioUrl]);

  // Release the microphone if the user leaves mid-recording.
  useEffect(
    () => () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('This browser can’t record audio. Upload a recording instead.');
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      toast.error('Microphone access was blocked. Allow it in your browser settings and try again.');
      return;
    }
    const { mime, ext } = pickMimeType();
    const recorder = new MediaRecorder(stream, {
      ...(mime ? { mimeType: mime } : {}),
      audioBitsPerSecond: AUDIO_BITRATE,
    });
    chunksRef.current = [];
    recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const type = recorder.mimeType || mime || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type });
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      setAudio(new File([blob], `recording-${stamp}.${ext}`, { type }));
      setRecording(false);
    };
    streamRef.current = stream;
    recorderRef.current = recorder;
    recorder.start(1000);
    setAudio(null);
    setElapsed(0);
    setRecording(true);
    const started = Date.now();
    timerRef.current = window.setInterval(() => {
      const secs = (Date.now() - started) / 1000;
      setElapsed(secs);
      if (secs >= MAX_RECORD_SECONDS) {
        stopRecording();
        toast.info(`Recording stopped at ${MAX_RECORD_SECONDS / 60} minutes.`);
      }
    }, 250);
  }

  function stopRecording() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }

  function pickFile(f: File) {
    if (!f.type.startsWith('audio/') && !/\.(mp3|m4a|wav|webm|ogg|oga|flac|mp4)$/i.test(f.name)) {
      toast.error('Upload an audio recording: MP3, M4A, WAV, WebM, OGG or FLAC.');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error('That recording is over 25MB. Use a shorter clip, or split it into parts.');
      return;
    }
    setAudio(f);
  }

  const generate = useMutation({
    mutationFn: async () => {
      const form = new FormData();
      form.append('file', audio!);
      form.append('mode', mode);
      form.append('language', language);
      form.append('subject', subject);
      form.append('class_level', classLevel);
      const { data } = await api.post<VoiceResponse>('/notes/voice', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setNote(data.note_markdown);
      if (!data.note_markdown) toast.warning('No speech was found in the recording.');
      else toast.success('Your note is ready to review.');
    },
    onError: (err) =>
      toast.error(errorDetail(err, "Couldn't process your recording. Please try again.")),
  });

  function startOver() {
    setAudio(null);
    setResult(null);
    setNote('');
    setElapsed(0);
    generate.reset();
    if (fileRef.current) fileRef.current.value = '';
  }

  if (result) {
    return (
      <>
        <Card className="mb-4">
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold text-fg">
                  Check your note before you share it.
                </h2>
                <p className="mt-0.5 text-sm text-fg-muted">
                  Listen back and compare it with what was said. Names and technical terms are
                  the most likely to be mis-heard.
                  {result.mode === 'expand' &&
                    ' Sections marked (added) were written by the AI, not taken from your recording.'}
                </p>
              </div>
              {result.unsure_count > 0 && (
                <Badge tone="warning" className="sm:shrink-0">
                  <AlertTriangle className="h-3 w-3" />
                  {result.unsure_count} {result.unsure_count === 1 ? 'word' : 'words'} to check
                </Badge>
              )}
            </div>
            <Warnings items={result.warnings} />
            {result.unsure_count > 0 && (
              <p className="mt-3 text-xs text-fg-subtle">
                Search the note for <code className="text-fg">[?]</code> to find words that may
                have been mis-heard.
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-fg uppercase tracking-wider mb-3">
                Your recording
              </h3>
              {audioUrl && <audio controls src={audioUrl} className="w-full" />}
              <div className="mt-4 text-[11px] font-bold uppercase tracking-wider text-fg-subtle mb-1.5">
                What the AI heard
              </div>
              <div className="rounded-xl border border-border bg-bg-inset p-3 max-h-[60vh] overflow-y-auto">
                <p className="whitespace-pre-wrap text-sm text-fg">
                  {result.transcript || 'No speech found.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <NoteEditor note={note} onChange={setNote} onStartOver={startOver} />
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <Card>
        <CardContent>
          <StepTitle n={1}>Record or upload</StepTitle>

          {!audio ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
              <button
                onClick={recording ? stopRecording : startRecording}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
                className={
                  recording
                    ? 'mx-auto h-20 w-20 rounded-full bg-red-500 text-white grid place-items-center shadow-lg animate-pulse'
                    : 'mx-auto h-20 w-20 rounded-full bg-gradient-brand text-white grid place-items-center shadow-glow hover:opacity-90 transition'
                }
              >
                {recording ? <Square className="h-7 w-7" /> : <Mic className="h-8 w-8" />}
              </button>
              <div className="mt-4 font-display text-2xl font-semibold text-fg tabular-nums">
                {recording ? clock(elapsed) : 'Tap to record'}
              </div>
              <p className="mt-1 text-sm text-fg-muted">
                {recording
                  ? `Tap again to stop. Up to ${MAX_RECORD_SECONDS / 60} minutes.`
                  : 'Speak your lesson note, or record yourself teaching.'}
              </p>

              {!recording && (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs text-fg-subtle">
                    <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) pickFile(f);
                      e.target.value = '';
                    }}
                  />
                  <Button variant="outline" onClick={() => fileRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    Upload a recording
                  </Button>
                  <div className="mt-3 text-xs text-fg-subtle">
                    MP3 · M4A · WAV · WebM · OGG · up to 25MB
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-inset p-4">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 shrink-0 rounded-xl bg-bg-surface border border-border grid place-items-center text-brand-400">
                  <FileAudio className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg truncate">{audio.name}</div>
                  <div className="text-xs text-fg-muted">
                    {(audio.size / (1024 * 1024)).toFixed(1)} MB
                    {elapsed > 0 && ` · ${clock(elapsed)}`}
                  </div>
                </div>
                <button
                  onClick={startOver}
                  disabled={generate.isPending}
                  aria-label="Remove recording"
                  className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-fg-subtle hover:text-fg hover:bg-bg-surface transition disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {audioUrl && <audio controls src={audioUrl} className="mt-3 w-full" />}
            </div>
          )}

          <div className="mt-4">
            <Label htmlFor="voice-language">Language spoken</Label>
            <Select
              id="voice-language"
              options={LANGUAGE_OPTIONS}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={generate.isPending}
            />
          </div>

          <p className="mt-4 text-xs text-fg-subtle">
            For best results, record in a quiet room with the phone close to you.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <StepTitle n={2}>Choose what you get back</StepTitle>
          <ModePicker mode={mode} onChange={setMode} disabled={generate.isPending} />
          {mode !== 'transcribe' && (
            <div className="mt-4">
              <ContextFields
                subject={subject}
                classLevel={classLevel}
                onSubject={setSubject}
                onClassLevel={setClassLevel}
              />
            </div>
          )}

          <Button
            className="mt-5"
            fullWidth
            disabled={!audio || recording || generate.isPending}
            loading={generate.isPending}
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? (
              'Listening to your recording…'
            ) : (
              <>
                <NotebookPen className="h-4 w-4" />
                Create note
              </>
            )}
          </Button>
          {generate.isPending && (
            <p className="mt-2 text-xs text-fg-muted text-center">
              This can take a minute or two for longer recordings. Keep this tab open.
            </p>
          )}
          {isPaymentError(generate.error) && (
            <p className="mt-2 text-xs text-center text-fg-muted">
              <Link to="/billing" className="text-brand-400 underline">
                Choose a plan
              </Link>{' '}
              to use AI notes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
