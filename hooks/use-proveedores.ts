"use client"

import useSWR from 'swr';
import { api, Proveedor } from '@/lib/api';

interface UseProveedoresParams {
  query?: string;
  activo?: boolean;
  limit?: number;
  offset?: number;
}

interface UseProveedoresResult {
  proveedores: Proveedor[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => void;
}

export function useProveedores(params: UseProveedoresParams = {}): UseProveedoresResult {
  const { query, activo, limit = 50, offset = 0 } = params;

  const { data, error, isLoading, mutate } = useSWR(
    ['proveedores', query, activo, limit, offset],
    () => api.listarProveedores({ query, activo, limit, offset }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 10000,
      errorRetryCount: 1,
    }
  );

  return {
    proveedores: data?.proveedores || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
  };
}

export function useProveedoresActivos() {
  const { data, error, isLoading, mutate } = useSWR(
    'proveedores-activos',
    () => api.obtenerProveedoresActivos(),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      errorRetryCount: 1,
    }
  );

  return {
    proveedores: data || [],
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
  };
}

export function useProveedor(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ['proveedor', id] : null,
    () => api.obtenerProveedor(id!),
    {
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );

  return {
    proveedor: data || null,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
  };
}
