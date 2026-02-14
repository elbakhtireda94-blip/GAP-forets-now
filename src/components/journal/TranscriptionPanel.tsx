import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, Copy, FileText, Sparkles, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getToken, getMySQLApiUrl } from '@/integrations/mysql-api/client';

export interface TranscriptionResult {
  language_detected: string;
  raw_transcript: string;
  french_pro: string;
  summary: {
    contexte: string;
    objectif: string;
    deroulement: string[];
    resultats: string[];
    risques: string[];
    actions_suivi: string[];
  };
  extracted: {
    commune?: string;
    odf?: string;
    pdfcp?: string;
    conflit?: string;
    opposition?: string;
  };
  warning?: string;
}

interface TranscriptionPanelProps {
  audioBlob: Blob | null;
  audioUrl?: string | null; // Optional URL to reconstruct blob if needed
  metadata?: {
    commune?: string;
    axis?: string;
    type?: string;
  };
  onInsertText: (text: string) => void;
  onClose?: () => void;
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  audioBlob,
  audioUrl,
  metadata,
  onInsertText,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Source of truth: getMySQLApiUrl(), ensure no trailing slash
  const API_BASE_URL = getMySQLApiUrl().replace(/\/$/, '');
  console.log('[TranscriptionPanel] API_BASE_URL:', API_BASE_URL);

