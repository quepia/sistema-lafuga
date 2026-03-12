export type ImageSearchSource = "openfoodfacts" | "google" | "manual" | "not_found";

export interface SearchProductImageResult {
    success: boolean;
    imageUrl: string | null;
    source: ImageSearchSource;
    cached: boolean;
    error?: string;
}

export interface UploadProductImageResult {
    success: boolean;
    imageUrl?: string;
    error?: string;
}

export interface ProductImageMutationResult {
    success: boolean;
    error?: string;
}

export interface ProductImageActions {
    searchProductImage: (
        productId: string,
        barcode: string | null,
        productName: string,
        forceRefresh?: boolean
    ) => Promise<SearchProductImageResult>;
    uploadProductImage: (
        productId: string,
        imageBase64: string,
        mimeType?: string
    ) => Promise<UploadProductImageResult>;
    setManualProductImage: (
        productId: string,
        imageUrl: string
    ) => Promise<ProductImageMutationResult>;
    deleteProductImage: (
        productId: string,
        imageUrl?: string
    ) => Promise<ProductImageMutationResult>;
}
