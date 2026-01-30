"use client"

import Image from "next/image"
import { Producto, ProductoCatalogo, CamposVisibles } from "@/lib/supabase"
import { formatearPrecio, calcularPrecioFinal } from "@/lib/pdf-utils"

interface CatalogoTemplatesProps {
    id?: string;
    titulo: string;
    clienteNombre: string;
    productos: (Producto | ProductoCatalogo)[];
    camposVisibles: CamposVisibles;
    descuentoGlobal: number;
    getDescuentoIndividual?: (productoId: string) => number;
    getPrecioPersonalizado?: (productoId: string) => number | null;
    fechaGeneracion?: Date;
    logoSrc?: string;
    productImages?: Record<string, string>;
}

export function CatalogoPrintTemplate({
    id = "catalogo-print",
    titulo,
    clienteNombre,
    productos,
    camposVisibles,
    descuentoGlobal,
    getDescuentoIndividual,
    getPrecioPersonalizado,
    fechaGeneracion = new Date(),
    logoSrc = "/LogoLaFuga.svg",
    productImages = {},
}: CatalogoTemplatesProps) {

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div
            id={id}
            style={{
                width: '210mm',
                // minHeight: '297mm', // Removed to prevent forced extra blank page
                padding: '0',
                backgroundColor: 'white',
                margin: '0', // Let PDF generator handle margins
                fontFamily: 'sans-serif',
            }}
        >
            {/* Header */}
            <div style={{ backgroundColor: '#006AC0', color: 'white', padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                {/* Simplified Background for Print */}
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.1,
                        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, #FF1F8F 10px, #FF1F8F 20px)`
                    }}
                />

                <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: '4rem', height: '4rem', backgroundColor: 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: '0.25rem' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logoSrc} alt="LF" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>La Fuga</h1>
                            <p style={{ color: '#6CBEFA', fontSize: '0.875rem', margin: 0 }}>Villa Carlos Paz</p>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '0.5rem', margin: 0 }}>{titulo}</h2>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)', borderWidth: '1px', borderStyle: 'solid', borderRadius: '0.5rem', padding: '1rem', minWidth: '200px', maxWidth: '300px' }}>
                        <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem', margin: 0 }}>Cliente</p>
                        <p style={{
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '1.125rem',
                            lineHeight: 1.25,
                            marginBottom: '0.5rem',
                            wordWrap: 'break-word',
                        }}>{clienteNombre}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.8)', borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '0.5rem', marginTop: '0.5rem', gap: '1rem' }}>
                            <span>{productos.length} Productos</span>
                            <span>{formatDate(fechaGeneracion)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-0.5rem' }}>
                    {productos.map((producto) => {
                        const descuentoIndividual = 'descuento_individual' in producto
                            ? producto.descuento_individual
                            : (getDescuentoIndividual?.(producto.id) ?? 0);

                        const precioPersonalizado = 'precio_personalizado' in producto
                            ? producto.precio_personalizado
                            : (getPrecioPersonalizado?.(producto.id) ?? null);

                        const precioBase = precioPersonalizado ?? producto.precio_mayor;
                        const precioFinal = 'precio_final' in producto
                            ? producto.precio_final
                            : calcularPrecioFinal(precioBase, descuentoGlobal, descuentoIndividual);

                        const tieneDescuento = descuentoGlobal > 0 || descuentoIndividual > 0;
                        const totalDescuento = descuentoGlobal + descuentoIndividual;

                        // Use preloaded image if available, strict fallback or url as fallback
                        const imageSrc = productImages[producto.id] || producto.image_url;

                        return (
                            <div key={producto.id} style={{
                                width: '33.333%',
                                padding: '0.5rem',
                                boxSizing: 'border-box',
                                breakInside: 'avoid'
                            }}>
                                <div style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    overflow: 'hidden',
                                    backgroundColor: 'white',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    {/* Image */}
                                    {camposVisibles.foto && (
                                        <div style={{ height: '10rem', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                                            {imageSrc ? (
                                                /* eslint-disable-next-line @next/next/no-img-element */
                                                <img
                                                    src={imageSrc}
                                                    alt={producto.nombre}
                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: '1.5rem', filter: 'grayscale(1)' }}>📦</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Info */}
                                    <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        {camposVisibles.nombre && (
                                            <h3 style={{ fontWeight: 'bold', color: '#1f2937', fontSize: '0.875rem', maxHeight: '3.5rem', overflow: 'hidden', lineHeight: 1.25, marginBottom: '0.25rem', margin: 0 }}>
                                                {producto.nombre}
                                            </h3>
                                        )}

                                        {camposVisibles.descripcion && producto.descripcion && (
                                            <p style={{ fontSize: '0.75rem', color: '#6b7280', maxHeight: '2.5rem', overflow: 'hidden', marginBottom: '0.5rem', lineHeight: 1.25, margin: 0 }}>
                                                {producto.descripcion}
                                            </p>
                                        )}

                                        <div style={{ marginTop: 'auto' }}>
                                            {camposVisibles.precio && (
                                                <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                                                    {tieneDescuento && (
                                                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.25rem' }}>
                                                            <span style={{ fontSize: '0.625rem', backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.125rem 0.375rem', borderRadius: '9999px', fontWeight: 'bold', marginRight: '0.5rem' }}>
                                                                -{totalDescuento}%
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', color: '#9ca3af', textDecoration: 'line-through' }}>{formatearPrecio(producto.precio_mayor)}</span>
                                                        </div>
                                                    )}
                                                    <div style={{ fontWeight: 'bold', color: '#006AC0', fontSize: '1.125rem' }}>
                                                        {formatearPrecio(precioFinal)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#9ca3af', borderTop: '1px solid #e5e7eb', margin: '0 1.5rem', marginTop: '1rem' }}>
                Catálogo generado el {formatDate(fechaGeneracion)} • La Fuga
            </div>
        </div>
    )
}
