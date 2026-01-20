/**
 * Utilidad para optimizar imágenes en el cliente
 * Reduce tamaño, convierte a WebP, y comprime
 * 
 * Objetivo: ~30-50KB por imagen (suficiente para catálogo)
 */

interface OptimizeOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-1
    format?: "webp" | "jpeg";
}

interface OptimizeResult {
    base64: string;
    mimeType: string;
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
}

const DEFAULT_OPTIONS: OptimizeOptions = {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.8,
    format: "webp",
};

/**
 * Optimiza una imagen para ocupar el mínimo espacio posible
 * Mantiene buena calidad para visualización en catálogo
 */
export async function optimizeImage(
    file: File,
    options: OptimizeOptions = {}
): Promise<OptimizeResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Calcular dimensiones manteniendo aspect ratio
                let { width, height } = img;
                const maxW = opts.maxWidth!;
                const maxH = opts.maxHeight!;

                if (width > maxW || height > maxH) {
                    const ratio = Math.min(maxW / width, maxH / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                // Crear canvas para redimensionar
                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d")!;

                // Aplicar suavizado para mejor calidad
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = "high";

                // Fondo blanco (para transparencias en WebP/JPEG)
                ctx.fillStyle = "#FFFFFF";
                ctx.fillRect(0, 0, width, height);

                // Dibujar imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);

                // Convertir a formato optimizado
                const mimeType = opts.format === "webp" ? "image/webp" : "image/jpeg";
                const base64 = canvas.toDataURL(mimeType, opts.quality);

                // Calcular tamaños
                const originalSize = file.size;
                // Calcular tamaño real del base64 (descontando header)
                const base64Data = base64.split(",")[1] || "";
                const optimizedSize = Math.round((base64Data.length * 3) / 4);

                resolve({
                    base64,
                    mimeType,
                    originalSize,
                    optimizedSize,
                    compressionRatio: Math.round((1 - optimizedSize / originalSize) * 100),
                });
            };
            img.onerror = () => reject(new Error("Error al cargar imagen"));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error("Error al leer archivo"));
        reader.readAsDataURL(file);
    });
}

/**
 * Valida que el archivo sea una imagen válida
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/heic"];
    const maxSize = 10 * 1024 * 1024; // 10MB máximo para entrada

    if (!validTypes.includes(file.type)) {
        return { valid: false, error: "Tipo de archivo no válido. Usa JPG, PNG, GIF o WebP." };
    }

    if (file.size > maxSize) {
        return { valid: false, error: "Archivo muy grande. Máximo 10MB." };
    }

    return { valid: true };
}

/**
 * Formatea bytes a texto legible
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
