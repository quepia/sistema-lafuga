/**
 * PDF Generation Utilities
 * Uses html2pdf.js for client-side PDF generation
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Dynamic import to avoid SSR issues
let html2pdfModule: any = null;

async function getHtml2pdf(): Promise<any> {
  if (!html2pdfModule) {
    const module = await import('html2pdf.js');
    html2pdfModule = module.default || module;
  }
  return html2pdfModule;
}

export interface PDFOptions {
  margin?: number;
  filename?: string;
  imageQuality?: number;
  scale?: number;
  orientation?: 'portrait' | 'landscape';
}

/**
 * Generates and downloads a PDF from an HTML element
 * @param elementId - ID of the HTML element to convert
 * @param options - PDF generation options
 */
export async function generarPDF(
  elementId: string,
  options: PDFOptions = {}
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento con ID "${elementId}" no encontrado`);
  }

  const {
    margin = 10,
    filename = 'catalogo.pdf',
    imageQuality = 0.95,
    scale = 2,
    orientation = 'portrait',
  } = options;

  const html2pdf = await getHtml2pdf();

  const opt = {
    margin,
    filename,
    image: { type: 'jpeg', quality: imageQuality },
    html2canvas: {
      scale,
      useCORS: true, // For external images
      logging: false,
      allowTaint: true,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation,
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  await html2pdf().set(opt).from(element).save();
}

/**
 * Generates a PDF and returns it as a Blob
 * @param elementId - ID of the HTML element to convert
 * @param options - PDF generation options
 */
export async function generarPDFBlob(
  elementId: string,
  options: PDFOptions = {}
): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento con ID "${elementId}" no encontrado`);
  }

  const {
    margin = 10,
    imageQuality = 0.95,
    scale = 2,
    orientation = 'portrait',
  } = options;

  const html2pdf = await getHtml2pdf();

  const opt = {
    margin,
    image: { type: 'jpeg', quality: imageQuality },
    html2canvas: {
      scale,
      useCORS: true,
      logging: false,
      allowTaint: true,
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation,
    },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };

  const blob = await html2pdf().set(opt).from(element).outputPdf('blob');
  return blob;
}

/**
 * Generates a catalog-specific PDF with optimized settings
 * @param elementId - ID of the catalog element
 * @param clienteNombre - Client name for filename
 */
export async function generarCatalogoPDF(
  elementId: string,
  clienteNombre: string
): Promise<void> {
  const filename = `Catalogo_${clienteNombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

  await generarPDF(elementId, {
    filename,
    margin: 10,
    imageQuality: 0.9,
    scale: 2,
    orientation: 'portrait',
  });
}

/**
 * Formats a price for display
 * @param precio - Price to format
 */
export function formatearPrecio(precio: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(precio);
}

/**
 * Calculates the final price after discounts
 * @param precioBase - Base price
 * @param descuentoGlobal - Global discount percentage
 * @param descuentoIndividual - Individual discount percentage
 */
export function calcularPrecioFinal(
  precioBase: number,
  descuentoGlobal: number,
  descuentoIndividual: number
): number {
  const totalDescuento = descuentoGlobal + descuentoIndividual;
  return Math.round(precioBase * (1 - totalDescuento / 100) * 100) / 100;
}
