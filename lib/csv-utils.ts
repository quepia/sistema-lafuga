/**
 * CSV Utilities for Sistema La Fuga
 * Handles dirty Excel/CSV data cleaning and transformation
 */

import { ProductoInsert } from './supabase';

/**
 * Cleans a price string from various Excel formats and returns a JavaScript number.
 *
 * Handles these common formats:
 * - "$ 1.600,00" (Argentine format with currency symbol)
 * - "1.600,00" (Argentine format)
 * - "1,600.00" (US format)
 * - "$1,600.00" (US format with currency symbol)
 * - "1600" (plain number)
 * - "1600.00" (decimal number)
 * - Empty strings, null, undefined
 *
 * @param priceStr - The raw price string from CSV
 * @returns A clean JavaScript number, or 0 if parsing fails
 */
export function cleanPrice(priceStr: string | null | undefined): number {
  // Handle empty/null values
  if (!priceStr || typeof priceStr !== 'string') {
    return 0;
  }

  // Remove all whitespace
  let cleaned = priceStr.trim();

  // Return 0 for empty strings
  if (cleaned === '') {
    return 0;
  }

  // Remove currency symbols ($ € £ etc.) and common prefixes
  cleaned = cleaned.replace(/[$€£¥₡ARS\s]/gi, '');

  // Detect the format by analyzing the position of dots and commas
  const lastDotIndex = cleaned.lastIndexOf('.');
  const lastCommaIndex = cleaned.lastIndexOf(',');

  if (lastCommaIndex > lastDotIndex) {
    // Format: 1.600,00 (European/Argentine - comma is decimal separator)
    // Remove dots (thousands separator) and replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDotIndex > lastCommaIndex) {
    // Format: 1,600.00 (US/UK - dot is decimal separator)
    // Remove commas (thousands separator)
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastCommaIndex !== -1 && lastDotIndex === -1) {
    // Only commas present: could be "1,600" (thousands) or "1,50" (decimal)
    // Heuristic: if there are exactly 2 digits after the comma, treat as decimal
    const afterComma = cleaned.split(',')[1];
    if (afterComma && afterComma.length === 2) {
      // Likely a decimal: 1,50 -> 1.50
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousands separator: 1,600 -> 1600
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  // If only dots or neither, the string is already in a parseable format

  // Parse the cleaned string to a float
  const result = parseFloat(cleaned);

  // Return 0 if parsing failed
  return isNaN(result) ? 0 : result;
}

/**
 * Represents a row from the CSV file (with uppercase column names)
 */
export interface CsvRow {
  CODIGO?: string;
  PRODUCTO?: string;
  CATEGORIA?: string;
  COSTO?: string;
  PRECIO_MAYOR?: string;
  PRECIO_MENOR?: string;
  UNIDAD?: string;
  CODIGO_BARRA?: string;
  ULTIMA_ACTUALIZACION?: string;
  [key: string]: string | undefined;
}

/**
 * Transforms a CSV row to a database-ready product object
 *
 * CSV Columns -> DB Columns:
 * - CODIGO -> id (PK)
 * - PRODUCTO -> nombre
 * - CATEGORIA -> categoria
 * - COSTO -> costo
 * - PRECIO_MAYOR -> precio_mayor
 * - PRECIO_MENOR -> precio_menor
 * - UNIDAD -> unidad
 * - CODIGO_BARRA -> codigo_barra
 * - ULTIMA_ACTUALIZACION -> ultima_actualizacion
 *
 * @param row - Raw CSV row object
 * @returns Transformed product object or null if invalid (missing CODIGO)
 */
export function transformCsvRow(row: CsvRow): ProductoInsert | null {
  const id = row.CODIGO?.trim();

  // If there's no code, skip this row (id is required)
  if (!id) return null;

  return {
    id,
    nombre: row.PRODUCTO?.trim() || '',
    categoria: row.CATEGORIA?.trim() || null,
    costo: cleanPrice(row.COSTO),
    precio_mayor: cleanPrice(row.PRECIO_MAYOR),
    precio_menor: cleanPrice(row.PRECIO_MENOR),
    unidad: row.UNIDAD?.trim() || null,
    codigo_barra: row.CODIGO_BARRA?.trim() || null,
    ultima_actualizacion: row.ULTIMA_ACTUALIZACION?.trim() || null,
  };
}

/**
 * Result of CSV processing
 */
export interface CsvProcessingResult {
  validProducts: ProductoInsert[];
  invalidRows: { rowNumber: number; reason: string; data: CsvRow }[];
  totalRows: number;
}

/**
 * Processes an array of CSV rows and returns valid products and errors
 *
 * @param rows - Array of raw CSV row objects
 * @returns Processing result with valid products and invalid rows
 */
export function processCsvData(rows: CsvRow[]): CsvProcessingResult {
  const validProducts: ProductoInsert[] = [];
  const invalidRows: { rowNumber: number; reason: string; data: CsvRow }[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because row 1 is header, and index is 0-based

    // Skip completely empty rows
    const hasData = Object.values(row).some((v) => v && v.trim() !== '');
    if (!hasData) {
      return;
    }

    const product = transformCsvRow(row);

    if (product) {
      validProducts.push(product);
    } else {
      invalidRows.push({
        rowNumber,
        reason: 'Campo requerido faltante: CODIGO',
        data: row,
      });
    }
  });

  return {
    validProducts,
    invalidRows,
    totalRows: rows.length,
  };
}
