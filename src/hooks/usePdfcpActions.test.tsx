/**
 * Tests du hook usePdfcpActions — lien saisie action → cartographie
 * - addAction retourne l'id créé (via Supabase insert().select('id').single())
 * - onActionAdded est appelé après succès avec cet id
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePdfcpActions, type AddActionParams } from './usePdfcpActions';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    get from() {
      return mockFrom;
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { auth_user_id: 'user-test-123' },
  }),
}));

vi.mock('@/integrations/mysql-api/client', () => ({
  useMySQLBackend: () => false,
  mysqlApi: {},
}));

vi.mock('@/hooks/useDemo', () => ({
  useDemo: () => ({ isDemoReadonly: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

function createSupabaseMock(createdId: string) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: createdId }, error: null }),
      }),
    }),
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  };
}

describe('usePdfcpActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => createSupabaseMock('action-created-uuid-456'));
  });

  it('appelle supabase.from("pdfcp_actions").insert().select("id").single()', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'new-action-id' }, error: null }),
      }),
    });
    mockFrom.mockReturnValue({
      ...createSupabaseMock('new-action-id'),
      insert: insertMock,
    });

    const { result } = renderHook(() => usePdfcpActions('pdfcp-uuid-1'), {
      wrapper: createWrapper(),
    });

    result.current.addAction({
      pdfcp_id: 'pdfcp-uuid-1',
      action_key: 'REBOISEMENT',
      year: 2024,
      etat: 'CONCERTE',
      unite: 'ha',
      physique: 10,
      financier: 50000,
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('pdfcp_actions');
      expect(insertMock).toHaveBeenCalled();
    });
  });

  it('appelle onActionAdded avec l’id créé après succès de addAction', async () => {
    const createdId = 'created-action-789';
    mockFrom.mockImplementation(() => createSupabaseMock(createdId));

    const onActionAdded = vi.fn();

    const { result } = renderHook(
      () => usePdfcpActions('pdfcp-uuid-2', { onActionAdded }),
      { wrapper: createWrapper() }
    );

    result.current.addAction({
      pdfcp_id: 'pdfcp-uuid-2',
      action_key: 'PISTE',
      year: 2025,
      etat: 'CONCERTE',
      unite: 'km',
      physique: 5,
      financier: 100000,
    });

    await waitFor(() => {
      expect(onActionAdded).toHaveBeenCalledWith(createdId);
    });
  });

  it('n’appelle pas onActionAdded si l’option n’est pas fournie', async () => {
    const onActionAdded = vi.fn();
    mockFrom.mockImplementation(() => createSupabaseMock('any-id'));

    const { result } = renderHook(() => usePdfcpActions('pdfcp-uuid-3'), {
      wrapper: createWrapper(),
    });

    result.current.addAction({
      pdfcp_id: 'pdfcp-uuid-3',
      action_key: 'DRS',
      year: 2024,
      etat: 'CONCERTE',
      unite: 'ha',
      physique: 20,
      financier: 80000,
    });

    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith('pdfcp_actions');
    });
    expect(onActionAdded).not.toHaveBeenCalled();
  });
});
