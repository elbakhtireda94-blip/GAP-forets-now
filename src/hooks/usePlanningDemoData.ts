/**
 * Données démo pour le mode "Présentation DG" – Planning Intelligent
 * Utilisé quand aucun planning n'existe ou en mode démo explicite.
 */

import { useMemo } from 'react';
import type {
  ImpactScoreDetail,
  PlanningPriority,
  PlanningAlert,
  PlanningRecommendation,
  RiskLevel,
} from '@/types/planning';

const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

export interface DemoKpis {
  // Couverture territoriale
  communesCouvertes: number;
  douarsUstTouches: number;
  pctZonesPrioritaires: number;
  // Animation & Médiation
  ateliersPrevus: number;
  reunionsOdf: number;
  conflitsActifs: number;
  interventionsMediationPrevues: number;
  // PDFCP/PDFC
  actionsPlanifieesPdfcp: number;
  pctJalonsMois: number;
  // Logistique
  vehiculesDemandes: number;
  kmEstimes: number;
  carburantL: number;
  budgetEstime: number;
  efficienceLabel: string;
}

export interface DossierDGSection {
  title: string;
  content: string;
}

export function usePlanningDemoData(month: number, year: number) {
  return useMemo(() => {
    const monthLabel = MOIS[month - 1] || '';
    const impactScore: ImpactScoreDetail = {
      impact_participatif: 78,
      avancement_pdfcp: 72,
      gestion_conflits: 65,
      efficience_logistique: 82,
      qualite_livrables: 88,
      total: 74,
    };

    const kpis: DemoKpis = {
      communesCouvertes: 12,
      douarsUstTouches: 28,
      pctZonesPrioritaires: 85,
      ateliersPrevus: 6,
      reunionsOdf: 4,
      conflitsActifs: 3,
      interventionsMediationPrevues: 5,
      actionsPlanifieesPdfcp: 8,
      pctJalonsMois: 60,
      vehiculesDemandes: 2,
      kmEstimes: 420,
      carburantL: 85,
      budgetEstime: 12500,
      efficienceLabel: 'Bon (15,2 DH/impact)',
    };

    const priorities: PlanningPriority[] = [
      {
        id: 'p1',
        itemId: 'demo1',
        title: 'Atelier ODF – Azrou',
        objective: 'Valider le plan d’action annuel de l’ODF',
        justification: 'Jalon clé pour le PDFCP 2025 et engagement des partenaires.',
        impactAttendu: 'Forte adhésion + avancement jalon diagnostic.',
        risk: 'Faible',
        besoinLogistique: '1 véhicule, salle commune.',
      },
      {
        id: 'p2',
        itemId: 'demo2',
        title: 'Médiation conflit pastoral – Sidi Yahia',
        objective: 'Réunion de conciliation avec éleveurs et commune',
        justification: 'Conflit actif identifié ; risque d’escalade sans intervention.',
        impactAttendu: 'Désaturation du conflit, prévention escalade.',
        risk: 'Moyen',
        besoinLogistique: '1 véhicule, déplacement 80 km.',
      },
      {
        id: 'p3',
        itemId: 'demo3',
        title: 'Suivi reboisement PDFCP – Périmètre Ain Leuh',
        objective: 'Contrôle des plantations et PV de réception',
        justification: 'Étape validation technique du PDFCP en cours.',
        impactAttendu: 'Jalon « suivi reboisement » validé.',
        risk: 'Faible',
        besoinLogistique: '1 véhicule 4x4, 1 jour.',
      },
      {
        id: 'p4',
        itemId: 'demo4',
        title: 'Sensibilisation droits d’usage – Douar Tizi',
        objective: 'Réunion d’information sur les droits et obligations',
        justification: 'Zone à risque de conflit ; prévention par l’information.',
        impactAttendu: 'Réduction des litiges futurs, alignement avec ANEF 2030.',
        risk: 'Faible',
        besoinLogistique: 'Covoiturage avec commune.',
      },
      {
        id: 'p5',
        itemId: 'demo5',
        title: 'Réunion de coordination DPANEF – Suivi mensuel',
        objective: 'Point avec DPANEF sur avancement et besoins',
        justification: 'Pilotage et alignement hiérarchique.',
        impactAttendu: 'Décisions d’arbitrage et visibilité régionale.',
        risk: 'Faible',
        besoinLogistique: 'Déplacement siège DPANEF.',
      },
    ];

    const alerts: PlanningAlert[] = [
      { id: 'a1', severity: 'orange', title: 'Surcharge 15 mars', description: '3 activités prévues le même jour.', suggestion: 'Décaler l’atelier ODF au 17 mars.' },
      { id: 'a2', severity: 'vert', title: 'Logistique cohérente', description: 'Véhicules et trajets alignés avec les activités.', suggestion: undefined },
      { id: 'a3', severity: 'rouge', title: 'Conflit non traité', description: '1 conflit actif (Sidi Yahia) sans action de médiation prévue cette semaine.', suggestion: 'Ajouter une réunion de médiation avant le 20.' },
      { id: 'a4', severity: 'orange', title: 'Jalon PDFCP manquant', description: 'Étape « validation diagnostic » prévue ce mois non encore planifiée.', suggestion: 'Planifier la réunion de validation avec la commune.' },
    ];

    const recommendations: PlanningRecommendation[] = [
      {
        id: 'r1',
        type: 'reorganiser',
        title: 'Réorganiser la semaine du 15',
        description: 'Déplacer l’atelier ODF du 15 au 17 mars pour éviter la surcharge.',
        details: ['15 mars : 3 activités → 2 en décalant atelier ODF', '17 mars : créneau libéré pour atelier'],
        why: 'Réduction du risque opérationnel et meilleure qualité des livrables (PV, participation).',
      },
      {
        id: 'r2',
        type: 'mutualiser',
        title: 'Mutualiser les déplacements Sidi Yahia / Tizi',
        description: 'Regrouper médiation et sensibilisation sur 2 jours consécutifs dans la même zone.',
        details: ['1 seul véhicule pour 2 jours', 'Économie estimée : ~40 L carburant'],
        why: 'Efficience logistique et coût/impact amélioré.',
      },
      {
        id: 'r3',
        type: 'prioriser',
        title: 'Prioriser 3 activités à faire absolument',
        description: 'En cas de ressources limitées : Atelier ODF Azrou, Médiation Sidi Yahia, Suivi reboisement Ain Leuh.',
        details: ['À décaler si besoin : Réunion coordination (déjà en fin de mois), Sensibilisation Tizi'],
        why: 'Alignement avec jalons PDFCP et gestion des conflits actifs (ANEF 2020–2030).',
      },
    ];

    const dossierDG: DossierDGSection[] = [
      {
        title: '1. Contexte & objectifs mensuels',
        content: `Planning ${monthLabel} ${year} – DPANEF Kénitra / ADP terrain. Objectifs alignés avec la stratégie Forêts du Maroc 2020–2030 : renforcement de l’approche participative, suivi des ODF/UST, avancement des PDFCP, médiation des conflits et animation territoriale. Couverture cible : 12 communes, 28 douars/UST, 85 % des zones prioritaires.`,
      },
      {
        title: '2. Actions clés par axe',
        content: `Animation & médiation : 6 ateliers prévus, 4 réunions ODF, 5 interventions de médiation (3 conflits actifs identifiés). PDFCP/PDFC : 8 actions liées aux étapes (diagnostic, validation, suivi). Socio-économique : sensibilisation droits d’usage, appui aux coopératives.`,
      },
      {
        title: '3. Impacts attendus',
        content: `Couverture territoriale : 12 communes, 28 douars/UST. Avancement PDFCP : 60 % des jalons du mois planifiés. Gestion des conflits : 5 interventions prévues pour 3 conflits actifs. Livrables : PV d’ateliers, fiches projet, rapport de suivi reboisement.`,
      },
      {
        title: '4. Risques & mesures de mitigation',
        content: `Risque opérationnel : Moyen (surcharge ponctuelle 15 mars) – mesure : réorganisation proposée. Risque social : 1 conflit actif – mesure : médiation planifiée. Risque météo : suivi reboisement – report possible en cas d’intempéries.`,
      },
      {
        title: '5. Besoins logistiques & arbitrages demandés',
        content: `Véhicules : 2 demandés. Km estimés : 420. Carburant : 85 L. Budget estimatif : 12 500 DH. Efficience : 15,2 DH/point d’impact. Arbitrage demandé DPANEF : validation des 2 véhicules pour la 2e quinzaine.`,
      },
      {
        title: '6. Décisions attendues',
        content: `DPANEF : validation du planning et des moyens (véhicules, budget). DRANEF : information et visibilité régionale. DG : synthèse pour pilotage stratégique (optionnel).`,
      },
    ];

    const operationalRisk: RiskLevel = 'Moyen';

    return {
      impactScore,
      kpis,
      priorities,
      alerts,
      recommendations,
      dossierDG,
      operationalRisk,
      monthLabel,
    };
  }, [month, year]);
}
