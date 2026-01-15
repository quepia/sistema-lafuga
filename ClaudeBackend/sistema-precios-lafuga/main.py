from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import os
from dotenv import load_dotenv

from app.database import get_db, init_db
from app.schemas import (
    ProductoResponse, ProductoCreate, ProductoUpdate, 
    ActualizacionMasiva, EstadisticasResponse
)
from app.crud import ProductoService
from app.auth import router as auth_router, get_current_user

# Cargar variables de entorno
load_dotenv()

# Crear aplicación FastAPI
app = FastAPI(
    title=os.getenv("API_TITLE", "Sistema de Gestión de Precios - LA FUGA"),
    version=os.getenv("API_VERSION", "1.0.0"),
    description="API REST para gestión de precios minoristas y mayoristas"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir router de autenticación
app.include_router(auth_router)

# Evento de inicio
@app.on_event("startup")
async def startup_event():
    init_db()

# ==================== ENDPOINTS GENERALES ====================

@app.get("/", tags=["General"])
async def root():
    """Endpoint raíz con información de la API"""
    return {
        "message": "Sistema de Gestión de Precios - LA FUGA",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "productos": "/productos",
            "categorias": "/categorias",
            "estadisticas": "/estadisticas"
        }
    }

@app.get("/health", tags=["General"])
async def health_check():
    """Verifica el estado de la API"""
    return {"status": "ok"}

# ==================== ENDPOINTS DE CONSULTA ====================

