from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from authlib.integrations.starlette_client import OAuth
from jose import jwt, JWTError
from starlette.config import Config

from database import get_db, init_db
from schemas import (
    ProductoResponse, ProductoCreate, ProductoUpdate,
    ActualizacionMasiva, EstadisticasResponse, UserResponse, Token,
    VentaCreate, VentaResponse, VentaListResponse, CodigoBarraUpdate
)
from crud import ProductoService, UserService, VentaService

# Cargar variables de entorno
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Allowed emails (comma-separated list)
ALLOWED_EMAILS_RAW = os.getenv("ALLOWED_EMAILS", "")
ALLOWED_EMAILS = [email.strip().lower() for email in ALLOWED_EMAILS_RAW.split(",") if email.strip()]

# OAuth setup
oauth = OAuth()
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# Detectar si estamos en Vercel
IS_VERCEL = os.getenv("VERCEL", "").lower() == "1" or os.getenv("VERCEL_ENV") is not None

# Crear aplicación FastAPI
app = FastAPI(
    title=os.getenv("API_TITLE", "Sistema de Gestion de Precios - LA FUGA"),
    version=os.getenv("API_VERSION", "1.0.0"),
    description="API REST para gestion de precios minoristas y mayoristas",
    root_path="/api" if IS_VERCEL else ""
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En produccion, especificar dominios exactos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session middleware for OAuth
from starlette.middleware.sessions import SessionMiddleware
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

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


# ==================== AUTH HELPER FUNCTIONS ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Crea un JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verifica y decodifica un JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def get_token_from_header(request: Request) -> Optional[str]:
    """Extrae el token del header Authorization"""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        return auth_header[7:]
    return None


async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[UserResponse]:
    """Obtiene el usuario actual desde el token"""
    token = get_token_from_header(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se proporciono token de autenticacion",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalido",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = UserService.get_user_by_id(db, int(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


# ==================== AUTH ENDPOINTS ====================

@app.get("/auth/login/google", tags=["Autenticacion"])
async def login_google(request: Request):
    """Inicia el flujo de autenticacion con Google"""
    redirect_uri = request.url_for("auth_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@app.get("/auth/callback", tags=["Autenticacion"])
async def auth_callback(request: Request, db: Session = Depends(get_db)):
    """Callback de Google OAuth"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")

        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se pudo obtener informacion del usuario"
            )

        # Verify email is in allowed list
        user_email = user_info["email"].lower()
        if ALLOWED_EMAILS and user_email not in ALLOWED_EMAILS:
            redirect_url = f"{FRONTEND_URL}/login?error=unauthorized"
            return RedirectResponse(url=redirect_url)

        # Get or create user
        user = UserService.get_or_create_user(
            db,
            email=user_info["email"],
            name=user_info.get("name", user_info["email"]),
            picture=user_info.get("picture")
        )

        # Create JWT token
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}
        )

        # Redirect to frontend with token
        redirect_url = f"{FRONTEND_URL}/auth/callback?token={access_token}"
        return RedirectResponse(url=redirect_url)

    except Exception as e:
        # Redirect to login with error
        redirect_url = f"{FRONTEND_URL}/login?error=auth_failed"
        return RedirectResponse(url=redirect_url)


@app.get("/auth/me", response_model=UserResponse, tags=["Autenticacion"])
async def get_current_user_info(
    current_user = Depends(get_current_user)
):
    """Obtiene la informacion del usuario autenticado"""
    return current_user


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
async def obtener_producto(producto_id: str, db: Session = Depends(get_db)):
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
    producto_id: str,
    producto_update: ProductoUpdate,
    db: Session = Depends(get_db)
):
    """Actualiza un producto existente"""
    producto = ProductoService.update_producto(db, producto_id, producto_update)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return producto

@app.delete("/productos/{producto_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Productos"])
async def eliminar_producto(producto_id: str, db: Session = Depends(get_db)):
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

                # Handle costo_compra - try different column names
                costo_compra = 0.0
                for cost_col in ['COSTO_COMPRA', 'COSTO', 'PRECIO_COSTO', 'COSTO DE COMPRA']:
                    if cost_col in df.columns and pd.notna(row.get(cost_col)):
                        costo_compra = float(row[cost_col])
                        break

                producto_data = {
                    'codigo': codigo,
                    'producto': str(row['PRODUCTO']),
                    'categoria': str(row['CATEGORIA']),
                    'precio_menor': float(row['PRECIO_MENOR']),
                    'precio_mayor': float(row['PRECIO_MAYOR']),
                    'costo_compra': costo_compra,
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

# ==================== REPORTES ====================

@app.get("/reportes", tags=["Reportes"])
async def obtener_reportes(db: Session = Depends(get_db)):
    """
    Obtiene datos para reportes de negocio.

    Incluye:
    - Valuacion de inventario
    - Alertas (sin precio)
    - Performance por categoria

    Nota: costo_compra no disponible en esquema actual
    """
    from models import Producto

    # Get all products
    productos = db.query(Producto).all()

    # Calculate valuation usando propiedades float
    total_valor_minorista = sum(p.precio_menor_float for p in productos)
    total_valor_mayorista = sum(p.precio_mayor_float for p in productos)

    # Alerts - products without prices
    productos_sin_precio = [
        p.to_dict() for p in productos
        if p.precio_menor_float == 0 or p.precio_mayor_float == 0
    ]

    # Category performance
    categorias = {}
    for p in productos:
        cat = p.categoria
        if cat not in categorias:
            categorias[cat] = {
                "categoria": cat,
                "total_items": 0,
                "total_valor_menor": 0,
                "total_valor_mayor": 0,
            }
        categorias[cat]["total_items"] += 1
        categorias[cat]["total_valor_menor"] += p.precio_menor_float
        categorias[cat]["total_valor_mayor"] += p.precio_mayor_float

    categoria_performance = []
    for cat_data in categorias.values():
        categoria_performance.append({
            "categoria": cat_data["categoria"],
            "total_items": cat_data["total_items"],
            "total_costo": 0,  # No disponible
            "total_valor_menor": round(cat_data["total_valor_menor"], 2),
            "total_valor_mayor": round(cat_data["total_valor_mayor"], 2),
            "margen_promedio_menor": 0,  # No disponible sin costo
            "margen_promedio_mayor": 0   # No disponible sin costo
        })

    # Sort by total items (most products first)
    categoria_performance.sort(key=lambda x: x["total_items"], reverse=True)

    return {
        "valuacion": {
            "total_costo_inventario": 0,  # No disponible
            "total_valor_minorista": round(total_valor_minorista, 2),
            "total_valor_mayorista": round(total_valor_mayorista, 2),
            "ganancia_potencial_minorista": 0,  # No disponible sin costo
            "ganancia_potencial_mayorista": 0   # No disponible sin costo
        },
        "rentabilidad": {
            "margen_promedio_minorista": 0,  # No disponible sin costo
            "margen_promedio_mayorista": 0   # No disponible sin costo
        },
        "alertas": {
            "productos_margen_negativo": [],  # No disponible sin costo
            "productos_sin_precio": productos_sin_precio[:20],
            "total_margen_negativo": 0,
            "total_sin_precio": len(productos_sin_precio)
        },
        "categoria_performance": categoria_performance
    }


# ==================== VENTAS ====================

@app.post("/ventas", response_model=VentaResponse, status_code=status.HTTP_201_CREATED, tags=["Ventas"])
async def crear_venta(venta: VentaCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva venta/ticket.

    - Recibe cliente y lista de items con producto_id y cantidad
    - Calcula el total en el servidor segun tipo de venta (Mayorista/Minorista)
    - Retorna la venta completa con detalles para imprimir
    """
    if not venta.items:
        raise HTTPException(status_code=400, detail="La venta debe tener al menos un item")

    try:
        nueva_venta = VentaService.crear_venta(db, venta)
        return nueva_venta
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al crear la venta: {str(e)}")


@app.get("/ventas", tags=["Ventas"])
async def listar_ventas(
    limit: int = 50,
    offset: int = 0,
    tipo_venta: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Lista el historial de ventas.

    - **limit/offset**: Paginacion
    - **tipo_venta**: Filtrar por Mayorista o Minorista
    """
    ventas, total = VentaService.listar_ventas(db, limit, offset, tipo_venta)

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "ventas": [
            {
                "id": v.id,
                "fecha": v.fecha.isoformat() if v.fecha else None,
                "cliente_nombre": v.cliente_nombre,
                "total": v.total,
                "tipo_venta": v.tipo_venta,
                "cantidad_items": len(v.detalles) if v.detalles else 0
            }
            for v in ventas
        ]
    }


@app.get("/ventas/{venta_id}", response_model=VentaResponse, tags=["Ventas"])
async def obtener_venta(venta_id: int, db: Session = Depends(get_db)):
    """
    Obtiene el detalle completo de una venta para reimprimir.
    """
    venta = VentaService.get_venta(db, venta_id)
    if not venta:
        raise HTTPException(status_code=404, detail="Venta no encontrada")
    return venta


@app.get("/ventas/estadisticas/resumen", tags=["Ventas"])
async def estadisticas_ventas(db: Session = Depends(get_db)):
    """Obtiene estadisticas de ventas"""
    return VentaService.get_estadisticas_ventas(db)


# ==================== CODIGO DE BARRAS ====================

@app.patch("/productos/{producto_id}/codigo-barra", response_model=ProductoResponse, tags=["Productos"])
async def actualizar_codigo_barra(
    producto_id: str,
    data: CodigoBarraUpdate,
    db: Session = Depends(get_db)
):
    """
    Actualiza solo el codigo de barras de un producto.
    Endpoint optimizado para uso con lector de codigos de barras.
    """
    producto = ProductoService.get_producto(db, producto_id)
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # Verificar que el codigo de barras no este en uso por otro producto
    existing = ProductoService.get_producto_by_codigo_barra(db, data.codigo_barra)
    if existing and existing.codigo != producto_id:
        raise HTTPException(
            status_code=400,
            detail=f"El codigo de barras ya esta asignado al producto: {existing.producto}"
        )

    # Actualizar usando el servicio existente
    update_data = ProductoUpdate(codigo_barra=data.codigo_barra)
    producto_actualizado = ProductoService.update_producto(db, producto_id, update_data)

    return producto_actualizado


@app.get("/productos/sin-codigo-barra", tags=["Productos"])
async def productos_sin_codigo_barra(
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """
    Lista productos que no tienen codigo de barras asignado.
    Util para la pagina de asignacion de codigos.
    """
    from models import Producto

    query = db.query(Producto).filter(
        (Producto.codigo_barra == None) | (Producto.codigo_barra == "")
    )

    total = query.count()
    productos = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "productos": [p.to_dict() for p in productos]
    }


# ==================== MIDDLEWARE ASGI PARA VERCEL ====================
# Debe ir al final para envolver la app completa con todos sus middlewares

class StripApiPrefixMiddleware:
    """Middleware ASGI que remueve el prefijo /api de las rutas en Vercel"""
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path.startswith("/api"):
                scope = dict(scope)
                scope["path"] = path[4:] or "/"
                if "raw_path" in scope:
                    raw_path = scope["raw_path"]
                    if isinstance(raw_path, bytes) and raw_path.startswith(b"/api"):
                        scope["raw_path"] = raw_path[4:] or b"/"
        await self.app(scope, receive, send)

# Aplicar el middleware solo en Vercel
if IS_VERCEL:
    app = StripApiPrefixMiddleware(app)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
