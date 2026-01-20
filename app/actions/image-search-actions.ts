"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

// Tipos
interface ImageSearchResult {
    success: boolean;
    imageUrl: string | null;
    source: "openfoodfacts" | "google" | "manual" | "not_found";
    cached: boolean;
    error?: string;
}

interface OpenFoodFactsResponse {
    status: number;
    product?: {
        image_front_url?: string;
        image_url?: string;
        product_name?: string;
    };
}

interface GoogleSearchResponse {
    items?: Array<{
        link: string;
        image?: {
            contextLink: string;
        };
    }>;
}

// Cliente de Supabase para Server Actions
async function getSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
        }
    );
}

/**
 * Busca imagen en Open Food Facts por código de barras
 * API gratuita, ideal para productos alimenticios
 */
async function searchOpenFoodFacts(barcode: string): Promise<string | null> {
    try {
        const response = await fetch(
            `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
            {
                headers: {
                    "User-Agent": process.env.OPENFOODFACTS_USER_AGENT || "LaFugaSystem/1.0",
                },
                next: { revalidate: 86400 }, // Cache por 24 horas
            }
        );

        if (!response.ok) return null;

        const data: OpenFoodFactsResponse = await response.json();

        if (data.status === 1 && data.product) {
            // Priorizar imagen frontal, luego imagen general
            return data.product.image_front_url || data.product.image_url || null;
        }

        return null;
    } catch (error) {
        console.error("[OpenFoodFacts] Error:", error);
        return null;
    }
}

/**
 * Busca imagen en Google Custom Search
 * Fallback cuando Open Food Facts no tiene el producto
 */
async function searchGoogleImages(productName: string): Promise<string | null> {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
        console.warn("[GoogleSearch] API key o Search Engine ID no configurados");
        return null;
    }

    try {
        // Optimizar query: agregar "producto" para mejores resultados
        const query = encodeURIComponent(`${productName} producto`);
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${query}&searchType=image&num=1&imgSize=medium&safe=active`;

        const response = await fetch(url, {
            next: { revalidate: 86400 }, // Cache por 24 horas
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[GoogleSearch] Error:", errorData);
            return null;
        }

        const data: GoogleSearchResponse = await response.json();

        if (data.items && data.items.length > 0) {
            return data.items[0].link;
        }

        return null;
    } catch (error) {
        console.error("[GoogleSearch] Error:", error);
        return null;
    }
}

/**
 * Búsqueda híbrida: Open Food Facts → Google Custom Search
 * Prioriza eficiencia para no gastar cuotas innecesariamente
 */
export async function searchProductImage(
    productId: string,
    barcode: string | null,
    productName: string,
    forceRefresh: boolean = false
): Promise<ImageSearchResult> {
    const supabase = await getSupabaseClient();

    // 1. Verificar si ya tenemos imagen guardada (a menos que forcemos refresh)
    if (!forceRefresh) {
        const { data: existing } = await supabase
            .from("productos")
            .select("image_url, image_source, image_fetched_at")
            .eq("id", productId)
            .single();

        if (existing?.image_url) {
            return {
                success: true,
                imageUrl: existing.image_url,
                source: (existing.image_source as ImageSearchResult["source"]) || "manual",
                cached: true,
            };
        }
    }

    // 2. Buscar en Open Food Facts (si hay código de barras)
    let imageUrl: string | null = null;
    let source: ImageSearchResult["source"] = "not_found";

    if (barcode && barcode.length >= 8) {
        imageUrl = await searchOpenFoodFacts(barcode);
        if (imageUrl) {
            source = "openfoodfacts";
        }
    }

    // 3. Fallback a Google Custom Search
    if (!imageUrl && productName) {
        imageUrl = await searchGoogleImages(productName);
        if (imageUrl) {
            source = "google";
        }
    }

    // 4. Guardar resultado en Supabase (incluso si no se encontró)
    const { error: updateError } = await supabase
        .from("productos")
        .update({
            image_url: imageUrl,
            image_source: source,
            image_fetched_at: new Date().toISOString(),
        })
        .eq("id", productId);

    if (updateError) {
        console.error("[ImageSearch] Error guardando:", updateError);
        return {
            success: false,
            imageUrl: null,
            source: "not_found",
            cached: false,
            error: "Error al guardar la imagen en la base de datos",
        };
    }

    // 5. Revalidar páginas que muestran productos
    revalidatePath("/productos");
    revalidatePath("/");

    return {
        success: imageUrl !== null,
        imageUrl,
        source,
        cached: false,
    };
}

/**
 * Sincronizar imágenes para múltiples productos
 * Útil para procesar en lote productos sin imagen
 */
export async function syncProductImages(
    limit: number = 10
): Promise<{ processed: number; found: number; errors: number }> {
    const supabase = await getSupabaseClient();

    // Obtener productos sin imagen
    const { data: products, error } = await supabase
        .from("productos")
        .select("id, codigo_barra, nombre")
        .is("image_url", null)
        .neq("estado", "eliminado")
        .limit(limit);

    if (error || !products) {
        return { processed: 0, found: 0, errors: 1 };
    }

    let found = 0;
    let errors = 0;

    for (const product of products) {
        try {
            const result = await searchProductImage(
                product.id,
                product.codigo_barra,
                product.nombre
            );
            if (result.success && result.imageUrl) {
                found++;
            }
            // Pequeña pausa para no saturar las APIs
            await new Promise((resolve) => setTimeout(resolve, 500));
        } catch {
            errors++;
        }
    }

    return { processed: products.length, found, errors };
}

/**
 * Subir imagen optimizada a Supabase Storage
 * Recibe base64 de imagen ya optimizada en el cliente
 */
export async function uploadProductImage(
    productId: string,
    imageBase64: string,
    mimeType: string = "image/webp"
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
    const supabase = await getSupabaseClient();

    try {
        // Convertir base64 a Uint8Array para upload
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // Generar nombre de archivo único
        const timestamp = Date.now();
        const extension = mimeType === "image/webp" ? "webp" : "jpg";
        const fileName = `${productId}_${timestamp}.${extension}`;
        const filePath = `products/${fileName}`;

        // Subir a Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from("product-images")
            .upload(filePath, bytes, {
                contentType: mimeType,
                upsert: true, // Sobrescribir si existe
            });

        if (uploadError) {
            console.error("[Upload] Error:", uploadError);
            return { success: false, error: uploadError.message };
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(filePath);

        const imageUrl = urlData.publicUrl;

        // Actualizar producto en la base de datos
        const { error: updateError } = await supabase
            .from("productos")
            .update({
                image_url: imageUrl,
                image_source: "manual",
                image_fetched_at: new Date().toISOString(),
            })
            .eq("id", productId);

        if (updateError) {
            return { success: false, error: updateError.message };
        }

        revalidatePath("/productos");
        revalidatePath("/");

        return { success: true, imageUrl };
    } catch (error) {
        console.error("[Upload] Error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error desconocido",
        };
    }
}

/**
 * Establecer imagen manual para un producto (solo URL)
 * Para cuando ya tienes una URL externa
 */
export async function setManualProductImage(
    productId: string,
    imageUrl: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await getSupabaseClient();

    const { error } = await supabase
        .from("productos")
        .update({
            image_url: imageUrl,
            image_source: "manual",
            image_fetched_at: new Date().toISOString(),
        })
        .eq("id", productId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/productos");
    return { success: true };
}

/**
 * Eliminar imagen de un producto
 * Si es una imagen manual subida a Supabase, también intenta borrar el archivo
 */
export async function deleteProductImage(
    productId: string,
    imageUrl?: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await getSupabaseClient();

    // 1. Si es una imagen nuestra (en storage), intentar borrarla
    if (imageUrl && imageUrl.includes("product-images")) {
        try {
            // Extraer path del archivo desde la URL
            const url = new URL(imageUrl);
            const pathParts = url.pathname.split("/product-images/");
            if (pathParts.length > 1) {
                const filePath = pathParts[1];
                await supabase.storage.from("product-images").remove([filePath]);
            }
        } catch (e) {
            console.error("[DeleteImage] Error al borrar archivo:", e);
            // Continuamos igual para limpiar la DB
        }
    }

    // 2. Limpiar referencia en Base de Datos
    const { error } = await supabase
        .from("productos")
        .update({
            image_url: null,
            image_source: null,
            image_fetched_at: null,
        })
        .eq("id", productId);

    if (error) {
        return { success: false, error: error.message };
    }

    revalidatePath("/productos");
    revalidatePath("/");

    return { success: true };
}
