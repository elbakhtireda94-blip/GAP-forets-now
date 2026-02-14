# Comptes démo — Production expérimentale (GAP Forêts)

Ces comptes permettent de tester l’application GAP Forêts en **production expérimentale** (démo, déploiement de test, formation).

---

## Mot de passe commun

**Tous les comptes utilisent le même mot de passe :** `Password1`  
*(respecter la majuscule : **P**)*

---

## Liste des comptes

| Rôle | Email | Usage |
|------|--------|--------|
| **ADMIN** | `admin@anef.ma` | Administration complète |
| **ADMIN (démo)** | `demo@anef.ma` | Compte démo production, accès admin |
| **DRANEF** | `dranef.rsk@anef.ma` | DRANEF Rabat-Salé-Kénitra |
| **DRANEF** | `dranef.bmk@anef.ma` | DRANEF Béni Mellal-Khénifra |
| **DPANEF** | `dpanef.rabat@anef.ma` | DPANEF Rabat |
| **DPANEF** | `dpanef.bm@anef.ma` | DPANEF Béni Mellal |
| **ADP** | `adp.temara@anef.ma` | ADP Temara |
| **ADP** | `adp.kasba@anef.ma` | ADP Kasba |
| **ADP (démo)** | `adp.demo@anef.ma` | ADP démo terrain (Kénitra / Sidi Taibi) |

---

## Création des comptes en base

En environnement de production expérimentale, exécuter le seed **une fois** (après déploiement de la BDD) :

```bash
cd server
node seed.js
```

Le script :

- Crée la base `anef_field_connect` si elle n’existe pas
- Crée les tables minimales si besoin
- Insère ou met à jour les comptes démo avec le mot de passe `Password1`

---

## Recommandations production expérimentale

1. **Ne pas utiliser ces comptes en production réelle** : prévoir de vrais utilisateurs et des mots de passe distincts.
2. **Changer le mot de passe** : modifier la constante `PASSWORD` dans `server/seed.js` puis relancer le seed si vous voulez un mot de passe dédié à la démo.
3. **Limiter l’accès** : en démo publique, restreindre les URLs ou mettre l’app derrière un accès contrôlé.
4. **Logs** : les tentatives de connexion sont loguées côté backend (`[AUTH] Login attempt`, etc.) pour le suivi.

---

## Connexion rapide

- **Admin / démo :** `admin@anef.ma` ou `demo@anef.ma` — mot de passe : `Password1`
- **ADP terrain :** `adp.temara@anef.ma` ou `adp.demo@anef.ma` — mot de passe : `Password1`

---

*Document généré pour GAP Forêts — ANEF.*
