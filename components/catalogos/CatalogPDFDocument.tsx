/* eslint-disable jsx-a11y/alt-text */
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { Producto, ProductoCatalogo, CamposVisibles } from "@/lib/supabase";
import { formatearPrecio, calcularPrecioFinal } from "@/lib/pdf-utils";

// Register fonts if needed, otherwise use standard fonts
// Font.register({
//   family: 'Inter',
//   src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff'
// });

const styles = StyleSheet.create({
    page: {
        fontFamily: 'Helvetica',
        backgroundColor: '#F9FAFB',
        paddingBottom: 40,
    },
    header: {
        backgroundColor: '#006AC0',
        padding: 24,
        color: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        height: 140,
    },
    headerPattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
    },
    headerBrand: {
        width: '60%',
    },
    headerBrandTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    logoBox: {
        width: 50,
        height: 50,
        backgroundColor: 'white',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    logo: {
        width: 30,
        height: 30,
    },
    companyName: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    companySub: {
        fontSize: 10,
        color: '#6CBEFA',
    },
    catalogTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 5,
    },
    globalDiscountBadge: {
        backgroundColor: '#FF1F8F',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginTop: 5,
    },
    globalDiscountText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    clientCard: {
        width: '35%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: 12,
        border: '1pt solid rgba(255,255,255,0.2)',
    },
    clientLabel: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 2,
    },
    clientName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 10,
    },
    clientStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 10,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FF1F8F',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        gap: 16,
    },
    card: {
        width: '30%', // Approx 3 per row with gaps
        backgroundColor: 'white',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 16,
        // Shadow simulation (border)
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        borderRightWidth: 1,
        borderRightColor: '#E5E5E5',
    },
    cardImageContainer: {
        height: 120,
        backgroundColor: '#F8F9FA',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: 10,
    },
    cardImage: {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
    },
    cardDiscountBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: '#FF1F8F',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
    },
    cardDiscountText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    cardContent: {
        padding: 8,
    },
    productName: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#333333',
        marginBottom: 4,
        height: 24, // Fixed height for 2 lines
    },
    productDesc: {
        fontSize: 8,
        color: '#888888',
        marginBottom: 4,
        height: 20,
        overflow: 'hidden',
    },
    productCode: {
        fontSize: 7,
        color: '#AAAAAA',
        marginBottom: 4,
    },
    priceContainer: {
        marginTop: 4,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        paddingTop: 4,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    priceOriginal: {
        fontSize: 8,
        color: '#999999',
        textDecoration: 'line-through',
    },
    priceFinal: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#006AC0',
    },
    footer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: '#888888',
        fontSize: 8,
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5',
        paddingTop: 10,
        marginHorizontal: 24,
    }
});

interface CatalogPDFProps {
    titulo: string;
    clienteNombre: string;
    productos: (Producto | ProductoCatalogo)[];
    camposVisibles: CamposVisibles;
    descuentoGlobal: number;
    getDescuentoIndividual?: (productoId: string) => number;
    getPrecioPersonalizado?: (productoId: string) => number | null;
    logoBase64?: string;
    productImagesBase64?: Record<string, string>;
}

export function CatalogPDFDocument({
    titulo,
    clienteNombre,
    productos,
    camposVisibles,
    descuentoGlobal,
    getDescuentoIndividual,
    getPrecioPersonalizado,
    logoBase64,
    productImagesBase64 = {},
}: CatalogPDFProps) {
    const currentDate = new Date().toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* HEADER */}
                <View style={styles.header}>
                    <View style={styles.headerBrand}>
                        <View style={styles.headerBrandTop}>
                            <View style={styles.logoBox}>
                                {logoBase64 ? (
                                    <Image src={logoBase64} style={styles.logo} />
                                ) : (
                                    <Text style={{ fontSize: 20 }}>LF</Text>
                                )}
                            </View>
                            <View>
                                <Text style={styles.companyName}>LA FUGA</Text>
                                <Text style={styles.companySub}>Villa Carlos Paz</Text>
                            </View>
                        </View>
                        <Text style={styles.catalogTitle}>{titulo}</Text>
                        {descuentoGlobal > 0 && (
                            <View style={styles.globalDiscountBadge}>
                                <Text style={styles.globalDiscountText}>
                                    Descuento Global: {descuentoGlobal}%
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.clientCard}>
                        <Text style={styles.clientLabel}>Preparado para</Text>
                        <Text style={styles.clientName}>{clienteNombre}</Text>
                        <View style={styles.clientStats}>
                            <View>
                                <Text style={styles.clientLabel}>Productos</Text>
                                <Text style={styles.statValue}>{productos.length}</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View>
                                <Text style={styles.clientLabel}>Fecha</Text>
                                <Text style={{ ...styles.statValue, color: 'white', fontSize: 10, fontWeight: 'normal' }}>
                                    {currentDate}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* GRID */}
                <View style={styles.grid}>
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

                        const imageSrc = productImagesBase64[producto.id];

                        return (
                            <View key={producto.id} style={styles.card} wrap={false}>
                                {camposVisibles.foto && (
                                    <View style={styles.cardImageContainer}>
                                        {imageSrc ? (
                                            <Image src={imageSrc} style={styles.cardImage} />
                                        ) : (
                                            <Text style={{ fontSize: 20, color: '#CCCCCC' }}>📦</Text>
                                        )}
                                        {tieneDescuento && (
                                            <View style={styles.cardDiscountBadge}>
                                                <Text style={styles.cardDiscountText}>-{totalDescuento}%</Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                <View style={styles.cardContent}>
                                    {camposVisibles.nombre && (
                                        <Text style={styles.productName}>
                                            {producto.nombre.substring(0, 45)}
                                            {producto.nombre.length > 45 ? '...' : ''}
                                        </Text>
                                    )}

                                    {camposVisibles.descripcion && producto.descripcion && (
                                        <Text style={styles.productDesc}>
                                            {producto.descripcion.substring(0, 60)}
                                            {producto.descripcion.length > 60 ? '...' : ''}
                                        </Text>
                                    )}

                                    {camposVisibles.codigo && (
                                        <Text style={styles.productCode}>Cod: {producto.id}</Text>
                                    )}

                                    {camposVisibles.precio && (
                                        <View style={styles.priceContainer}>
                                            <View>
                                                {tieneDescuento && (
                                                    <Text style={styles.priceOriginal}>
                                                        {formatearPrecio(producto.precio_mayor)}
                                                    </Text>
                                                )}
                                                <Text style={styles.priceFinal}>
                                                    {formatearPrecio(precioFinal)}
                                                </Text>
                                            </View>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                <Text style={styles.footer} fixed>
                    Los precios pueden variar sin previo aviso • Catálogo válido por 7 días
                </Text>
            </Page>
        </Document>
    );
}
