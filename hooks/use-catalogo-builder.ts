"use client"

import { useState, useCallback } from 'react';
import { CatalogoProducto, CamposVisibles, CAMPOS_VISIBLES_DEFAULT } from '@/lib/supabase';

export type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  step: WizardStep;
  clienteNombre: string;
  titulo: string;
  productosSeleccionados: Map<string, CatalogoProducto>;
  descuentoGlobal: number;
  camposVisibles: CamposVisibles;
}

export function useCatalogoBuilder() {
  const [state, setState] = useState<WizardState>({
    step: 1,
    clienteNombre: '',
    titulo: 'Catálogo de Precios',
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

  const reset = useCallback(() => {
    setState({
      step: 1,
      clienteNombre: '',
      titulo: 'Catálogo de Precios',
      productosSeleccionados: new Map(),
      descuentoGlobal: 0,
      camposVisibles: { ...CAMPOS_VISIBLES_DEFAULT },
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
    // Utilities
    reset,
    getProductosArray,
    getProductoIds,
    productosCount: state.productosSeleccionados.size,
    canProceed: {
      step1: state.productosSeleccionados.size > 0,
      step2: true, // Can always continue
      step3: true, // Can always continue
      step4: state.clienteNombre.trim().length > 0,
    }
  };
}
