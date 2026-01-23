"use client"

/**
 * PDF-compatible view for catalog generation
 * Uses inline styles instead of Tailwind classes because html2canvas
 * cannot parse modern CSS color functions like lab() used in Tailwind v4
 */

import { Producto, ProductoCatalogo, CamposVisibles } from "@/lib/supabase"
import { formatearPrecio, calcularPrecioFinal } from "@/lib/pdf-utils"

interface CatalogoPDFViewProps {
    id?: string;
    titulo: string;
    clienteNombre: string;
    productos: (Producto | ProductoCatalogo)[];
    camposVisibles: CamposVisibles;
    descuentoGlobal: number;
    getDescuentoIndividual?: (productoId: string) => number;
    getPrecioPersonalizado?: (productoId: string) => number | null;
    fechaGeneracion?: Date;
}

// Inline styles for PDF compatibility (no Tailwind classes)
const styles = {
    container: {
        backgroundColor: '#ffffff',
        padding: '32px',
        fontFamily: 'Arial, sans-serif',
    } as React.CSSProperties,
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '16px',
        marginBottom: '24px',
    } as React.CSSProperties,
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
    } as React.CSSProperties,
    logo: {
        width: '48px',
        height: '48px',
    } as React.CSSProperties,
    title: {
        fontSize: '20px',
        fontWeight: 'bold',
        color: '#111827',
        margin: 0,
    } as React.CSSProperties,
    subtitle: {
        fontSize: '14px',
        color: '#6b7280',
        margin: '4px 0 0 0',
    } as React.CSSProperties,
    clientName: {
        fontWeight: 500,
    } as React.CSSProperties,
    headerRight: {
        textAlign: 'right' as const,
    } as React.CSSProperties,
    date: {
        fontSize: '14px',
        color: '#9ca3af',
        margin: 0,
    } as React.CSSProperties,
    discount: {
        fontSize: '14px',
        fontWeight: 500,
        color: '#059669',
        margin: '4px 0 0 0',
    } as React.CSSProperties,
    summary: {
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px',
        color: '#6b7280',
    } as React.CSSProperties,
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
    } as React.CSSProperties,
    productCard: {
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        padding: '12px',
    } as React.CSSProperties,
    productImage: {
        width: '100%',
        height: '80px',
        backgroundColor: '#f3f4f6',
        borderRadius: '6px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    } as React.CSSProperties,
    productImg: {
        maxWidth: '100%',
        maxHeight: '100%',
        objectFit: 'contain' as const,
    } as React.CSSProperties,
    productName: {
        fontSize: '12px',
        fontWeight: 500,
        color: '#111827',
        margin: '0 0 4px 0',
        lineHeight: '1.3',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
    } as React.CSSProperties,
    productCode: {
        fontSize: '11px',
        color: '#9ca3af',
        margin: '0 0 2px 0',
    } as React.CSSProperties,
    productUnit: {
        fontSize: '11px',
        color: '#9ca3af',
        margin: '0 0 2px 0',
    } as React.CSSProperties,
    productDescription: {
        fontSize: '11px',
        color: '#6b7280',
        margin: '0 0 4px 0',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
    } as React.CSSProperties,
    priceContainer: {
        paddingTop: '4px',
    } as React.CSSProperties,
    originalPrice: {
        fontSize: '11px',
        color: '#9ca3af',
        textDecoration: 'line-through',
        margin: 0,
    } as React.CSSProperties,
    finalPrice: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#2563eb',
        margin: 0,
    } as React.CSSProperties,
    discountBadge: {
        display: 'inline-block',
        backgroundColor: '#dcfce7',
        color: '#15803d',
        fontSize: '11px',
        padding: '2px 6px',
        borderRadius: '4px',
        marginTop: '4px',
    } as React.CSSProperties,
    footer: {
        marginTop: '32px',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center' as const,
    } as React.CSSProperties,
    footerTitle: {
        fontSize: '14px',
        fontWeight: 500,
        color: '#374151',
        margin: '0 0 4px 0',
    } as React.CSSProperties,
    footerText: {
        fontSize: '12px',
        color: '#9ca3af',
        margin: '0 0 8px 0',
    } as React.CSSProperties,
    noImage: {
        color: '#9ca3af',
        fontSize: '24px',
    } as React.CSSProperties,
};

