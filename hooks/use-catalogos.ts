"use client"

import useSWR from 'swr';
import { api, Catalogo } from '@/lib/api';

interface UseCatalogosParams {
  limit?: number;
  offset?: number;
  incluirExpirados?: boolean;
}

interface UseCatalogosResult {
  catalogos: Catalogo[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => void;
}

export function useCatalogos(params: UseCatalogosParams = {}): UseCatalogosResult {
  const { limit = 20, offset = 0, incluirExpirados = false } = params;

  const { data, error, isLoading, mutate } = useSWR(
    ['catalogos', limit, offset, incluirExpirados],
    () => api.listarCatalogos({ limit, offset, incluirExpirados }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 10000,
      errorRetryCount: 1,
    }
  );

  return {
    catalogos: data?.catalogos || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
  };
}

interface UseCatalogoResult {
  catalogo: Catalogo | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => void;
}

export function useCatalogo(id: string | null): UseCatalogoResult {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ['catalogo', id] : null,
    () => api.obtenerCatalogo(id!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 1,
    }
  );

  return {
    catalogo: data || null,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
  };
}

export function useCatalogoPorToken(token: string | null): UseCatalogoResult {
  const { data, error, isLoading, mutate } = useSWR(
    token ? ['catalogo-publico', token] : null,
    () => api.obtenerCatalogoPorToken(token!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      errorRetryCount: 1,
    }
  );

  return {
    catalogo: data || null,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
  };
}
