"use client"

import { useState } from "react"
import Link from "next/link"
import { useCatalogos } from "@/hooks/use-catalogos"
import { api, Catalogo } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  Calendar,
  User,
  Package,
} from "lucide-react"

export function CatalogoList() {
  const { catalogos, total, isLoading, mutate } = useCatalogos();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/catalogo/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado al portapapeles");
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    setIsDeleting(true);
    try {
      await api.eliminarCatalogo(deleteId);
      toast.success("Catálogo eliminado");
      mutate();
    } catch (error) {
      console.error("Error deleting catalog:", error);
      toast.error("Error al eliminar el catálogo");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleRenewLink = async (id: string) => {
    setRenewingId(id);
    try {
      await api.renovarLinkCatalogo(id);
      toast.success("Link renovado por 7 días más");
      mutate();
    } catch (error) {
      console.error("Error renewing link:", error);
      toast.error("Error al renovar el link");
    } finally {
      setRenewingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogos Mayoristas</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} catálogo{total !== 1 ? "s" : ""} activo{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/catalogos/nuevo">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Catálogo
          </Button>
        </Link>
      </div>

      {/* Table */}
      {catalogos.length > 0 ? (
        <div className="bg-white rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="text-center">Productos</TableHead>
                <TableHead className="text-center">Descuento</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Expira</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogos.map((catalogo) => {
                const expired = isExpired(catalogo.expires_at);
                return (
                  <TableRow
                    key={catalogo.id}
                    className={expired ? "opacity-60" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{catalogo.cliente_nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">{catalogo.titulo}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="w-4 h-4 text-gray-400" />
                        <span>{catalogo.productos.length}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {catalogo.descuento_global > 0 ? (
                        <span className="inline-block bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                          {catalogo.descuento_global}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar className="w-3 h-3" />
                        {formatDate(catalogo.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm ${
                          expired ? "text-red-600" : "text-gray-600"
                        }`}
                      >
                        {formatDate(catalogo.expires_at)}
                      </span>
                      {expired && (
                        <span className="ml-1 text-xs text-red-500">(Expirado)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyLink(catalogo.public_token)}
                          title="Copiar link"
                          disabled={expired}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <a
                          href={`/catalogo/${catalogo.public_token}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Ver catálogo"
                            disabled={expired}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRenewLink(catalogo.id)}
                          title="Renovar link"
                          disabled={renewingId === catalogo.id}
                        >
                          {renewingId === catalogo.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(catalogo.id)}
                          title="Eliminar"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No hay catálogos
          </h3>
          <p className="text-gray-500 mb-4">
            Crea tu primer catálogo para compartir con tus clientes mayoristas
          </p>
          <Link href="/catalogos/nuevo">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Crear Catálogo
            </Button>
          </Link>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Catálogo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este catálogo? El link dejará de
              funcionar y esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