export function CatalogoPDFView({
    id = "catalogo-pdf",
    titulo,
    clienteNombre,
    productos,
    camposVisibles,
    descuentoGlobal,
    getDescuentoIndividual,
    getPrecioPersonalizado,
    fechaGeneracion = new Date(),
}: CatalogoPDFViewProps) {
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div id={id} style={styles.container}>
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/LogoLaFuga.svg"
                        alt="La Fuga"
                        style={styles.logo}
                    />
                    <div>
                        <h1 style={styles.title}>{titulo}</h1>
                        <p style={styles.subtitle}>
                            Preparado para: <span style={styles.clientName}>{clienteNombre}</span>
                        </p>
                    </div>
                </div>
                <div style={styles.headerRight}>
                    <p style={styles.date}>{formatDate(fechaGeneracion)}</p>
                    {descuentoGlobal > 0 && (
                        <p style={styles.discount}>
                            Descuento especial: {descuentoGlobal}%
                        </p>
                    )}
                </div>
            </div>

            {/* Summary */}
            <div style={styles.summary}>
                <span>
                    {productos.length} producto{productos.length !== 1 ? 's' : ''} en este catálogo
                </span>
                <span>
                    Precios en pesos argentinos (ARS)
                </span>
            </div>

            {/* Products Grid */}
            <div style={styles.grid}>
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

                    return (
                        <div key={producto.id} style={styles.productCard}>
                            {/* Product Image */}
                            {camposVisibles.foto && (
                                <div style={styles.productImage}>
                                    {producto.image_url ? (
                                        /* eslint-disable-next-line @next/next/no-img-element */
                                        <img
                                            src={producto.image_url}
                                            alt={producto.nombre}
                                            style={styles.productImg}
                                        />
                                    ) : (
                                        <span style={styles.noImage}>📦</span>
                                    )}
                                </div>
                            )}

                            {/* Product Info */}
                            <div>
                                {/* Name */}
                                {camposVisibles.nombre && (
                                    <p style={styles.productName}>{producto.nombre}</p>
                                )}

                                {/* Code */}
                                {camposVisibles.codigo && (
                                    <p style={styles.productCode}>Cod: {producto.id}</p>
                                )}

                                {/* Unit */}
                                {camposVisibles.unidad && producto.unidad && (
                                    <p style={styles.productUnit}>{producto.unidad}</p>
                                )}

                                {/* Description */}
                                {camposVisibles.descripcion && producto.descripcion && (
                                    <p style={styles.productDescription}>{producto.descripcion}</p>
                                )}

                                {/* Price */}
                                {camposVisibles.precio && (
                                    <div style={styles.priceContainer}>
                                        {tieneDescuento && (
                                            <p style={styles.originalPrice}>
                                                {formatearPrecio(producto.precio_mayor)}
                                            </p>
                                        )}
                                        <p style={styles.finalPrice}>
                                            {formatearPrecio(precioFinal)}
                                        </p>
                                        {tieneDescuento && (
                                            <span style={styles.discountBadge}>
                                                -{descuentoGlobal + descuentoIndividual}%
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div style={styles.footer}>
                <p style={styles.footerTitle}>LA FUGA - Ventas por Mayor y Menor</p>
                <p style={styles.footerText}>Los precios pueden variar sin previo aviso</p>
                <p style={styles.footerText}>
                    Catálogo válido por 7 días desde {formatDate(fechaGeneracion)}
                </p>
            </div>
        </div>
    );
}
