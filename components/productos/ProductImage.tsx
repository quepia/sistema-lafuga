"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
    ImageIcon,
    RefreshCw,
    Loader2,
    Upload
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { searchProductImage } from "@/app/actions/image-search-actions";
import { toast } from "sonner";
import { ImageUploadDialog } from "./ImageUploadDialog";

interface ProductImageProps {
    productId: string;
    productName: string;
    barcode: string | null;
    imageUrl: string | null;
    imageSource: string | null;
    className?: string;
    variant?: "square" | "banner"; // "banner" = ancho completo, altura fija
    showSyncButton?: boolean;
    showUploadButton?: boolean;
    onImageUpdate?: (newUrl: string | null, source: string) => void;
}

const sourceColors: Record<string, string> = {
    openfoodfacts: "bg-green-100 text-green-700 border-green-200",
    google: "bg-blue-100 text-blue-700 border-blue-200",
    manual: "bg-purple-100 text-purple-700 border-purple-200",
    not_found: "bg-gray-100 text-gray-500 border-gray-200",
};

const sourceLabels: Record<string, string> = {
    openfoodfacts: "Open Food Facts",
    google: "Google",
    manual: "Manual",
    not_found: "No encontrada",
};

export function ProductImage({
    productId,
    productName,
    barcode,
    imageUrl,
    imageSource,
    className,
    variant = "square",
    showSyncButton = false,
    showUploadButton = false,
    onImageUpdate,
}: ProductImageProps) {
    const [isPending, startTransition] = useTransition();
    const [localImageUrl, setLocalImageUrl] = useState(imageUrl);
    const [localSource, setLocalSource] = useState(imageSource);
    const [imageError, setImageError] = useState(false);
    const [showUploadDialog, setShowUploadDialog] = useState(false);

    const handleSync = () => {
        startTransition(async () => {
            try {
                const result = await searchProductImage(
                    productId,
                    barcode,
                    productName,
                    true
                );

                if (result.success && result.imageUrl) {
                    setLocalImageUrl(result.imageUrl);
                    setLocalSource(result.source);
                    setImageError(false);
                    onImageUpdate?.(result.imageUrl, result.source);
                    toast.success(
                        result.cached
                            ? "Imagen cargada desde caché"
                            : `Imagen encontrada en ${sourceLabels[result.source] || result.source}`
                    );
                } else {
                    setLocalSource("not_found");
                    toast.error("No se encontró imagen para este producto");
                }
            } catch {
                toast.error("Error al buscar imagen");
            }
        });
    };

    const displayUrl = localImageUrl && !imageError ? localImageUrl : null;

    // Estilos según variante
    const containerStyles = variant === "banner"
        ? "w-full h-24 sm:h-28" // Banner: ancho completo, altura fija
        : "h-32 w-32"; // Square: cuadrado

    return (
        <>
            <div className={cn("relative group", className)}>
                {/* Contenedor de imagen */}
                <div
                    className={cn(
                        "relative rounded-xl overflow-hidden",
                        "bg-gradient-to-br from-gray-50 to-gray-100",
                        "border border-gray-200",
                        "transition-all duration-300",
                        "group-hover:shadow-md group-hover:border-gray-300",
                        containerStyles
                    )}
                >
                    {displayUrl ? (
                        <>
                            <Image
                                src={displayUrl}
                                alt={productName}
                                fill
                                className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                                sizes={variant === "banner" ? "100vw" : "128px"}
                                onError={() => setImageError(true)}
                                unoptimized
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                            <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-300" />
                            <span className="text-[10px] sm:text-xs mt-1 text-gray-400">Sin imagen</span>
                        </div>
                    )}

                    {/* Loading overlay */}
                    {isPending && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-[#006AC0]" />
                        </div>
                    )}
                </div>

                {/* Badge de origen */}
                {localSource && localSource !== "not_found" && displayUrl && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "absolute bottom-1 left-1 text-[9px] px-1.5 py-0.5",
                                        "shadow-sm cursor-help",
                                        sourceColors[localSource] || sourceColors.manual
                                    )}
                                >
                                    {localSource === "openfoodfacts" ? "OFF" : localSource === "google" ? "G" : "M"}
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">
                                <p className="text-xs">
                                    Fuente: {sourceLabels[localSource] || localSource}
                                </p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}

                {/* Botones de acción - AHORA CON COLORES */}
                {(showSyncButton || showUploadButton) && (
                    <div className="absolute top-1 right-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {showUploadButton && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            className="h-7 w-7 rounded-full shadow-md bg-[#006AC0] hover:bg-[#005a9e] text-white"
                                            onClick={() => setShowUploadDialog(true)}
                                            disabled={isPending}
                                        >
                                            <Upload className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Subir imagen</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        {showSyncButton && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="icon"
                                            className="h-7 w-7 rounded-full shadow-md bg-[#FF1F8F] hover:bg-[#e01a80] text-white"
                                            onClick={handleSync}
                                            disabled={isPending}
                                        >
                                            <RefreshCw className={cn("h-3.5 w-3.5", isPending && "animate-spin")} />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Buscar imagen automáticamente</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                )}
            </div>

            {/* Dialog de subida */}
            <ImageUploadDialog
                open={showUploadDialog}
                onOpenChange={setShowUploadDialog}
                productId={productId}
                productName={productName}
                currentImageUrl={localImageUrl}
                onSuccess={(url: string | null) => {
                    if (url) {
                        setLocalImageUrl(url);
                        setLocalSource("manual");
                        setImageError(false);
                        onImageUpdate?.(url, "manual");
                    } else {
                        // Caso de eliminación
                        setLocalImageUrl(null);
                        setLocalSource("not_found");
                        onImageUpdate?.(null, "not_found");
                    }
                }}
            />
        </>
    );
}
