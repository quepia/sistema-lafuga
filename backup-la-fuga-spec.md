# Sistema de Backup Automático - LA FUGA

## Objetivo

Implementar un sistema de backup semanal automatizado que exporte las listas de precios desde Supabase y las almacene en Google Drive en formato Excel (.xlsx).

## Arquitectura Propuesta

### Opción Recomendada: GitHub Actions + Google Drive API

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  GitHub Actions │────▶│    Supabase     │────▶│  Google Drive   │
│  (Cron semanal) │     │   (Postgres)    │     │   (Backups)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Ventajas:**
- Gratuito (2000 minutos/mes en repos privados)
- No requiere servidor propio
- Logs y historial de ejecuciones
- Fácil de mantener junto al código del proyecto

## Implementación

### 1. Estructura de archivos a crear

```
la-fuga/
├── .github/
│   └── workflows/
│       └── backup-prices.yml
├── scripts/
│   └── backup/
│       ├── index.ts
│       ├── supabase-export.ts
│       ├── excel-generator.ts
│       └── google-drive-upload.ts
└── package.json (agregar dependencias)
```

### 2. Dependencias necesarias

```bash
npm install exceljs googleapis
npm install -D @types/node tsx
```

### 3. GitHub Actions Workflow

Crear `.github/workflows/backup-prices.yml`:

```yaml
name: Backup Listas de Precios

on:
  schedule:
    # Ejecutar todos los domingos a las 3:00 AM (Argentina UTC-3 = 6:00 UTC)
    - cron: '0 6 * * 0'
  workflow_dispatch: # Permite ejecución manual desde GitHub

jobs:
  backup:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Instalar dependencias
        run: npm ci

      - name: Ejecutar backup
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          GOOGLE_CREDENTIALS: ${{ secrets.GOOGLE_CREDENTIALS }}
          GOOGLE_DRIVE_FOLDER_ID: ${{ secrets.GOOGLE_DRIVE_FOLDER_ID }}
        run: npx tsx scripts/backup/index.ts

      - name: Notificar éxito
        if: success()
        run: echo "✅ Backup completado exitosamente"

      - name: Notificar fallo
        if: failure()
        run: echo "❌ Error en el backup"
```

### 4. Script principal de backup

Crear `scripts/backup/index.ts`:

```typescript
import { exportPricesFromSupabase } from './supabase-export';
import { generateExcel } from './excel-generator';
import { uploadToDrive } from './google-drive-upload';

async function main() {
  console.log('🚀 Iniciando backup de listas de precios...');
  
  try {
    // 1. Exportar datos de Supabase
    console.log('📊 Exportando datos de Supabase...');
    const data = await exportPricesFromSupabase();
    console.log(`   └─ ${data.productos.length} productos exportados`);
    
    // 2. Generar archivo Excel
    console.log('📝 Generando archivo Excel...');
    const excelBuffer = await generateExcel(data);
    
    // 3. Subir a Google Drive
    console.log('☁️ Subiendo a Google Drive...');
    const fileName = `backup-precios-${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileId = await uploadToDrive(excelBuffer, fileName);
    
    console.log(`✅ Backup completado: ${fileName}`);
    console.log(`   └─ ID en Drive: ${fileId}`);
    
  } catch (error) {
    console.error('❌ Error en el backup:', error);
    process.exit(1);
  }
}

main();
```

### 5. Módulo de exportación Supabase

Crear `scripts/backup/supabase-export.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Usar service key para acceso completo
);

export interface ExportData {
  productos: any[];
  categorias: any[];
  exportDate: string;
}

export async function exportPricesFromSupabase(): Promise<ExportData> {
  // Ajustar estos queries según tu esquema de base de datos
  
  const { data: productos, error: prodError } = await supabase
    .from('productos') // Cambiar por el nombre real de tu tabla
    .select('*')
    .order('nombre');
    
  if (prodError) throw new Error(`Error exportando productos: ${prodError.message}`);
  
  const { data: categorias, error: catError } = await supabase
    .from('categorias') // Cambiar si tenés tabla de categorías
    .select('*')
    .order('nombre');
    
  if (catError) throw new Error(`Error exportando categorías: ${catError.message}`);
  
  return {
    productos: productos || [],
    categorias: categorias || [],
    exportDate: new Date().toISOString()
  };
}
```

### 6. Módulo generador de Excel

Crear `scripts/backup/excel-generator.ts`:

```typescript
import ExcelJS from 'exceljs';
import { ExportData } from './supabase-export';

