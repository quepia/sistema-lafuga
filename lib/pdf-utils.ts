/**
 * PDF Generation Utilities
 * Uses html2pdf.js for client-side PDF generation
 */

/**
 * PDF Generation Utilities
 */

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
// ... existing code ...

/**
 * Converts an image URL to a Base64 string
 * @param url - The image URL
 */
export async function urlToBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();

    // If it's an SVG, convert to PNG
    if (blob.type === 'image/svg+xml' || url.endsWith('.svg')) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Scale up for better quality
          canvas.width = img.width * 2;
          canvas.height = img.height * 2;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to base64:", url, error);
    return null;
  }
}
