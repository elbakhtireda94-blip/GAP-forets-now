import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVoiceRecorder, RecordingState } from '@/hooks/useVoiceRecorder';
import { JournalAttachment } from '@/data/cahierJournalTypes';

interface VoiceRecorderProps {
  onTranscriptionComplete?: (text: string) => void;
  onAudioAttachment?: (attachment: JournalAttachment) => void;
  onAudioReady?: (blob: Blob, url: string | null) => void; // Callback when audio is ready (blob + URL)
  onReset?: () => void; // Callback when user clicks "Nouveau"
  userId: string;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptionComplete,
  onAudioAttachment,
  onAudioReady,
  onReset,
  userId,
  disabled = false,
}) => {
  // Local state to store blob for upload (avoids closure issues)
  const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const uploadAttemptedRef = useRef(false);

  const recorder = useVoiceRecorder({
    onAudioBlobReady: (blob, url) => {
      console.log('[VoiceRecorder] Audio blob ready:', {
        size: blob.size,
        type: blob.type,
        url: url ? 'present' : 'null',
      });
      
      // Store blob and URL in local state (don't call uploadAudio here)
      setPendingBlob(blob);
      setPendingUrl(url);
      uploadAttemptedRef.current = false;
      
      // Expose audio blob and URL for intelligent transcription
      onAudioReady?.(blob, url);
    },
  });

  // Auto-upload when blob becomes available (using useEffect to avoid closure issues)
  useEffect(() => {
    if (pendingBlob && onAudioAttachment && !uploadAttemptedRef.current) {
      uploadAttemptedRef.current = true;
      console.log('[VoiceRecorder] Triggering auto-upload:', {
        blobSize: pendingBlob.size,
        blobType: pendingBlob.type,
        userId,
      });

      // Use uploadBlob method from hook (passes blob directly, avoids closure)
      recorder.uploadBlob(pendingBlob, pendingUrl, userId)
        .then((attachment) => {
          console.log('[VoiceRecorder] Upload completed:', attachment ? 'success' : 'failed');
          if (attachment) {
            onAudioAttachment(attachment);
          }
        })
        .catch((err) => {
          console.error('[VoiceRecorder] Upload error:', err);
        });
    }
  }, [pendingBlob, pendingUrl, onAudioAttachment, userId, recorder]);

  const handleReset = () => {
    console.log('[VoiceRecorder] Resetting recorder');
    setPendingBlob(null);
    setPendingUrl(null);
    uploadAttemptedRef.current = false;
    recorder.reset();
    onReset?.();
  };

  const handleManualUpload = async () => {
    if (!recorder.audioBlob) {
      console.warn('[VoiceRecorder] Manual upload called but no blob available');
      return;
    }

    console.log('[VoiceRecorder] Manual upload triggered:', {
      blobSize: recorder.audioBlob.size,
      blobType: recorder.audioBlob.type,
      userId,
    });

    const attachment = await recorder.uploadBlob(recorder.audioBlob, recorder.audioUrl, userId);
    if (attachment && onAudioAttachment) {
      console.log('[VoiceRecorder] Manual upload success');
      onAudioAttachment(attachment);
    } else {
      console.warn('[VoiceRecorder] Manual upload failed');
    }
  };

  const { state, isRecording, formattedTime, errorMessage, audioUrl, audioBlob, hasAudio } = recorder;

  if (state === 'idle' && !hasAudio) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={recorder.startRecording}
        disabled={disabled}
        className="gap-2 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
      >
        <Mic className="h-4 w-4" />
        🎙️ Enregistrer un message vocal
      </Button>
    );
  }

  return (
    <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
      {/* Recording state */}
      {isRecording && state === 'recording' && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                <Mic className="h-5 w-5 text-destructive" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive animate-pulse" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Enregistrement en cours...</p>
              <p className="text-xs text-muted-foreground">
                Parlez clairement en français ou en arabe
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono text-base px-3 py-1">
              {formattedTime}
            </Badge>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={recorder.stopRecording}
              className="gap-1"
            >
              <Square className="h-3 w-3" />
              Arrêter
            </Button>
          </div>
        </div>
      )}

      {/* Done state */}
      {state === 'done' && audioBlob && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-5 w-5 text-green-700" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Enregistrement terminé</p>
              <p className="text-xs text-muted-foreground">
                Durée: {formattedTime} • Taille: {Math.round(audioBlob.size / 1024)} KB • Type: {audioBlob.type}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Nouveau
            </Button>
          </div>

          {/* Audio preview */}
          {audioUrl && (
            <div className="bg-background rounded-lg p-2">
              <audio controls src={audioUrl} className="w-full h-8" />
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Erreur</p>
              <p className="text-xs text-muted-foreground">{errorMessage || 'Erreur inconnue'}</p>
            </div>
          </div>

          {/* If we have audio despite error, let user listen */}
          {audioUrl && audioBlob && (
            <div className="bg-background rounded-lg p-2">
              <audio controls src={audioUrl} className="w-full h-8" />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Réessayer
            </Button>
            {audioUrl && audioBlob && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleManualUpload}
                className="gap-1"
              >
                Conserver l'audio
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
