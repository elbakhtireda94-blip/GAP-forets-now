#!/usr/bin/env python3
"""
Script de transcription locale avec faster-whisper (gratuit, sans OpenAI).
Usage: python whisper_local.py <audio_file> [lang]
"""
import sys
import json
from pathlib import Path

try:
    from faster_whisper import WhisperModel
except ImportError:
    print(json.dumps({
        "error": "faster-whisper non installé",
        "message": "Installez avec: pip install faster-whisper"
    }), file=sys.stderr)
    sys.exit(1)

def transcribe_audio(audio_path, language="fr"):
    """Transcrit un fichier audio avec faster-whisper."""
    try:
        # Modèle base (petit, rapide) - peut être changé en "base", "small", "medium", "large"
        model_size = "base"
        model = WhisperModel(model_size, device="cpu", compute_type="int8")
        
        # Transcription
        segments, info = model.transcribe(
            str(audio_path),
            language=language if language != "auto" else None,
            beam_size=5,
            vad_filter=True,  # Voice Activity Detection
        )
        
        # Assembler le texte
        text_parts = []
        detected_lang = info.language
        
        for segment in segments:
            text_parts.append(segment.text.strip())
        
        full_text = " ".join(text_parts).strip()
        
        return {
            "raw_transcript": full_text,
            "language_detected": detected_lang,
        }
    except Exception as e:
        return {
            "error": str(e),
            "raw_transcript": "",
            "language_detected": language,
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python whisper_local.py <audio_file> [lang]"
        }), file=sys.stderr)
        sys.exit(1)
    
    audio_file = Path(sys.argv[1])
    lang = sys.argv[2] if len(sys.argv) > 2 else "fr"
    
    if not audio_file.exists():
        print(json.dumps({
            "error": f"Fichier audio introuvable: {audio_file}",
            "raw_transcript": "",
            "language_detected": lang,
        }), file=sys.stderr)
        sys.exit(1)
    
    result = transcribe_audio(audio_file, lang)
    print(json.dumps(result))
    sys.exit(0 if "error" not in result else 1)