export async function generateExcel(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'LA FUGA - Sistema de Backup';
  workbook.created = new Date();
  
  // Hoja de productos
  const productosSheet = workbook.addWorksheet('Productos', {
    properties: { tabColor: { argb: 'FF00FF00' } }
  });
  
  // Definir columnas (ajustar según tu esquema)
  productosSheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Nombre', key: 'nombre', width: 40 },
    { header: 'Descripción', key: 'descripcion', width: 50 },
    { header: 'Categoría', key: 'categoria', width: 20 },
    { header: 'Precio Unitario', key: 'precio_unitario', width: 15 },
    { header: 'Precio Mayorista', key: 'precio_mayorista', width: 15 },
    { header: 'Stock', key: 'stock', width: 10 },
    { header: 'Activo', key: 'activo', width: 10 },
    { header: 'Última Actualización', key: 'updated_at', width: 20 },
  ];
  
  // Estilo del header
  productosSheet.getRow(1).font = { bold: true };
  productosSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  };
  productosSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  
  // Agregar datos
  data.productos.forEach(producto => {
    productosSheet.addRow(producto);
  });
  
  // Formato de moneda para columnas de precio
  productosSheet.getColumn('precio_unitario').numFmt = '"$"#,##0.00';
  productosSheet.getColumn('precio_mayorista').numFmt = '"$"#,##0.00';
  
  // Hoja de categorías (si aplica)
  if (data.categorias.length > 0) {
    const categoriasSheet = workbook.addWorksheet('Categorías');
    categoriasSheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Descripción', key: 'descripcion', width: 50 },
    ];
    categoriasSheet.getRow(1).font = { bold: true };
    data.categorias.forEach(cat => categoriasSheet.addRow(cat));
  }
  
  // Hoja de metadatos
  const metaSheet = workbook.addWorksheet('Info Backup');
  metaSheet.addRow(['Fecha de Exportación', data.exportDate]);
  metaSheet.addRow(['Total Productos', data.productos.length]);
  metaSheet.addRow(['Total Categorías', data.categorias.length]);
  metaSheet.addRow(['Sistema', 'LA FUGA']);
  metaSheet.getColumn(1).width = 25;
  metaSheet.getColumn(2).width = 40;
  
  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

### 7. Módulo de upload a Google Drive

Crear `scripts/backup/google-drive-upload.ts`:

```typescript
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function uploadToDrive(fileBuffer: Buffer, fileName: string): Promise<string> {
  // Parsear credenciales desde variable de entorno
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS!);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  const drive = google.drive({ version: 'v3', auth });
  
  // Convertir buffer a stream
  const stream = new Readable();
  stream.push(fileBuffer);
  stream.push(null);
  
  // Subir archivo
  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    },
    media: {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      body: stream
    },
    fields: 'id, name, webViewLink'
  });
  
  return response.data.id!;
}
```

## Configuración de Google Cloud

### Pasos para obtener credenciales:

1. **Crear proyecto en Google Cloud Console**
   - Ir a https://console.cloud.google.com
   - Crear nuevo proyecto o usar existente

2. **Habilitar Google Drive API**
   - Ir a "APIs & Services" > "Library"
   - Buscar "Google Drive API" y habilitarla

3. **Crear Service Account**
   - Ir a "APIs & Services" > "Credentials"
   - Click en "Create Credentials" > "Service Account"
   - Darle un nombre descriptivo (ej: "backup-la-fuga")
   - Descargar el JSON de credenciales

4. **Crear carpeta en Google Drive**
   - Crear carpeta "Backups LA FUGA" en tu Drive
   - Compartir la carpeta con el email del Service Account (termina en @*.iam.gserviceaccount.com)
   - Copiar el ID de la carpeta desde la URL: `https://drive.google.com/drive/folders/[FOLDER_ID]`

## Configuración de Secrets en GitHub

Ir a tu repositorio > Settings > Secrets and variables > Actions

Agregar los siguientes secrets:

| Secret Name | Descripción |
|------------|-------------|
| `SUPABASE_URL` | URL de tu proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (no la anon key) |
| `GOOGLE_CREDENTIALS` | Contenido completo del JSON de credenciales (copiar todo) |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta de Drive donde guardar backups |

## Testing local

Para probar localmente antes de deployar:

```bash
# Crear archivo .env.local con las variables
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="eyJhbG..."
export GOOGLE_CREDENTIALS='{"type":"service_account",...}'
export GOOGLE_DRIVE_FOLDER_ID="1ABC..."

# Ejecutar
npx tsx scripts/backup/index.ts
```

## Ejecución manual

Podés ejecutar el backup manualmente desde GitHub:
1. Ir a Actions > "Backup Listas de Precios"
2. Click en "Run workflow"
3. Seleccionar branch y ejecutar

## Consideraciones adicionales

### Retención de backups
Por defecto, cada backup crea un archivo nuevo. Para evitar acumulación excesiva, considerá:
- Implementar rotación (mantener últimos 12 backups)
- Organizar en subcarpetas por mes/año

### Notificaciones (opcional)
Podés agregar notificaciones de éxito/fallo:
- Webhook a Slack/Discord
- Email via SendGrid/Resend
- Notificación a Telegram

### Monitoreo
- Los logs quedan disponibles en GitHub Actions
- Configurar alertas de fallo en GitHub (Settings > Notifications)

## Comandos útiles

```bash
# Instalar dependencias del script
npm install exceljs googleapis @supabase/supabase-js

# Verificar tipos
npx tsc --noEmit scripts/backup/*.ts

# Ejecutar backup manualmente
npx tsx scripts/backup/index.ts
```

## Notas de implementación

1. **Ajustar el esquema**: Los nombres de tablas y columnas en `supabase-export.ts` y `excel-generator.ts` deben coincidir con tu base de datos real.

2. **Service Key de Supabase**: Usar la "service_role key" (no la "anon key") para tener acceso completo a los datos sin restricciones de RLS.

3. **Horario del cron**: El ejemplo usa domingos a las 3:00 AM Argentina. Ajustar según necesidad.

4. **Carpeta de Drive**: Asegurarse de compartir la carpeta con el Service Account antes de ejecutar.
