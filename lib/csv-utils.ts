/**
 * CSV Utilities for Sistema La Fuga
 * Handles dirty Excel/CSV data cleaning and transformation
 */

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
 * CSV Column mapping from CSV headers to database columns
 */
export interface CsvColumnMapping {
  csvColumn: string;
  dbColumn: string;
  transform?: (value: string) => string | number | null;
}

/**
 * Default column mapping for the productos table
 */
export const DEFAULT_COLUMN_MAPPING: CsvColumnMapping[] = [
  { csvColumn: 'CÓDIGO', dbColumn: 'id', transform: (v) => v?.trim() || null },
  { csvColumn: 'PRODUCTO', dbColumn: 'nombre', transform: (v) => v?.trim() || '' },
  { csvColumn: 'CATEGORIA', dbColumn: 'categoria', transform: (v) => v?.trim() || 'Sin categoría' },
  { csvColumn: 'PRECIO_MENOR', dbColumn: 'precio_menor', transform: cleanPrice },
  { csvColumn: 'PRECIO_MAYOR', dbColumn: 'precio_mayor', transform: cleanPrice },
  { csvColumn: 'PREIO_MAYOR', dbColumn: 'precio_mayor', transform: cleanPrice }, // Handle typo in CSV
  { csvColumn: 'UNIDAD', dbColumn: 'unidad', transform: (v) => v?.trim() || null },
  { csvColumn: 'CODIGO_BARRA', dbColumn: 'codigo_barra', transform: (v) => v?.trim() || null },
];

/**
 * Represents a row from the CSV file
 */
export interface CsvRow {
  [key: string]: string;
}

/**
 * Represents a product ready for database insertion
 */
export interface ProductoDb {
  id: string;
  nombre: string;
  categoria: string;
  precio_menor: number;
  precio_mayor: number;
  unidad: string | null;
  codigo_barra: string | null;
}

/**
 * Transforms a CSV row to a database-ready product object
 *
 * @param row - Raw CSV row object
 * @param mapping - Column mapping configuration
 * @returns Transformed product object or null if invalid
 */
export function transformCsvRow(
  row: CsvRow,
  mapping: CsvColumnMapping[] = DEFAULT_COLUMN_MAPPING
): ProductoDb | null {
  const result: Partial<ProductoDb> = {};

  for (const { csvColumn, dbColumn, transform } of mapping) {
    const rawValue = row[csvColumn];

    if (rawValue !== undefined) {
      const transformedValue = transform ? transform(rawValue) : rawValue;
      (result as Record<string, unknown>)[dbColumn] = transformedValue;
    }
  }

  // Validate required fields
  if (!result.id || !result.nombre) {
    return null;
  }

  // Ensure all required fields have defaults
  return {
    id: result.id,
    nombre: result.nombre || '',
    categoria: result.categoria || 'Sin categoría',
    precio_menor: result.precio_menor ?? 0,
    precio_mayor: result.precio_mayor ?? 0,
    unidad: result.unidad ?? null,
    codigo_barra: result.codigo_barra ?? null,
  };
}

/**
 * Result of CSV processing
 */
export interface CsvProcessingResult {
  validProducts: ProductoDb[];
  invalidRows: { rowNumber: number; reason: string; data: CsvRow }[];
  totalRows: number;
}

/**
 * Processes an array of CSV rows and returns valid products and errors
 *
 * @param rows - Array of raw CSV row objects
 * @param mapping - Column mapping configuration
 * @returns Processing result with valid products and invalid rows
 */
export function processCsvData(
  rows: CsvRow[],
  mapping: CsvColumnMapping[] = DEFAULT_COLUMN_MAPPING
): CsvProcessingResult {
  const validProducts: ProductoDb[] = [];
  const invalidRows: { rowNumber: number; reason: string; data: CsvRow }[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2; // +2 because row 1 is header, and index is 0-based

    // Skip completely empty rows
    const hasData = Object.values(row).some((v) => v && v.trim() !== '');
    if (!hasData) {
      return;
    }

    const product = transformCsvRow(row, mapping);

    if (product) {
      validProducts.push(product);
    } else {
      const missingFields: string[] = [];
      if (!row['CÓDIGO'] || row['CÓDIGO'].trim() === '') {
        missingFields.push('CÓDIGO');
      }
      if (!row['PRODUCTO'] || row['PRODUCTO'].trim() === '') {
        missingFields.push('PRODUCTO');
      }

      invalidRows.push({
        rowNumber,
        reason: `Campos requeridos faltantes: ${missingFields.join(', ')}`,
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
