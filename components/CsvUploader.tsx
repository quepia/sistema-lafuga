'use client';

import { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { supabase, ProductoInsert } from '@/lib/supabase';
import { CsvRow, processCsvData } from '@/lib/csv-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface UploadResult {
  success: boolean;
  message: string;
  processed: number;
  errors: string[];
}

interface ProcessingStats {
  totalRows: number;
  validProducts: number;
  invalidRows: number;
}

type UploadStatus = 'idle' | 'parsing' | 'uploading' | 'success' | 'error';

export default function CsvUploader() {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [stats, setStats] = useState<ProcessingStats | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setStatus('idle');
    setProgress(0);
    setResult(null);
    setStats(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const uploadToSupabase = useCallback(async (products: ProductoInsert[]): Promise<UploadResult> => {
    const BATCH_SIZE = 100;
    const batches: ProductoInsert[][] = [];

    // Split into batches for better performance and error handling
    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      batches.push(products.slice(i, i + BATCH_SIZE));
    }

    let totalProcessed = 0;
    const errors: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        const { error } = await supabase
          .from('productos')
          .upsert(batch, {
            onConflict: 'id',
            ignoreDuplicates: false,
          });

        if (error) {
          errors.push(`Lote ${i + 1}: ${error.message}`);
        } else {
          totalProcessed += batch.length;
        }
      } catch (err) {
        errors.push(`Lote ${i + 1}: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }

      // Update progress
      setProgress(Math.round(((i + 1) / batches.length) * 100));
    }

    return {
      success: errors.length === 0,
      message: errors.length === 0
        ? `Se procesaron ${totalProcessed} productos correctamente.`
        : `Se procesaron ${totalProcessed} productos con ${errors.length} errores.`,
      processed: totalProcessed,
      errors,
    };
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setStatus('parsing');
    setProgress(0);
    setResult(null);
    setStats(null);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: async (results) => {
        if (results.errors.length > 0) {
          setStatus('error');
          setResult({
            success: false,
            message: 'Error al parsear el archivo CSV',
            processed: 0,
            errors: results.errors.map((e) => `Fila ${e.row}: ${e.message}`),
          });
          return;
        }

        // Process and validate CSV data using the utility function
        const processed = processCsvData(results.data);

        setStats({
          totalRows: processed.totalRows,
          validProducts: processed.validProducts.length,
          invalidRows: processed.invalidRows.length,
        });

        if (processed.validProducts.length === 0) {
          setStatus('error');
          setResult({
            success: false,
            message: 'No se encontraron productos válidos. Verifica que el CSV tenga la columna CODIGO.',
            processed: 0,
            errors: processed.invalidRows.length > 0
              ? processed.invalidRows.map(r => `Fila ${r.rowNumber}: ${r.reason}`)
              : ['Ninguna fila tiene un código válido'],
          });
          return;
        }

        // Upload to Supabase
        setStatus('uploading');
        setProgress(0);

        const uploadResult = await uploadToSupabase(processed.validProducts);
        setResult(uploadResult);
        setStatus(uploadResult.success ? 'success' : 'error');
      },
      error: (error) => {
        setStatus('error');
        setResult({
          success: false,
          message: `Error al leer el archivo: ${error.message}`,
          processed: 0,
          errors: [error.message],
        });
      },
    });
  }, [uploadToSupabase]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0 && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      fileInputRef.current.files = dataTransfer.files;
      fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Importar Productos desde CSV
        </CardTitle>
        <CardDescription>
          Sube un archivo CSV con los productos. El sistema actualizará productos existentes
          o creará nuevos según el código.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Drop Zone */}
        {status === 'idle' && (
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Arrastra un archivo CSV aquí o haz clic para seleccionar
            </p>
            <p className="text-xs text-muted-foreground">
              Columnas: CODIGO, PRODUCTO, CATEGORIA, COSTO, PRECIO_MAYOR, PRECIO_MENOR, UNIDAD, CODIGO_BARRA
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Processing Status */}
        {(status === 'parsing' || status === 'uploading') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">
                {status === 'parsing' ? 'Analizando archivo...' : 'Subiendo datos...'}
              </span>
            </div>
            {status === 'uploading' && (
              <Progress value={progress} className="w-full" />
            )}
            {fileName && (
              <p className="text-xs text-muted-foreground">Archivo: {fileName}</p>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {result.success ? 'Importación Exitosa' : 'Error en la Importación'}
              </AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-2xl font-bold">{stats.totalRows}</p>
                  <p className="text-xs text-muted-foreground">Filas totales</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-600">
                    {stats.validProducts}
                  </p>
                  <p className="text-xs text-muted-foreground">Válidos</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3">
                  <p className="text-2xl font-bold text-red-600">
                    {stats.invalidRows}
                  </p>
                  <p className="text-xs text-muted-foreground">Sin código</p>
                </div>
              </div>
            )}

            {/* Error Details */}
            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Errores encontrados ({result.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 max-h-32 overflow-y-auto text-xs">
                    {result.errors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... y {result.errors.length - 10} errores más</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Reset Button */}
            <Button onClick={resetState} variant="outline" className="w-full">
              Subir otro archivo
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-xs text-muted-foreground border-t pt-4 space-y-1">
          <p><strong>Columna requerida:</strong> CODIGO</p>
          <p><strong>Columnas opcionales:</strong> PRODUCTO, CATEGORIA, COSTO, PRECIO_MAYOR, PRECIO_MENOR, UNIDAD, CODIGO_BARRA, ULTIMA_ACTUALIZACION</p>
          <p><strong>Formatos de precio soportados:</strong> &quot;$ 1.600,00&quot;, &quot;1,600.00&quot;, &quot;1600&quot;</p>
        </div>
      </CardContent>
    </Card>
  );
}

export { CsvUploader };
