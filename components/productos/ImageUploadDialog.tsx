"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import Image from "next/image";
import {
    Upload,
    X,
    Loader2,
    CheckCircle2,
    Camera,
    FileImage,
    Link,
    ImageIcon,
    Trash2,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
    optimizeImage,
    validateImageFile,
    formatBytes,
} from "@/lib/image-optimizer";
import { uploadProductImage, setManualProductImage, deleteProductImage } from "@/app/actions/image-search-actions";
import { toast } from "sonner";

interface ImageUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId: string;
    productName: string;
    currentImageUrl?: string | null;
    onSuccess?: (imageUrl: string | null) => void;
}

type UploadState = "idle" | "optimizing" | "uploading" | "deleting" | "success" | "error";

export function ImageUploadDialog({
    open,
    onOpenChange,
    productId,
    productName,
    currentImageUrl,
    onSuccess,
}: ImageUploadDialogProps) {
    const [state, setState] = useState<UploadState>("idle");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [optimizedData, setOptimizedData] = useState<{
        base64: string;
        mimeType: string;
        originalSize: number;
        optimizedSize: number;
        compressionRatio: number;
    } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [isDragOver, setIsDragOver] = useState(false);
    const [urlInput, setUrlInput] = useState("");
    const [activeTab, setActiveTab] = useState<"file" | "url">("file");
    const inputRef = useRef<HTMLInputElement>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const resetState = useCallback(() => {
        setState("idle");
        setPreviewUrl(null);
        setOptimizedData(null);
        setError(null);
        setIsDragOver(false);
        setUrlInput("");
        setShowDeleteConfirm(false);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    }, []);

    const handleClose = () => {
        resetState();
        onOpenChange(false);
    };

    const processFile = async (file: File) => {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            setError(validation.error!);
            return;
        }

        setState("optimizing");
        setError(null);

        try {
            const result = await optimizeImage(file, {
                maxWidth: 400,
                maxHeight: 400,
                quality: 0.8,
                format: "webp",
            });

            setOptimizedData(result);
            setPreviewUrl(result.base64);
            setState("idle");
        } catch {
            setError("Error al procesar la imagen. Intenta con otra.");
            setState("error");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            processFile(file);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    // Upload file
    const handleUploadFile = () => {
        if (!optimizedData) return;

        setState("uploading");
        startTransition(async () => {
            try {
                const result = await uploadProductImage(
                    productId,
                    optimizedData.base64,
                    optimizedData.mimeType
                );

                if (result.success && result.imageUrl) {
                    setState("success");
                    toast.success("Imagen subida correctamente");
                    onSuccess?.(result.imageUrl);
                    setTimeout(() => handleClose(), 1500);
                } else {
                    throw new Error(result.error || "Error al subir imagen");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
                setState("error");
                toast.error("Error al subir la imagen");
            }
        });
    };

    // Save URL
    const handleSaveUrl = () => {
        if (!urlInput.trim()) return;

        try {
            new URL(urlInput);
        } catch {
            setError("URL inválida. Ingresa una URL completa (ej: https://...)");
            return;
        }

        setState("uploading");
        startTransition(async () => {
            try {
                const result = await setManualProductImage(productId, urlInput.trim());

                if (result.success) {
                    setState("success");
                    toast.success("Imagen guardada correctamente");
                    onSuccess?.(urlInput.trim());
                    setTimeout(() => handleClose(), 1500);
                } else {
                    throw new Error(result.error || "Error al guardar URL");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
                setState("error");
                toast.error("Error al guardar la imagen");
            }
        });
    };

    // Delete Image
    const handleDeleteImage = () => {
        setState("deleting");
        startTransition(async () => {
            try {
                const result = await deleteProductImage(productId, currentImageUrl || undefined);

                if (result.success) {
                    setState("idle"); // Not success state because we just closed the dialog usually, but let's close it
                    toast.success("Imagen eliminada correctamente");
                    onSuccess?.(null);
                    handleClose();
                } else {
                    throw new Error(result.error || "Error al eliminar imagen");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error desconocido");
                setState("error");
                toast.error("Error al eliminar la imagen");
            }
        });
    };

    const canSubmitFile = optimizedData && state !== "uploading" && !isPending;
    const canSubmitUrl = urlInput.trim().length > 0 && state !== "uploading" && !isPending;

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Camera className="h-5 w-5 text-[#006AC0]" />
                            Gestionar Imagen
                        </DialogTitle>
                        <DialogDescription>
                            {productName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4 space-y-4">
                        {state === "success" ? (
                            <div className="flex flex-col items-center justify-center py-8 text-green-600">
                                <CheckCircle2 className="h-16 w-16 mb-3" />
                                <p className="font-medium text-lg">¡Imagen actualizada!</p>
                            </div>
                        ) : (
                            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "file" | "url")}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="file" className="flex items-center gap-2">
                                        <ImageIcon className="h-4 w-4" />
                                        Subir archivo
                                    </TabsTrigger>
                                    <TabsTrigger value="url" className="flex items-center gap-2">
                                        <Link className="h-4 w-4" />
                                        URL de internet
                                    </TabsTrigger>
                                </TabsList>

                                {/* Tab: Subir archivo */}
                                <TabsContent value="file" className="space-y-4 mt-4">
                                    <div
                                        onClick={() => inputRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        className={cn(
                                            "relative border-2 border-dashed rounded-xl p-6",
                                            "flex flex-col items-center justify-center",
                                            "cursor-pointer transition-all duration-200",
                                            isDragOver
                                                ? "border-[#006AC0] bg-blue-50"
                                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                                            previewUrl && "border-solid border-gray-200"
                                        )}
                                    >
                                        {state === "optimizing" ? (
                                            <div className="flex flex-col items-center py-4">
                                                <Loader2 className="h-10 w-10 animate-spin text-[#006AC0] mb-3" />
                                                <p className="text-sm text-muted-foreground">Optimizando...</p>
                                            </div>
                                        ) : previewUrl ? (
                                            <div className="relative w-full">
                                                <div className="relative h-40 w-full rounded-lg overflow-hidden bg-gray-100">
                                                    <Image src={previewUrl} alt="Preview" fill className="object-contain" />
                                                </div>
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full"
                                                    onClick={(e) => { e.stopPropagation(); resetState(); }}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                                {optimizedData && (
                                                    <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs">
                                                        <Badge variant="outline" className="gap-1">
                                                            <FileImage className="h-3 w-3" />
                                                            {formatBytes(optimizedData.originalSize)}
                                                        </Badge>
                                                        <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {formatBytes(optimizedData.optimizedSize)}
                                                        </Badge>
                                                        <Badge className="bg-[#006AC0]">-{optimizedData.compressionRatio}%</Badge>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className={cn("h-10 w-10 mb-3", isDragOver ? "text-[#006AC0]" : "text-gray-400")} />
                                                <p className="text-sm font-medium text-gray-700 mb-1">
                                                    Arrastra o haz click para seleccionar
                                                </p>
                                                <p className="text-xs text-muted-foreground">JPG, PNG, GIF o WebP • Máx 10MB</p>
                                            </>
                                        )}
                                        <input
                                            ref={inputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleFileChange}
                                            className="hidden"
                                        />
                                    </div>
                                </TabsContent>

                                {/* Tab: URL */}
                                <TabsContent value="url" className="space-y-4 mt-4">
                                    <div className="space-y-3">
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="https://ejemplo.com/imagen.jpg"
                                                value={urlInput}
                                                onChange={(e) => setUrlInput(e.target.value)}
                                                className="flex-1"
                                            />
                                        </div>
                                        {urlInput && (
                                            <div className="relative h-40 w-full rounded-lg overflow-hidden bg-gray-100 border">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={urlInput}
                                                    alt="Preview URL"
                                                    className="w-full h-full object-contain"
                                                    onError={() => setError("No se pudo cargar la imagen de la URL")}
                                                    onLoad={() => setError(null)}
                                                />
                                            </div>
                                        )}
                                        <p className="text-xs text-muted-foreground">
                                            💡 Pega la URL de cualquier imagen de internet.
                                        </p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                {error}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        {currentImageUrl && state !== "success" && (
                            <Button
                                variant="destructive"
                                className="mr-auto"
                                onClick={() => setShowDeleteConfirm(true)}
                                disabled={state !== "idle" && state !== "error"}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar Imagen
                            </Button>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleClose}>
                                {state === "success" ? "Cerrar" : "Cancelar"}
                            </Button>
                            {state !== "success" && (
                                <Button
                                    onClick={activeTab === "file" ? handleUploadFile : handleSaveUrl}
                                    disabled={activeTab === "file" ? !canSubmitFile : !canSubmitUrl}
                                    className="bg-[#006AC0] hover:bg-[#005a9e]"
                                >
                                    {state === "uploading" || isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            {activeTab === "file" ? <Upload className="h-4 w-4 mr-2" /> : <Link className="h-4 w-4 mr-2" />}
                                            Guardar
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirmación de borrado */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            ¿Eliminar imagen?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Si es una imagen subida manualmente, se eliminará del servidor.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={handleDeleteImage}
                        >
                            {state === "deleting" || isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
