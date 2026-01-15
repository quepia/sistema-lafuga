from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime

class ProductoBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    producto: str = Field(..., min_length=1, max_length=500)
    categoria: str = Field(..., min_length=1, max_length=100)
    precio_menor: float = Field(ge=0)
    precio_mayor: float = Field(ge=0)
    costo_compra: float = Field(ge=0, default=0.0)
    unidad: Optional[str] = None
    codigo_barra: Optional[str] = None

class ProductoCreate(ProductoBase):
    pass

class ProductoUpdate(BaseModel):
    producto: Optional[str] = None
    categoria: Optional[str] = None
    precio_menor: Optional[float] = Field(None, ge=0)
    precio_mayor: Optional[float] = Field(None, ge=0)
    costo_compra: Optional[float] = Field(None, ge=0)
    unidad: Optional[str] = None
    codigo_barra: Optional[str] = None

class ProductoResponse(ProductoBase):
    id: str  # Ahora es el codigo (PK)
    ultima_actualizacion: Optional[date] = None
    diferencia_porcentual: float = 0.0

    class Config:
        from_attributes = True

class ActualizacionMasiva(BaseModel):
    categoria: Optional[str] = None
    codigos: Optional[list[str]] = None
    porcentaje: float = Field(..., description="Porcentaje de cambio (positivo para aumento, negativo para descuento)")
    aplicar_a: str = Field(..., pattern="^(menor|mayor|ambos)$")

class EstadisticasResponse(BaseModel):
    total_productos: int
    productos_por_categoria: dict
    productos_sin_precio: int
    productos_sin_codigo_barra: int
    promedio_precio_menor: float
    promedio_precio_mayor: float


# User schemas
class UserBase(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserResponse(UserBase):
    id: int
    role: str
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ==================== VENTAS ====================

class DetalleVentaItem(BaseModel):
    """Item individual para crear una venta"""
    producto_id: str  # Codigo del producto
    cantidad: float = Field(gt=0)


class VentaCreate(BaseModel):
    """Schema para crear una nueva venta"""
    cliente_nombre: str = Field(default="Cliente General", min_length=1, max_length=200)
    tipo_venta: str = Field(default="Minorista", pattern="^(Mayorista|Minorista)$")
    items: List[DetalleVentaItem]
    observaciones: Optional[str] = None


class DetalleVentaResponse(BaseModel):
    """Respuesta de un detalle de venta"""
    id: int
    venta_id: int
    producto_id: Optional[str]  # Codigo del producto
    codigo_producto: str
    nombre_producto: str
    cantidad: float
    precio_unitario: float
    subtotal: float

    class Config:
        from_attributes = True


class VentaResponse(BaseModel):
    """Respuesta de una venta"""
    id: int
    fecha: datetime
    cliente_nombre: str
    total: float
    tipo_venta: str
    observaciones: Optional[str]
    detalles: List[DetalleVentaResponse]

    class Config:
        from_attributes = True


class VentaListResponse(BaseModel):
    """Respuesta para listar ventas (sin detalles completos)"""
    id: int
    fecha: datetime
    cliente_nombre: str
    total: float
    tipo_venta: str
    cantidad_items: int

    class Config:
        from_attributes = True


# ==================== CODIGO DE BARRAS ====================

class CodigoBarraUpdate(BaseModel):
    """Schema para actualizar codigo de barras"""
    codigo_barra: str = Field(..., min_length=1, max_length=50)
