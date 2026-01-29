import { exportFromSupabase } from './supabase-export';
import { generateExcel } from './excel-generator';
import { uploadToDrive } from './google-drive-upload';

async function main() {
  console.log('Iniciando backup de listas de precios...');

  try {
    console.log('Exportando datos de Supabase...');
    const data = await exportFromSupabase();
    console.log(`  ${data.productos.length} productos exportados`);
    console.log(`  ${data.ventas.length} ventas del ultimo mes exportadas`);

    console.log('Generando archivo Excel...');
    const excelBuffer = await generateExcel(data);

    console.log('Subiendo a Google Drive...');
    const fileName = `backup-precios-${new Date().toISOString().split('T')[0]}.xlsx`;
    const fileId = await uploadToDrive(excelBuffer, fileName);

    console.log(`Backup completado: ${fileName}`);
    console.log(`  ID en Drive: ${fileId}`);
  } catch (error) {
    console.error('Error en el backup:', error);
    process.exit(1);
  }
}

main();
