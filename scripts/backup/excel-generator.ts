import * as ExcelJS from 'exceljs';
import { ExportData } from './supabase-export';

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1A1A2E' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 11,
};

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const row = sheet.getRow(1);
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  row.alignment = { vertical: 'middle', horizontal: 'center' };
  row.height = 24;
}

export async function generateExcel(data: ExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LA FUGA - Backup Automatico';
  workbook.created = new Date();

  // --- Hoja: Productos ---
  const prodSheet = workbook.addWorksheet('Productos', {
    properties: { tabColor: { argb: 'FF16A34A' } },
  });

  prodSheet.columns = [
    { header: 'Codigo', key: 'id', width: 14 },
    { header: 'Nombre', key: 'nombre', width: 40 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Costo', key: 'costo', width: 14 },
    { header: 'Precio Mayor', key: 'precio_mayor', width: 14 },
    { header: 'Precio Menor', key: 'precio_menor', width: 14 },
    { header: 'Unidad', key: 'unidad', width: 12 },
    { header: 'Codigo Barra', key: 'codigo_barra', width: 18 },
    { header: 'Descripcion', key: 'descripcion', width: 35 },
    { header: 'Peso Neto (kg)', key: 'peso_neto', width: 14 },
    { header: 'Volumen (L)', key: 'volumen_neto', width: 12 },
    { header: 'Venta Fracc.', key: 'permite_venta_fraccionada', width: 12 },
    { header: 'Estado', key: 'estado', width: 10 },
    { header: 'Actualizado', key: 'updated_at', width: 20 },
  ];

  styleHeaderRow(prodSheet);

  data.productos.forEach((p) => {
    prodSheet.addRow({
      ...p,
      permite_venta_fraccionada: p.permite_venta_fraccionada ? 'Si' : 'No',
      updated_at: p.updated_at ? new Date(p.updated_at).toLocaleDateString('es-AR') : '',
    });
  });

  prodSheet.getColumn('costo').numFmt = '"$"#,##0.00';
  prodSheet.getColumn('precio_mayor').numFmt = '"$"#,##0.00';
  prodSheet.getColumn('precio_menor').numFmt = '"$"#,##0.00';

  // --- Hoja: Ventas (ultimo mes) ---
  if (data.ventas.length > 0) {
    const ventasSheet = workbook.addWorksheet('Ventas (ultimo mes)', {
      properties: { tabColor: { argb: 'FF2563EB' } },
    });

    ventasSheet.columns = [
      { header: 'ID', key: 'id', width: 16 },
      { header: 'Fecha', key: 'created_at', width: 18 },
      { header: 'Tipo', key: 'tipo_venta', width: 10 },
      { header: 'Cliente', key: 'cliente_nombre', width: 25 },
      { header: 'Subtotal', key: 'subtotal', width: 14 },
      { header: 'Descuento', key: 'descuento_global', width: 14 },
      { header: 'Desc. %', key: 'descuento_global_porcentaje', width: 10 },
      { header: 'Total', key: 'total', width: 14 },
      { header: 'Metodo Pago', key: 'metodo_pago', width: 15 },
      { header: 'Cant. Productos', key: 'cant_productos', width: 15 },
    ];

    styleHeaderRow(ventasSheet);

    data.ventas.forEach((v) => {
      ventasSheet.addRow({
        ...v,
        created_at: new Date(v.created_at).toLocaleString('es-AR'),
        cant_productos: Array.isArray(v.productos) ? v.productos.length : 0,
      });
    });

    ventasSheet.getColumn('subtotal').numFmt = '"$"#,##0.00';
    ventasSheet.getColumn('descuento_global').numFmt = '"$"#,##0.00';
    ventasSheet.getColumn('total').numFmt = '"$"#,##0.00';
  }

  // --- Hoja: Resumen ---
  const metaSheet = workbook.addWorksheet('Resumen');
  metaSheet.columns = [
    { header: 'Campo', key: 'campo', width: 30 },
    { header: 'Valor', key: 'valor', width: 40 },
  ];
  styleHeaderRow(metaSheet);

  const activos = data.productos.filter((p) => p.estado === 'activo').length;
  const inactivos = data.productos.filter((p) => p.estado === 'inactivo').length;
  const totalVentas = data.ventas.reduce((sum, v) => sum + Number(v.total), 0);

  metaSheet.addRow({ campo: 'Fecha de Exportacion', valor: new Date(data.exportDate).toLocaleString('es-AR') });
  metaSheet.addRow({ campo: 'Total Productos', valor: data.productos.length });
  metaSheet.addRow({ campo: 'Productos Activos', valor: activos });
  metaSheet.addRow({ campo: 'Productos Inactivos', valor: inactivos });
  metaSheet.addRow({ campo: 'Ventas (ultimo mes)', valor: data.ventas.length });
  metaSheet.addRow({ campo: 'Total Facturado (ultimo mes)', valor: `$${totalVentas.toFixed(2)}` });
  metaSheet.addRow({ campo: 'Sistema', valor: 'LA FUGA - Gestion de Precios' });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