  const handleTranscribe = async () => {
    let blobToUse = audioBlob;

    // If no blob but URL exists, reconstruct blob from URL
    if (!blobToUse && audioUrl) {
      try {
        const response = await fetch(audioUrl);
        if (!response.ok) {
          throw new Error('Impossible de récupérer l\'audio depuis l\'URL');
        }
        blobToUse = await response.blob();
      } catch (err) {
        console.error('Error reconstructing blob from URL:', err);
        toast({
          title: 'Erreur',
          description: 'Impossible de récupérer l\'enregistrement audio. Veuillez réenregistrer.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Defensive check: ensure blob exists and has data
    if (!blobToUse) {
      toast({
        title: 'Erreur',
        description: 'Aucun enregistrement audio disponible',
        variant: 'destructive',
      });
      return;
    }

    if (blobToUse.size === 0) {
      toast({
        title: 'Erreur',
        description: 'Le fichier audio est vide. Veuillez réenregistrer.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Create FormData with the recorded Blob
      const formData = new FormData();
      // Use the blob's actual type or default to webm
      const filename = blobToUse.type.includes('webm') 
        ? 'recording.webm' 
        : blobToUse.type.includes('mp4')
          ? 'recording.mp4'
          : 'recording.webm';
      
      formData.append('audio', blobToUse, filename);
      if (metadata?.commune) formData.append('commune', metadata.commune);
      if (metadata?.axis) formData.append('axis', metadata.axis);
      if (metadata?.type) formData.append('type', metadata.type);

      // Get auth token - try multiple sources
      let token = getToken();
      
      // Fallback: try localStorage directly (for compatibility)
      if (!token) {
        token = localStorage.getItem('anef_mysql_token') || localStorage.getItem('auth_token') || null;
      }

      // Prepare headers
      const headers: Record<string, string> = {};
      
      // Only add Authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use transcribe-local (100% gratuit, faster-whisper + post-processing)
      const urlPrimary = `${API_BASE_URL}/ai/transcribe-local`;
      const urlFallback = `${API_BASE_URL}/api/ai/transcribe-local`;
      let finalUrl = '';

      const tryUrl = async (apiUrl: string): Promise<Response> => {
        console.log('[TranscriptionPanel] Final URL used:', apiUrl);
        console.log('[TranscriptionPanel] Blob size:', blobToUse.size, 'Has token:', !!token);
        return fetch(apiUrl, { method: 'POST', headers, body: formData });
      };

      let response: Response | null = null;

      response = await tryUrl(urlPrimary);
      finalUrl = urlPrimary;

      if (response.status === 404) {
        console.log('[TranscriptionPanel] 404 on primary, trying fallback:', urlFallback);
        response = await tryUrl(urlFallback);
        finalUrl = urlFallback;
      }

      console.log('[TranscriptionPanel] Response status:', response.status, 'for URL:', finalUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          const errorMsg = 'Non authentifié. Veuillez vous reconnecter.';
          setError(errorMsg);
          toast({
            title: 'Erreur d\'authentification',
            description: errorMsg,
            variant: 'destructive',
          });
          return;
        }
        if (response.status === 429) {
          throw new Error(errorData.message || 'Limite de transcription atteinte. Réessayez plus tard.');
        }
        const err = new Error(errorData.message || errorData.error || `Erreur ${response.status}`);
        (err as any).hint = errorData.hint; // Attach hint for display
        throw err;
      }

      const data = await response.json();
      setResult(data);
      console.log('[TranscriptionPanel] Success with URL:', finalUrl);

      if (data.warning) {
        toast({
          title: 'Avertissement',
          description: data.warning,
          variant: 'default',
        });
      }
    } catch (err) {
      console.error('[TranscriptionPanel] Transcription error (full):', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors de la transcription';

      if (err instanceof TypeError || (err instanceof Error && (err.message.includes('fetch') || err.message.includes('Failed to fetch')))) {
        setError('Serveur indisponible');
        toast({
          title: 'Erreur réseau',
          description: `Base: ${API_BASE_URL}. Serveur injoignable ou CORS. Vérifiez que le serveur tourne et autorise cette origine.`,
          variant: 'destructive',
        });
      } else {
        setError(errorMessage);
        // Extraire hint si présent dans la réponse
        const hint = (err as any)?.hint || '';
        toast({
          title: 'Erreur de transcription',
          description: errorMessage + (hint ? `\n\n${hint}` : ''),
          variant: 'destructive',
          duration: 10000, // Plus long pour les erreurs avec hint
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = (text: string, label: string) => {
    onInsertText(text);
    toast({
      title: 'Texte inséré',
      description: `${label} a été inséré dans la description`,
    });
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copié',
      description: `${label} copié dans le presse-papier`,
    });
  };

  // Render guard: return null only if no audio AND no result
  if (!audioBlob && !audioUrl && !result) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Transcription intelligente
          </CardTitle>
          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-6 px-2"
            >
              Fermer
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && !loading && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Cliquez sur "Transcrire" pour générer automatiquement :
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Transcription brute (verbatim)</li>
              <li>Version française professionnelle</li>
              <li>Synthèse structurée (contexte, objectif, résultats, risques, actions)</li>
            </ul>
            <Button
              type="button"
              onClick={handleTranscribe}
              className="w-full"
              variant="default"
              disabled={!audioBlob && !audioUrl}
            >
              <FileText className="h-4 w-4 mr-2" />
              Transcrire l'audio
            </Button>
            {!audioBlob && !audioUrl && (
              <p className="text-xs text-muted-foreground text-center">
                Enregistrez d'abord un audio pour activer la transcription
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Transcription en cours...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Détection de langue et génération du texte professionnel
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Erreur</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Language badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Langue détectée: {result.language_detected === 'fr' ? 'Français' : 
                                 result.language_detected === 'ar' ? 'Arabe' : 
                                 result.language_detected === 'ber' ? 'Darija' : 
                                 result.language_detected}
              </Badge>
              {result.warning && (
                <Badge variant="outline" className="text-xs text-amber-600">
                  ⚠️ {result.warning}
                </Badge>
              )}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="french-pro" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="raw" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  Brut
                </TabsTrigger>
                <TabsTrigger value="french-pro" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  FR Pro
                </TabsTrigger>
                <TabsTrigger value="summary" className="text-xs">
                  <List className="h-3 w-3 mr-1" />
                  Synthèse
                </TabsTrigger>
              </TabsList>

              {/* Tab: Raw transcript */}
              <TabsContent value="raw" className="space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Transcription brute (verbatim)</p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(result.raw_transcript, 'Transcription brute')}
                      className="h-7 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleInsert(result.raw_transcript, 'Transcription brute')}
                      className="h-7 px-2 text-xs"
                    >
                      Insérer
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg border text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {result.raw_transcript || '(vide)'}
                </div>
              </TabsContent>

              {/* Tab: French Pro */}
              <TabsContent value="french-pro" className="space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Version française professionnelle</p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(result.french_pro, 'Version FR Pro')}
                      className="h-7 px-2"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => handleInsert(result.french_pro, 'Version FR Pro')}
                      className="h-7 px-2 text-xs"
                    >
                      Insérer FR Pro
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-background rounded-lg border text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {result.french_pro || '(vide)'}
                </div>
              </TabsContent>

              {/* Tab: Summary */}
              <TabsContent value="summary" className="space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">Synthèse structurée</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const summaryText = formatSummaryAsText(result.summary);
                      handleCopy(summaryText, 'Synthèse');
                    }}
                    className="h-7 px-2"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                <div className="space-y-3 text-sm">
                  {result.summary.contexte && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">Contexte</p>
                      <p className="p-2 bg-muted/50 rounded border">{result.summary.contexte}</p>
                    </div>
                  )}

                  {result.summary.objectif && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">Objectif</p>
                      <p className="p-2 bg-muted/50 rounded border">{result.summary.objectif}</p>
                    </div>
                  )}

                  {result.summary.deroulement.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">Déroulement</p>
                      <ul className="list-disc list-inside space-y-1 p-2 bg-muted/50 rounded border">
                        {result.summary.deroulement.map((item, idx) => (
                          <li key={idx} className="text-xs">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.summary.resultats.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">Résultats</p>
                      <ul className="list-disc list-inside space-y-1 p-2 bg-muted/50 rounded border">
                        {result.summary.resultats.map((item, idx) => (
                          <li key={idx} className="text-xs">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.summary.risques.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-destructive mb-1">Risques identifiés</p>
                      <ul className="list-disc list-inside space-y-1 p-2 bg-destructive/10 rounded border border-destructive/20">
                        {result.summary.risques.map((item, idx) => (
                          <li key={idx} className="text-xs">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.summary.actions_suivi.length > 0 && (
                    <div>
                      <p className="font-medium text-xs text-muted-foreground mb-1">Actions de suivi</p>
                      <ul className="list-disc list-inside space-y-1 p-2 bg-muted/50 rounded border">
                        {result.summary.actions_suivi.map((item, idx) => (
                          <li key={idx} className="text-xs">{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Extracted entities */}
                  {(result.extracted.commune || result.extracted.odf || result.extracted.pdfcp || 
                    result.extracted.conflit || result.extracted.opposition) && (
                    <div className="pt-2 border-t">
                      <p className="font-medium text-xs text-muted-foreground mb-2">Éléments extraits</p>
                      <div className="space-y-1 text-xs">
                        {result.extracted.commune && (
                          <p><span className="font-medium">Commune:</span> {result.extracted.commune}</p>
                        )}
                        {result.extracted.odf && (
                          <p><span className="font-medium">ODF:</span> {result.extracted.odf}</p>
                        )}
                        {result.extracted.pdfcp && (
                          <p><span className="font-medium">PDFCP:</span> {result.extracted.pdfcp}</p>
                        )}
                        {result.extracted.conflit && (
                          <p className="text-destructive"><span className="font-medium">Conflit:</span> {result.extracted.conflit}</p>
                        )}
                        {result.extracted.opposition && (
                          <p className="text-destructive"><span className="font-medium">Opposition:</span> {result.extracted.opposition}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => handleInsert(result.french_pro, 'Version FR Pro')}
                className="flex-1"
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Insérer FR Pro dans description
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const summaryText = formatSummaryAsText(result.summary);
                  handleInsert(summaryText, 'Synthèse');
                }}
                className="flex-1"
              >
                Insérer Synthèse
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Format summary as readable text
 */
function formatSummaryAsText(summary: TranscriptionResult['summary']): string {
  const parts: string[] = [];
  
  if (summary.contexte) parts.push(`Contexte: ${summary.contexte}`);
  if (summary.objectif) parts.push(`Objectif: ${summary.objectif}`);
  
  if (summary.deroulement.length > 0) {
    parts.push(`Déroulement:\n${summary.deroulement.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')}`);
  }
  
  if (summary.resultats.length > 0) {
    parts.push(`Résultats:\n${summary.resultats.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')}`);
  }
  
  if (summary.risques.length > 0) {
    parts.push(`Risques identifiés:\n${summary.risques.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')}`);
  }
  
  if (summary.actions_suivi.length > 0) {
    parts.push(`Actions de suivi:\n${summary.actions_suivi.map((item, idx) => `  ${idx + 1}. ${item}`).join('\n')}`);
  }
  
  return parts.join('\n\n');
}

export default TranscriptionPanel;
