"use client";

import { useState, useTransition } from "react";
import { ImagePlus, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { syncProductImages } from "@/app/actions/image-search-actions";
import { toast } from "sonner";

interface SyncImagesButtonProps {
    className?: string;
}

export function SyncImagesButton({ className }: SyncImagesButtonProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [results, setResults] = useState<{
        processed: number;
        found: number;
        errors: number;
    } | null>(null);

    const handleSync = () => {
        setResults(null);
        startTransition(async () => {
            try {
                const result = await syncProductImages(20); // Procesar 20 productos
                setResults(result);

                if (result.found > 0) {
                    toast.success(`Se encontraron ${result.found} imágenes nuevas`);
                } else if (result.processed > 0) {
                    toast.info("No se encontraron imágenes nuevas");
                }
            } catch {
                toast.error("Error al sincronizar imágenes");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className={className}>
                    <ImagePlus className="h-4 w-4 mr-2" />
                    Sincronizar Imágenes
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Sincronizar Imágenes de Productos</DialogTitle>
                    <DialogDescription>
                        Busca automáticamente imágenes para productos que no tienen una imagen asignada.
                        Se procesarán hasta 20 productos por vez.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    {isPending ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-[#006AC0]" />
                                <span className="text-muted-foreground">Buscando imágenes...</span>
                            </div>
                            <Progress value={undefined} className="h-2" />
                            <p className="text-xs text-center text-muted-foreground">
                                Esto puede tomar unos segundos. No cierres esta ventana.
                            </p>
                        </div>
                    ) : results ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2 text-green-600">
                                <CheckCircle2 className="h-8 w-8" />
                                <span className="font-medium">Sincronización completada</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div className="p-3 rounded-lg bg-gray-50">
                                    <div className="text-2xl font-bold">{results.processed}</div>
                                    <div className="text-xs text-muted-foreground">Procesados</div>
                                </div>
                                <div className="p-3 rounded-lg bg-green-50">
                                    <div className="text-2xl font-bold text-green-600">{results.found}</div>
                                    <div className="text-xs text-green-600">Encontradas</div>
                                </div>
                                <div className="p-3 rounded-lg bg-red-50">
                                    <div className="text-2xl font-bold text-red-600">{results.errors}</div>
                                    <div className="text-xs text-red-600">Errores</div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <ImagePlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Presiona el botón para iniciar la sincronización.</p>
                            <p className="text-xs mt-2">
                                Se buscarán imágenes en Open Food Facts (gratis) y Google Images (con límite diario).
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cerrar
                    </Button>
                    <Button
                        onClick={handleSync}
                        disabled={isPending}
                        className="bg-[#006AC0] hover:bg-[#005a9e]"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Procesando...
                            </>
                        ) : results ? (
                            "Sincronizar Más"
                        ) : (
                            "Iniciar Sincronización"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
