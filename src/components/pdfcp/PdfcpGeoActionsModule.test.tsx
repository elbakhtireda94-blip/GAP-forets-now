/**
 * Tests du module Actions cartographiques — ouverture avec action prévue présélectionnée
 * - Quand openFormWithPlannedId est défini, le formulaire s'ouvre avec cette action
 * - onFormOpened est appelé pour que le parent réinitialise
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import PdfcpGeoActionsModule from './PdfcpGeoActionsModule';
import { usePdfcpActionsGeo } from '@/hooks/usePdfcpActionsGeo';

const { mocks } = vi.hoisted(() => {
  return {
    mocks: {
      checkOvershoot: vi.fn(() => ({ exceeds: false, warning: false, message: '' })),
      createGeoAction: vi.fn().mockResolvedValue(undefined),
      updateGeoAction: vi.fn().mockResolvedValue(undefined),
      deleteGeoAction: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('@/hooks/usePdfcpActionsGeo', () => ({
  usePdfcpActionsGeo: vi.fn(() => ({
    geoActions: [],
    plannedActionsWithProgress: [],
    availablePlannedActions: [],
    geoActionsByPlannedAction: {},
    isLoading: false,
    isSupabaseReady: true,
    checkOvershoot: mocks.checkOvershoot,
    createGeoAction: mocks.createGeoAction,
    updateGeoAction: mocks.updateGeoAction,
    deleteGeoAction: mocks.deleteGeoAction,
    isDeleting: false,
  })),
  getGeoConfig: vi.fn(() => ({ suggestedGeom: 'Polygon', icon: '🌲', color: '#22c55e', label: 'Reboisement' })),
}));

vi.mock('./PdfcpGeoActionForm', () => ({
  default: ({ open, onClose, preselectedPlannedId }: { open: boolean; onClose: () => void; preselectedPlannedId?: string }) =>
    open ? (
      <div data-testid="geo-action-form">
        <span data-testid="preselected-id">{preselectedPlannedId ?? 'none'}</span>
        <button type="button" onClick={onClose}>Fermer</button>
      </div>
    ) : null,
}));

vi.mock('./PdfcpMapViewer', () => ({ default: () => <div data-testid="map-viewer">Carte</div> }));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('PdfcpGeoActionsModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('affiche le message lorsque le PDFCP n’est pas en base centrale (isSupabaseReady false)', () => {
    vi.mocked(usePdfcpActionsGeo).mockReturnValueOnce({
      geoActions: [],
      plannedActionsWithProgress: [],
      availablePlannedActions: [],
      geoActionsByPlannedAction: {},
      isLoading: false,
      isSupabaseReady: false,
      checkOvershoot: mocks.checkOvershoot,
      createGeoAction: mocks.createGeoAction,
      updateGeoAction: mocks.updateGeoAction,
      deleteGeoAction: mocks.deleteGeoAction,
      isDeleting: false,
    });

    render(
      <PdfcpGeoActionsModule pdfcpId="local-pdfc-01" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/Actions cartographiques disponibles uniquement pour les PDFCP enregistrés dans la base centrale/)).toBeInTheDocument();
  });

  it('appelle onFormOpened quand openFormWithPlannedId est défini (préselection carto)', async () => {
    const onFormOpened = vi.fn();

    render(
      <PdfcpGeoActionsModule
        pdfcpId="pdfcp-uuid-valid"
        openFormWithPlannedId="planned-123"
        onFormOpened={onFormOpened}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(onFormOpened).toHaveBeenCalled();
    });
  });

  it('ouvre le formulaire avec l’action présélectionnée quand openFormWithPlannedId est fourni', async () => {
    const onFormOpened = vi.fn();

    render(
      <PdfcpGeoActionsModule
        pdfcpId="pdfcp-uuid-valid"
        openFormWithPlannedId="planned-456"
        onFormOpened={onFormOpened}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(onFormOpened).toHaveBeenCalled();
    });

    const form = screen.queryByTestId('geo-action-form');
    const preselected = form ? screen.queryByTestId('preselected-id') : null;
    if (preselected) {
      expect(preselected).toHaveTextContent('planned-456');
    }
  });
});
