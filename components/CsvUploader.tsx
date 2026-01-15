'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

// Interfaz para los datos del CSV (columnas "sucias")
interface CsvRow {
  CÓDIGO?: string;
  PRODUCTO?: string;
  CATEGORIA?: string;
  PRECIO_MENOR?: string;
  PRECIO_MAYOR?: string;
  UNIDAD?: string;
  CODIGO_BARRA?: string;
}

// Interfaz para el producto limpio que va a Supabase
interface ProductoSupabase {
  id: string;
  nombre: string;
  categoria: string;
  precio_menor: number;
  precio_mayor: number;
  unidad: string | null;
  codigo_: string | null;
}

type UploadStatus = 'idle' | 'processing' | 'success' | 'error';

/**
 * Función robusta para limpiar y parsear precios.
 * Maneja formatos como:
 * - "1.600,00" (formato latino: punto como separador de miles, coma como decimal)
 * - "$ 1.600,00" (con símbolo de moneda)
 * - "1,600.00" (formato anglosajón: coma como separador de miles, punto como decimal)
 * - "1600" (sin separadores)
 */
function cleanPrice(value: string | null | undefined): number {
  if (!value || value.trim() === '') return 0;

  // Paso 1: Eliminar cualquier caracter que no sea número, punto o coma
  let cleaned = value.replace(/[^\d.,]/g, '');

  if (cleaned === '') return 0;

  // Paso 2: Detectar el formato y normalizar
  // Contar ocurrencias de punto y coma
  const dots = (cleaned.match(/\./g) || []).length;
  const commas = (cleaned.match(/,/g) || []).length;

  // Encontrar las posiciones del último punto y última coma
  const lastDotIndex = cleaned.lastIndexOf('.');
  const lastCommaIndex = cleaned.lastIndexOf(',');

  // Determinar cuál es el separador decimal basado en la posición
  // El separador decimal es típicamente el último separador
  if (dots > 0 && commas > 0) {
    // Hay ambos separadores
    if (lastCommaIndex > lastDotIndex) {
      // Formato latino: 1.000,50 -> coma es decimal
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // Formato anglosajón: 1,000.50 -> punto es decimal
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (commas > 0) {
    // Solo hay comas
    if (commas === 1) {
      // Podría ser decimal (1000,50) o miles (1,000)
      // Si tiene 3 dígitos después de la coma, probablemente es separador de miles
      const afterComma = cleaned.split(',')[1];
      if (afterComma && afterComma.length === 3) {
        // Es separador de miles: 1,000 -> 1000
        cleaned = cleaned.replace(',', '');
      } else {
        // Es separador decimal: 1000,50 -> 1000.50
        cleaned = cleaned.replace(',', '.');
      }
    } else {
      // Múltiples comas = separadores de miles: 1,000,000 -> 1000000
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (dots > 1) {
    // Múltiples puntos = separadores de miles (formato latino): 1.000.000 -> 1000000
    cleaned = cleaned.replace(/\./g, '');
  }
  // Si solo hay un punto, asumimos que es decimal (formato estándar JS)

  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : result;
}

/**
 * Mapea y limpia una fila del CSV al formato de Supabase
 */
function mapCsvRowToProducto(row: CsvRow): ProductoSupabase | null {
  const id = row.CÓDIGO?.trim();

  // Si no hay código, saltamos esta fila
  if (!id) return null;

  return {
    id,
    nombre: row.PRODUCTO?.trim() || '',
    categoria: row.CATEGORIA?.trim() || '',
    precio_menor: cleanPrice(row.PRECIO_MENOR),
    precio_mayor: cleanPrice(row.PRECIO_MAYOR),
    unidad: row.UNIDAD?.trim() || null,
    codigo_: row.CODIGO_BARRA?.trim() || null,
  };
}

export default function CsvUploader() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState<string>('');
  const [processedCount, setProcessedCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    setMessage('Leyendo archivo CSV...');
    setProcessedCount(0);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        try {
          setMessage('Procesando y limpiando datos...');

          // Mapear y filtrar filas válidas
          const productos = results.data
            .map(mapCsvRowToProducto)
            .filter((p): p is ProductoSupabase => p !== null);

          if (productos.length === 0) {
            setStatus('error');
            setMessage('No se encontraron productos válidos en el CSV. Verifica que tenga la columna CÓDIGO.');
            return;
          }

          setMessage(`Subiendo ${productos.length} productos a Supabase...`);

          // Usar upsert para insertar o actualizar basado en el id (PK)
          const { data, error } = await supabase
            .from('productos')
            .upsert(productos, {
              onConflict: 'id',
              ignoreDuplicates: false,
            });

          if (error) {
            console.error('Error de Supabase:', error);
            setStatus('error');
            setMessage(`Error al subir: ${error.message}`);
            return;
          }

          setProcessedCount(productos.length);
          setStatus('success');
          setMessage(`${productos.length} productos importados/actualizados correctamente.`);
        } catch (err) {
          console.error('Error procesando CSV:', err);
          setStatus('error');
          setMessage(`Error inesperado: ${err instanceof Error ? err.message : 'Error desconocido'}`);
        }
      },
      error: (error) => {
        console.error('Error parseando CSV:', error);
        setStatus('error');
        setMessage(`Error al leer el archivo: ${error.message}`);
      },
    });

    // Limpiar el input para permitir subir el mismo archivo de nuevo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'processing':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        );
      case 'success':
        return <span className="mr-2">&#10003;</span>;
      case 'error':
        return <span className="mr-2">&#10007;</span>;
      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Importar Inventario
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Selecciona un archivo CSV con las columnas: CÓDIGO, PRODUCTO, CATEGORIA, PRECIO_MENOR, PRECIO_MAYOR, UNIDAD, CODIGO_BARRA
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={handleButtonClick}
          disabled={status === 'processing'}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400
                     text-white font-medium rounded-lg transition-colors duration-200
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                     disabled:cursor-not-allowed"
        >
          {status === 'processing' ? 'Procesando...' : 'Seleccionar archivo CSV'}
        </button>

        {status !== 'idle' && (
          <div
            className={`flex items-center p-4 rounded-lg border ${getStatusStyles()}`}
          >
            {getStatusIcon()}
            <span className="flex-1">{message}</span>
          </div>
        )}

        {status === 'success' && processedCount > 0 && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Total procesados: <span className="font-medium">{processedCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
