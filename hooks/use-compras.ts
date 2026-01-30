"use client"

import useSWR from 'swr';
import { api, Compra, CompraConDetalle, EstadoCompra } from '@/lib/api';

interface UseComprasParams {
  proveedor_id?: string;
  estado?: EstadoCompra;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

interface UseComprasResult {
  compras: Compra[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => void;
}

export function useCompras(params: UseComprasParams = {}): UseComprasResult {
  const { proveedor_id, estado, desde, hasta, limit = 50, offset = 0 } = params;

  const { data, error, isLoading, mutate } = useSWR(
    ['compras', proveedor_id, estado, desde, hasta, limit, offset],
    () => api.listarCompras({ proveedor_id, estado, desde, hasta, limit, offset }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      dedupingInterval: 10000,
      errorRetryCount: 1,
    }
  );

  return {
    compras: data?.compras || [],
    total: data?.total || 0,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
  };
}

export function useCompra(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    id ? ['compra', id] : null,
    () => api.obtenerCompra(id!),
    {
      revalidateOnFocus: false,
      errorRetryCount: 1,
    }
  );

  return {
    compra: data || null,
    isLoading,
    isError: !!error,
    error: error || null,
    mutate,
  };
}
