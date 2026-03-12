"use client"

import { useState, useCallback } from 'react';
import {
  Catalogo,
  CatalogoProducto,
  CamposVisibles,
  CAMPOS_VISIBLES_DEFAULT,
  CatalogoTipoPrecio,
} from '@/lib/supabase';

export type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  step: WizardStep;
  clienteNombre: string;
  titulo: string;
  tipoPrecio: CatalogoTipoPrecio;
  duracionDias: number;
  productosSeleccionados: Map<string, CatalogoProducto>;
  descuentoGlobal: number;
  camposVisibles: CamposVisibles;
}

export function useCatalogoBuilder() {
  const [state, setState] = useState<WizardState>({
    step: 1,
    clienteNombre: '',
    titulo: 'Catálogo de Precios',
    tipoPrecio: 'mayor',
    duracionDias: 10,
    productosSeleccionados: new Map(),
    descuentoGlobal: 0,
    camposVisibles: { ...CAMPOS_VISIBLES_DEFAULT },
  });

  const nextStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: Math.min(prev.step + 1, 4) as WizardStep
    }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: Math.max(prev.step - 1, 1) as WizardStep
    }));
  }, []);

  const goToStep = useCallback((step: WizardStep) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  const toggleProducto = useCallback((productoId: string) => {
    setState(prev => {
      const newMap = new Map(prev.productosSeleccionados);
      if (newMap.has(productoId)) {
        newMap.delete(productoId);
      } else {
        newMap.set(productoId, {
          producto_id: productoId,
          descuento_individual: 0,
          precio_personalizado: null
        });
      }
      return { ...prev, productosSeleccionados: newMap };
    });
  }, []);

  const selectProductos = useCallback((productoIds: string[]) => {
    setState(prev => {
      const newMap = new Map(prev.productosSeleccionados);
      productoIds.forEach(id => {
        if (!newMap.has(id)) {
          newMap.set(id, {
            producto_id: id,
            descuento_individual: 0,
            precio_personalizado: null
          });
        }
      });
      return { ...prev, productosSeleccionados: newMap };
    });
  }, []);

  const deselectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      productosSeleccionados: new Map()
    }));
  }, []);

  const setDescuentoIndividual = useCallback((productoId: string, descuento: number) => {
    setState(prev => {
      const newMap = new Map(prev.productosSeleccionados);
      const producto = newMap.get(productoId);
      if (producto) {
        newMap.set(productoId, { ...producto, descuento_individual: descuento });
      }
      return { ...prev, productosSeleccionados: newMap };
    });
  }, []);

  const setPrecioPersonalizado = useCallback((productoId: string, precio: number | null) => {
    setState(prev => {
      const newMap = new Map(prev.productosSeleccionados);
      const producto = newMap.get(productoId);
      if (producto) {
        newMap.set(productoId, { ...producto, precio_personalizado: precio });
      }
      return { ...prev, productosSeleccionados: newMap };
    });
  }, []);

  const setDescuentoGlobal = useCallback((descuento: number) => {
    setState(prev => ({ ...prev, descuentoGlobal: descuento }));
  }, []);

  const toggleCampo = useCallback((campo: keyof CamposVisibles) => {
    setState(prev => ({
      ...prev,
      camposVisibles: {
        ...prev.camposVisibles,
        [campo]: !prev.camposVisibles[campo]
      }
    }));
  }, []);

  const setCamposVisibles = useCallback((campos: CamposVisibles) => {
    setState(prev => ({ ...prev, camposVisibles: campos }));
  }, []);

  const setClienteNombre = useCallback((nombre: string) => {
    setState(prev => ({ ...prev, clienteNombre: nombre }));
  }, []);

  const setTitulo = useCallback((titulo: string) => {
    setState(prev => ({ ...prev, titulo: titulo }));
  }, []);

  const setTipoPrecio = useCallback((tipoPrecio: CatalogoTipoPrecio) => {
    setState(prev => ({ ...prev, tipoPrecio }));
  }, []);

  const setDuracionDias = useCallback((duracionDias: number) => {
    setState(prev => ({
      ...prev,
      duracionDias: Math.min(Math.max(duracionDias || 1, 1), 365)
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      step: 1,
      clienteNombre: '',
      titulo: 'Catálogo de Precios',
      tipoPrecio: 'mayor',
      duracionDias: 10,
      productosSeleccionados: new Map(),
      descuentoGlobal: 0,
      camposVisibles: { ...CAMPOS_VISIBLES_DEFAULT },
    });
  }, []);

  const loadCatalogo = useCallback((catalogo: Catalogo) => {
    const productosSeleccionados = new Map<string, CatalogoProducto>();

    catalogo.productos.forEach((producto) => {
      productosSeleccionados.set(producto.producto_id, {
        producto_id: producto.producto_id,
        descuento_individual: producto.descuento_individual ?? 0,
        precio_personalizado: producto.precio_personalizado ?? null,
      });
    });

    const milisegundosRestantes = new Date(catalogo.expires_at).getTime() - Date.now();
    const duracionDias = Math.max(1, Math.ceil(milisegundosRestantes / (24 * 60 * 60 * 1000)));

    setState({
      step: 1,
      clienteNombre: catalogo.cliente_nombre,
      titulo: catalogo.titulo,
      tipoPrecio: catalogo.tipo_precio || 'mayor',
      duracionDias,
      productosSeleccionados,
      descuentoGlobal: catalogo.descuento_global ?? 0,
      camposVisibles: {
        ...CAMPOS_VISIBLES_DEFAULT,
        ...catalogo.campos_visibles,
      },
    });
  }, []);

  // Convert Map to array for saving
  const getProductosArray = useCallback((): CatalogoProducto[] => {
    return Array.from(state.productosSeleccionados.values());
  }, [state.productosSeleccionados]);

  // Get selected product IDs
  const getProductoIds = useCallback((): string[] => {
    return Array.from(state.productosSeleccionados.keys());
  }, [state.productosSeleccionados]);

  const getProductoOrder = useCallback((productoId: string): number => {
    return Array.from(state.productosSeleccionados.keys()).findIndex((id) => id === productoId);
  }, [state.productosSeleccionados]);

  // Check if a product is selected
  const isProductoSelected = useCallback((productoId: string): boolean => {
    return state.productosSeleccionados.has(productoId);
  }, [state.productosSeleccionados]);

  // Get product config
  const getProductoConfig = useCallback((productoId: string): CatalogoProducto | undefined => {
    return state.productosSeleccionados.get(productoId);
  }, [state.productosSeleccionados]);

  return {
    state,
    // Navigation
    nextStep,
    prevStep,
    goToStep,
    // Products
    toggleProducto,
    selectProductos,
    deselectAll,
    setDescuentoIndividual,
    setPrecioPersonalizado,
    isProductoSelected,
    getProductoConfig,
    // Global settings
    setDescuentoGlobal,
    toggleCampo,
    setCamposVisibles,
    setClienteNombre,
    setTitulo,
    setTipoPrecio,
    setDuracionDias,
    // Utilities
    reset,
    loadCatalogo,
    getProductosArray,
    getProductoIds,
    getProductoOrder,
    productosCount: state.productosSeleccionados.size,
    canProceed: {
      step1: state.productosSeleccionados.size > 0,
      step2: true, // Can always continue
      step3: true, // Can always continue
      step4: state.clienteNombre.trim().length > 0,
    }
  };
}
