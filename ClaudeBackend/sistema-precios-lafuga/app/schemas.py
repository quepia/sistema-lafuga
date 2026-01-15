from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

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
    id: int
    ultima_actualizacion: Optional[date]
    diferencia_porcentual: float

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
