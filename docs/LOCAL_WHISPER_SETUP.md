# Installation Whisper Local (Windows)

Guide pour installer les prérequis de la transcription locale 100% gratuite.

---

## 📦 Prérequis

1. **Python 3.8+**
2. **faster-whisper** (bibliothèque Python)
3. **FFmpeg** (pour le traitement audio)

---

## 🔧 Installation Étape par Étape

### 1. Installer Python

1. Télécharger depuis https://www.python.org/downloads/
2. Lancer l'installateur
3. **IMPORTANT**: Cocher **"Add Python to PATH"** lors de l'installation
4. Installer avec les options par défaut

**Vérifier:**
```powershell
python --version
```
→ Doit afficher `Python 3.x.x`

---

### 2. Installer faster-whisper

```powershell
pip install faster-whisper
```

**Vérifier:**
```powershell
python -c "import faster_whisper; print('OK')"
```
→ Doit afficher `OK`

**Note:** La première fois, faster-whisper télécharge le modèle Whisper (quelques centaines de MB).

---

### 3. Installer FFmpeg

#### Option A : Via winget (Windows 10/11)
```powershell
winget install FFmpeg
```

#### Option B : Téléchargement manuel
1. Télécharger depuis https://ffmpeg.org/download.html
   - Choisir "Windows builds from gyan.dev" ou "Windows builds from BtbN"
2. Extraire l'archive ZIP
3. Ajouter au PATH:
   - Ouvrir "Variables d'environnement" (Win + R → `sysdm.cpl` → Onglet "Avancé")
   - Modifier la variable `Path`
   - Ajouter le chemin vers le dossier `bin` de FFmpeg (ex: `C:\ffmpeg\bin`)
   - OU placer `ffmpeg.exe` dans `C:\Windows\System32`

**Vérifier:**
```powershell
ffmpeg -version
```
→ Doit afficher la version de FFmpeg

---

## ✅ Vérification Complète

Exécuter le script de vérification:

```powershell
.\server\check-whisper.ps1
```

Résultat attendu:
```
✓ Python trouvé: Python 3.x.x
✓ pip trouvé: pip x.x.x
✓ faster-whisper installé
✓ FFmpeg trouvé: ffmpeg version x.x.x
✓ Tous les prérequis sont installés !
```

---

## 🧪 Test Manuel

Créer un fichier audio de test (`test.wav`) puis:

```powershell
cd server
python whisper_local.py test.wav fr
```

Résultat attendu:
```json
{"raw_transcript": "texte transcrit...", "language_detected": "fr"}
```

---

## ⚠️ Dépannage

### "Python est introuvable"
→ Réinstaller Python en cochant "Add to PATH"
→ OU ajouter manuellement Python au PATH système

### "pip n'est pas reconnu"
→ Réinstaller Python avec pip inclus
→ OU utiliser `python -m pip install faster-whisper`

### "No module named 'faster_whisper'"
→ Vérifier: `pip list | findstr faster-whisper`
→ Si absent: `pip install faster-whisper`

### "ffmpeg n'est pas reconnu"
→ Vérifier que FFmpeg est dans le PATH
→ Redémarrer le terminal après modification du PATH
→ OU utiliser le chemin complet: `C:\ffmpeg\bin\ffmpeg.exe -version`

### Erreur "CUDA" ou "GPU"
→ faster-whisper fonctionne en CPU par défaut (plus lent mais fonctionne)
→ Pour GPU, installer CUDA Toolkit séparément

---

## 📚 Ressources

- Python: https://www.python.org/downloads/
- faster-whisper: https://github.com/guillaumekln/faster-whisper
- FFmpeg: https://ffmpeg.org/download.html
- Documentation Whisper: https://github.com/openai/whisper

---

## 🎯 Après Installation

1. Redémarrer le serveur backend: `npm run dev:server`
2. Tester avec le script: `.\server\check-whisper.ps1`
3. Suivre `docs/CAHIER_JOURNAL_TEST.md` pour tester l'enregistrement + transcription