@app.get("/productos", response_model=dict, tags=["Productos"])
async def listar_productos(
    query: str = None,
    categoria: str = None,
    precio_min: float = None,
    precio_max: float = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Lista productos con filtros opcionales.
    
    - **query**: Buscar en nombre, código o código de barras
    - **categoria**: Filtrar por categoría específica
    - **precio_min/precio_max**: Rango de precios
    - **limit/offset**: Paginación
    """
    productos, total = ProductoService.buscar_productos(
        db, query, categoria, precio_min, precio_max, limit, offset
    )
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "count": len(productos),
        "productos": [p.to_dict() for p in productos]
    }

@app.get("/productos/{producto_id}", response_model=ProductoResponse, tags=["Productos"])
async def obtener_producto(producto_id: int, db: Session = Depends(get_db)):
    """Obtiene un producto específico por ID"""
    producto = ProductoService.get_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@app.get("/productos/codigo/{codigo}", response_model=ProductoResponse, tags=["Productos"])
async def obtener_por_codigo(codigo: str, db: Session = Depends(get_db)):
    """Obtiene un producto por su código SKU"""
    producto = ProductoService.get_producto_by_codigo(db, codigo)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@app.get("/productos/barcode/{codigo_barra}", response_model=ProductoResponse, tags=["Productos"])
async def obtener_por_codigo_barra(codigo_barra: str, db: Session = Depends(get_db)):
    """Obtiene un producto por código de barras (para lectores)"""
    producto = ProductoService.get_producto_by_codigo_barra(db, codigo_barra)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

# ==================== CATEGORÍAS ====================

@app.get("/categorias", response_model=List[str], tags=["Categorías"])
async def listar_categorias(db: Session = Depends(get_db)):
    """Lista todas las categorías disponibles"""
    return ProductoService.get_all_categorias(db)

@app.get("/categorias/{categoria}/productos", response_model=List[ProductoResponse], tags=["Categorías"])
async def productos_por_categoria(categoria: str, db: Session = Depends(get_db)):
    """Obtiene todos los productos de una categoría"""
    productos = ProductoService.get_productos_by_categoria(db, categoria)
    return productos

# ==================== ESTADÍSTICAS ====================

@app.get("/estadisticas", response_model=EstadisticasResponse, tags=["Estadísticas"])
async def obtener_estadisticas(db: Session = Depends(get_db)):
    """Obtiene estadísticas generales del sistema"""
    return ProductoService.get_estadisticas(db)

# ==================== REPORTES ====================

@app.get("/reportes", tags=["Reportes"])
async def obtener_reportes(db: Session = Depends(get_db)):
    """
    Obtiene datos para reportes de negocio.

    Incluye:
    - Valuación: Costo total vs Valor de venta
    - Rentabilidad: Márgenes promedio
    - Alertas: Productos con margen negativo o sin precio
    - Performance por categoría
    """
    return ProductoService.get_reportes(db)

# ==================== MODIFICACIÓN ====================

@app.post("/productos", response_model=ProductoResponse, status_code=status.HTTP_201_CREATED, tags=["Productos"])
async def crear_producto(producto: ProductoCreate, db: Session = Depends(get_db)):
    """Crea un nuevo producto"""
    existing = ProductoService.get_producto_by_codigo(db, producto.codigo)
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese código")
    return ProductoService.create_producto(db, producto)

@app.put("/productos/{producto_id}", response_model=ProductoResponse, tags=["Productos"])
async def actualizar_producto(
    producto_id: int, 
    producto_update: ProductoUpdate, 
    db: Session = Depends(get_db)
):
    """Actualiza un producto existente"""
    producto = ProductoService.update_producto(db, producto_id, producto_update)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@app.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Productos"])
async def eliminar_producto(producto_id: int, db: Session = Depends(get_db)):
    """Elimina un producto"""
    success = ProductoService.delete_producto(db, producto_id)
    if not success:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

@app.post("/productos/actualizar-masiva", tags=["Actualización Masiva"])
async def actualizar_precios_masivo(
    actualizacion: ActualizacionMasiva,
    db: Session = Depends(get_db)
):
    """
    Actualiza precios de forma masiva.
    
    **Ejemplos:**
    - Aumentar 10% precio menor en categoría ALMACEN
    - Disminuir 5% precio mayor en productos seleccionados
    - Aumentar 15% ambos precios en BAZAR
    """
    count = ProductoService.actualizacion_masiva(db, actualizacion)
    return {
        "message": f"Se actualizaron {count} productos",
        "productos_actualizados": count
    }

# ==================== IMPORTACIÓN ====================

@app.post("/importar/excel", tags=["Importación"])
async def importar_desde_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Importa productos desde un archivo Excel.
    
    El archivo debe contener las columnas:
    CODIGO, PRODUCTO, CATEGORIA, PRECIO_MENOR, PRECIO_MAYOR, UNIDAD, CODIGO_BARRA
    """
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="El archivo debe ser Excel (.xlsx o .xls)")
    
    try:
        import pandas as pd
        from io import BytesIO
        
        contents = await file.read()
        df = pd.read_excel(BytesIO(contents))
        
        required_columns = ['CODIGO', 'PRODUCTO', 'CATEGORIA', 'PRECIO_MENOR', 'PRECIO_MAYOR']
        missing = [col for col in required_columns if col not in df.columns]
        if missing:
            raise HTTPException(
                status_code=400, 
                detail=f"Faltan columnas requeridas: {', '.join(missing)}"
            )
        
        created = 0
        updated = 0
        errors = []
        
        for idx, row in df.iterrows():
            try:
                codigo = str(row['CODIGO'])
                existing = ProductoService.get_producto_by_codigo(db, codigo)
                
                producto_data = {
                    'codigo': codigo,
                    'producto': str(row['PRODUCTO']),
                    'categoria': str(row['CATEGORIA']),
                    'precio_menor': float(row['PRECIO_MENOR']),
                    'precio_mayor': float(row['PRECIO_MAYOR']),
                    'unidad': str(row.get('UNIDAD', '')) if pd.notna(row.get('UNIDAD')) else None,
                    'codigo_barra': str(row.get('CODIGO_BARRA', '')) if pd.notna(row.get('CODIGO_BARRA')) else None
                }
                
                if existing:
                    ProductoService.update_producto(db, existing.id, ProductoUpdate(**producto_data))
                    updated += 1
                else:
                    ProductoService.create_producto(db, ProductoCreate(**producto_data))
                    created += 1
                    
            except Exception as e:
                errors.append(f"Fila {idx + 2}: {str(e)}")
        
        return {
            "message": "Importación completada",
            "productos_creados": created,
            "productos_actualizados": updated,
            "errores": errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar el archivo: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
