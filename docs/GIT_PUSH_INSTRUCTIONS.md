# Pousser GAP Forêts vers GitHub

## Prérequis

- **Git** installé et dans le PATH : [git-scm.com](https://git-scm.com/)
- Compte **GitHub** et dépôt créé : https://github.com/elbakhtireda94-blip/GAP-forets

## Méthode 1 : Script automatique (Windows)

À la racine du projet, double-cliquez sur :

```
scripts\git-push-to-github.bat
```

Ou en CMD/PowerShell (dans un terminal où `git` est reconnu) :

```cmd
cd C:\Users\HP\Documents\code\adp-territoire\adp-territoire-connect-main
scripts\git-push-to-github.bat
```

## Méthode 2 : Commandes manuelles

Ouvrez **Git Bash** (ou un terminal avec Git dans le PATH), puis :

```bash
cd /c/Users/HP/Documents/code/adp-territoire/adp-territoire-connect-main

# 1. Init si besoin
git init

# 2. Vérifier que .env n'est pas suivi
git status
# .env et server/.env ne doivent PAS apparaître (ignorés)

# 3. Ajouter et committer
git add .
git commit -m "Initial commit - GAP Forêts production ready"

# 4. Branche main
git branch -M main

# 5. Remote (si déjà existant : git remote remove origin puis)
git remote add origin https://github.com/elbakhtireda94-blip/GAP-forets.git

# 6. Push
git push -u origin main
```

## Vérifications après push

```bash
git log --oneline -3
git remote -v
git branch -a
```

## Sécurité

- **.env** et **server/.env** sont dans `.gitignore` → ils ne seront **pas** poussés.
- Ne jamais ajouter de clés API ou mots de passe dans le dépôt.
- Si un `.env` a déjà été commité par le passé : le retirer de l’historien puis changer les secrets.

## Dépôt GitHub

URL du dépôt : **https://github.com/elbakhtireda94-blip/GAP-forets.git**
