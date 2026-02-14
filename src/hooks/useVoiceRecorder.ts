import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { JournalAttachment } from '@/data/cahierJournalTypes';

export type RecordingState = 'idle' | 'recording' | 'done' | 'error';

interface UseVoiceRecorderOptions {
  onTranscriptionComplete?: (text: string) => void;
  onAudioReady?: (attachment: JournalAttachment) => void;
  onAudioBlobReady?: (blob: Blob, url: string | null) => void; // Callback when audio blob is ready (blob + URL)
}

const MAX_RECORDING_SECONDS = 300; // 5 minutes max

export function useVoiceRecorder(options: UseVoiceRecorderOptions = {}) {
  const [state, setState] = useState<RecordingState>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioUrlRef = useRef<string | null>(null); // Track URL to prevent premature revocation
  const { toast } = useToast();

  // Cleanup on unmount - only revoke URL if it still exists
  useEffect(() => {
    return () => {
      stopTimer();
      stopMediaStream();
      // Only revoke URL on unmount, not on state changes
      if (audioUrlRef.current) {
        console.log('[useVoiceRecorder] Cleanup: revoking object URL on unmount');
        URL.revokeObjectURL(audioUrlRef.current);
        audioUrlRef.current = null;
      }
    };
  }, []); // Empty deps - only run on unmount

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = useCallback(async () => {
    console.log('[useVoiceRecorder] startRecording called');
    try {
      setErrorMessage(null);
      setState('idle');
      setIsRecording(false);
      
      // Cleanup previous audio URL (only if different from current)
      if (audioUrlRef.current && audioUrlRef.current !== audioUrl) {
        console.log('[useVoiceRecorder] Revoking previous audio URL');
        URL.revokeObjectURL(audioUrlRef.current);
      }
      audioUrlRef.current = null;
      setAudioUrl(null);
      setAudioBlob(null);
      chunksRef.current = [];

      // Request microphone permission
      console.log('[useVoiceRecorder] Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      streamRef.current = stream;

      // Determine best supported mime type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : 'audio/webm'; // fallback

      console.log('[useVoiceRecorder] Starting recording with mimeType:', mimeType);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Collect chunks via ondataavailable
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = () => {
        stopMediaStream();
        
        // Assemble Blob from chunks
        if (chunksRef.current.length === 0) {
          setState('error');
          setErrorMessage('Aucune donnée audio enregistrée. Veuillez réessayer.');
          setIsRecording(false);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: mimeType });
        
        // Validate blob size
        if (blob.size === 0) {
          console.error('[useVoiceRecorder] Blob size is 0, recording failed');
          setState('error');
          setErrorMessage('Enregistrement vide. Veuillez réessayer.');
          setIsRecording(false);
          return;
        }
        
        console.log('[useVoiceRecorder] Recording stopped, blob created:', {
          size: blob.size,
          type: blob.type,
          chunksCount: chunksRef.current.length,
          sizeKB: Math.round(blob.size / 1024),
        });
        
        setAudioBlob(blob);
        
        // Create preview URL and store in ref to prevent premature revocation
        const url = URL.createObjectURL(blob);
        audioUrlRef.current = url;
        setAudioUrl(url);

        console.log('[useVoiceRecorder] Object URL created:', url.substring(0, 50) + '...');
        console.log('[useVoiceRecorder] Audio ready for transcription (blob.size > 0):', blob.size > 0);

        // Notify parent that audio blob and URL are ready (for intelligent transcription)
        options.onAudioBlobReady?.(blob, url);

        setState('done');
        setIsRecording(false);
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('[useVoiceRecorder] MediaRecorder error:', event);
        setState('error');
        setErrorMessage('Erreur lors de l\'enregistrement. Veuillez réessayer.');
        setIsRecording(false);
        stopMediaStream();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setState('recording');
      setIsRecording(true);
      setElapsedSeconds(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const next = prev + 1;
          if (next >= MAX_RECORDING_SECONDS) {
            stopRecording();
          }
          return next;
        });
      }, 1000);

    } catch (err) {
      console.error('[useVoiceRecorder] Error starting recording:', err);
      setState('error');
      setIsRecording(false);
      setErrorMessage(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Accès au microphone refusé. Veuillez autoriser l\'accès dans les paramètres de votre navigateur.'
          : err instanceof DOMException && err.name === 'NotFoundError'
            ? 'Aucun microphone trouvé. Vérifiez que votre appareil dispose d\'un microphone.'
            : 'Impossible de démarrer l\'enregistrement. Vérifiez que votre appareil dispose d\'un microphone.'
      );
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    stopTimer();
    setIsRecording(false);
    
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      } else if (mediaRecorderRef.current.state === 'inactive') {
        // Already stopped, but ensure we process chunks
        if (chunksRef.current.length > 0) {
          const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          console.log('[useVoiceRecorder] Processing chunks after stop:', {
            size: blob.size,
            type: blob.type,
          });
          setAudioBlob(blob);
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          setAudioUrl(url);
          options.onAudioBlobReady?.(blob, url);
          setState('done');
        }
      }
    }
  }, [options]);

  /**
   * Upload blob directly (avoids closure issues with audioBlob state)
   */
  const uploadBlob = useCallback(async (
    blob: Blob,
    url: string | null,
    userId: string
  ): Promise<JournalAttachment | null> => {
    if (!blob || blob.size === 0) {
      console.warn('[useVoiceRecorder] uploadBlob called with invalid blob');
      toast({
        title: 'Erreur',
        description: 'Aucun enregistrement audio disponible',
        variant: 'destructive',
      });
      return null;
    }

    console.log('[useVoiceRecorder] uploadBlob called:', {
      blobSize: blob.size,
      blobType: blob.type,
      hasUrl: !!url,
      userId,
    });

    try {
      // For now, return a local attachment (can be extended to upload to storage later)
      const timestamp = Date.now();
      const ext = blob.type.includes('webm') ? 'webm' : 'mp4';
      const filename = `enregistrement-vocal-${timestamp}.${ext}`;

      const attachment: JournalAttachment = {
        type: 'audio',
        url: url || '',
        filename,
        uploaded_at: new Date().toISOString(),
        storagePath: `local/${userId}/${filename}`,
      };

      console.log('[useVoiceRecorder] Upload completed, attachment created:', {
        filename: attachment.filename,
        hasUrl: !!attachment.url,
      });

      options.onAudioReady?.(attachment);
      return attachment;
    } catch (err) {
      console.error('[useVoiceRecorder] Audio upload error:', err);
      toast({
        title: 'Erreur d\'upload audio',
        description: err instanceof Error ? err.message : 'Erreur lors du téléchargement audio',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, options]);

  /**
   * Upload using current audioBlob state (for backward compatibility)
   */
  const uploadAudio = useCallback(async (userId: string): Promise<JournalAttachment | null> => {
    console.log('[useVoiceRecorder] uploadAudio called (using state):', {
      hasBlob: !!audioBlob,
      blobSize: audioBlob?.size,
      hasUrl: !!audioUrl,
      userId,
    });

    if (!audioBlob) {
      toast({
        title: 'Erreur',
        description: 'Aucun enregistrement audio disponible',
        variant: 'destructive',
      });
      return null;
    }

    return uploadBlob(audioBlob, audioUrl, userId);
  }, [audioBlob, audioUrl, uploadBlob, toast]);

  const reset = useCallback(() => {
    console.log('[useVoiceRecorder] Reset called');
    stopTimer();
    stopMediaStream();
    
    // Revoke URL only on explicit reset
    if (audioUrlRef.current) {
      console.log('[useVoiceRecorder] Revoking object URL on reset');
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    
    setState('idle');
    setIsRecording(false);
    setElapsedSeconds(0);
    setErrorMessage(null);
    setAudioUrl(null);
    setAudioBlob(null);
    chunksRef.current = [];
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return {
    state,
    isRecording,
    elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds),
    errorMessage,
    audioUrl,
    audioBlob,
    startRecording,
    stopRecording,
    uploadAudio, // Backward compatibility
    uploadBlob, // New method that accepts blob directly
    reset,
    hasAudio: !!audioBlob,
  };
}
