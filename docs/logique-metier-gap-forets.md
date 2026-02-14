# Logique métier — Application GAP Forêts

Document de référence pour la conception et l’évolution de l’application.

---

## 1. Vision globale

**GAP Forêts** est une application métier de l’ANEF dédiée à la **gestion de l’approche participative**, de l’**animation territoriale** et du **suivi terrain**, visant à :

- Structurer les relations entre Administration forestière et usagers
- Anticiper, détecter et gérer les conflits et oppositions
- Piloter les PDFCP et les activités socio-forestières
- Aider à la prise de décision territoriale (DRANEF / Central)

**Phrase clé (anglais, pour Cursor / IA)**  
*"GAP Forêts is a participatory forest governance system designed to structure territorial animation, manage conflicts and opposition, and support decision-making through field-based data collected by ADPs and validated hierarchically."*

---

## 2. Acteurs & rôles métier

### ADP – Agent de Développement de Partenariat

- **Rôle** : central terrain
- **Responsabilités** : animation territoriale, médiation, diagnostic participatif, suivi conflits/oppositions, appui PDFCP, collecte données terrain (photos, localisation, rapports)
- **Actions dans l’app** : créer/mettre à jour des PDFCP, déclarer conflits et oppositions, enregistrer des activités, remonter des alertes, joindre preuves

### DPANEF

- **Niveau** : provincial – supervision opérationnelle
- **Responsabilités** : suivi des ADP, validation intermédiaire, coordination territoriale
- **Actions** : valider/commenter PDFCP, suivre conflits et oppositions, arbitrage local, rapports provinciaux

### DRANEF

- **Niveau** : régional – pilotage stratégique
- **Responsabilités** : validation finale, gestion des situations sensibles, reporting régional
- **Actions** : validation finale des PDFCP, priorisation des zones à risque, indicateurs régionaux, aide à la décision

### Administration centrale

- **Vision** : nationale & stratégie
- **Actions** : tableaux de bord nationaux, comparaison inter-régionale, orientation stratégique, suivi Stratégie Forêts du Maroc 2020–2030

---

## 3. Entités métier principales

### ADP

- Représente l’agent terrain.
- **Attributs** : identité, affectation (DRANEF/DPANEF/Commune), compétences, charge, activités, conflits gérés.
- **Relations** : 1 ADP → plusieurs PDFCP, Conflits/Oppositions, Activités.

### PDFCP (Plan de Développement Forestier Communal Participatif)

- Document stratégique quinquennal.
- **Attributs** : commune, ODF concernés, diagnostic participatif, programme quinquennal, avancement, validations (DPANEF, DRANEF), liens conflits/activités.
- **États métier** : Brouillon, En discussion participative, Validé techniquement, Validé définitivement, En exécution, Clôturé.
- **Relations** : 1 PDFCP → plusieurs Activités, plusieurs Conflits.

### ODF (Organisation de Développement Forestier)

- Structure représentant les usagers.
- **Attributs** : nom, statut juridique, zone d’intervention, membres, activités économiques, relations avec ANEF.

### ACTIVITÉ

- Action concrète sur le terrain.
- **Types** : réunion participative, sensibilisation, reboisement, mise en défens, compensation, projet générateur de revenu.
- **Attributs** : type, localisation, date, acteurs, résultats, liens PDFCP.

### CONFLIT

- Situation de désaccord latente ou déclarée.
- **Attributs** : type (foncier, usage, reboisement, compensation…), gravité, acteurs, localisation, état (latent, actif, résolu), historique, actions de médiation.
- **Règle** : un conflit peut exister sans opposition ; peut évoluer dans le temps.

### OPPOSITION

- Forme explicite et déclarée du conflit.
- **Attributs** : nature (orale, écrite, collective), intensité, date, justifications, risque opérationnel, statut (en cours, levée, escaladée).
- **Règle** : *toute opposition est un conflit, mais tout conflit n’est pas une opposition.*

---

## 4. Logique CONFLIT ↔ OPPOSITION

```
Conflit latent
     ↓
Conflit déclaré
     ↓
Opposition (blocage terrain)
     ↓
Médiation ADP
     ↓
Résolution / Escalade DRANEF
```

**Règles :**

- Une opposition non traitée = risque projet
- Un conflit récurrent = zone sensible
- Plusieurs conflits = alerte territoriale

---

## 5. Animation territoriale

Processus continu (pas une action ponctuelle) :

1. Diagnostic participatif  
2. Organisation des usagers (ODF)  
3. Concertation  
4. Mise en œuvre des activités  
5. Gestion des conflits  
6. Suivi & adaptation  

L’application doit : tracer chaque interaction, conserver l’historique, capitaliser l’expérience terrain.

---

## 6. Aide à la décision

**Indicateurs calculés :**

- Taux de conflits par commune
- Délai moyen de résolution
- Charge ADP
- Zones à risque
- PDFCP bloqués
- Activités non exécutées

**Alertes automatiques :**

- Conflit non traité > X jours
- Opposition répétée
- PDFCP sans activité
- Commune à forte tension sociale

---

## 7. Logique géospatiale

- Chaque entité peut être : **localisée (point)**, **zonée (polygone)**, **rattachée à une commune**.
- Objectifs : carte des conflits, carte des PDFCP, carte des risques sociaux.

---

## 8. Principes clés à intégrer dans le code

1. **Approche participative** avant coercitive  
2. **Traçabilité totale**  
3. **Hiérarchie claire** : ADP → DPANEF → DRANEF  
4. **Historique immuable**  
5. **Données terrain** comme source principale  
6. **Décision** basée sur indicateurs, pas intuition  
