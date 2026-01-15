from sqlalchemy import Column, String, Float, Date, Integer, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import date, datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "picture": self.picture,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None
        }

class Producto(Base):
    __tablename__ = "productos"

    # Mapeo exacto a columnas de Supabase (nombres en mayúsculas)
    codigo = Column("CÓDIGO", String, primary_key=True, index=True)
    producto = Column("PRODUCTO", String, nullable=False, index=True)
    categoria = Column("CATEGORIA", String, index=True, nullable=False)
    precio_menor = Column("PRECIO_MENOR", String, nullable=True)  # String por formato '1,600.00'
    precio_mayor = Column("PRECIO_MAYOR", String, nullable=True)  # String por formato '1,600.00'
    unidad = Column("UNIDAD", String, nullable=True)
    codigo_barra = Column("CODIGO_BARRA", String, nullable=True, index=True)
    ultima_actualizacion = Column("ULTIMA_ACTUALIZACION", String, nullable=True)

    # Propiedad para compatibilidad con código existente que usa "id"
    @property
    def id(self):
        return self.codigo

    def _parse_precio(self, valor):
        """Convierte string de precio '1,600.00' a float"""
        if valor is None:
            return 0.0
        if isinstance(valor, (int, float)):
            return float(valor)
        try:
            # Remover comas de miles y convertir a float
            return float(str(valor).replace(",", ""))
        except (ValueError, TypeError):
            return 0.0

    @property
    def precio_menor_float(self):
        return self._parse_precio(self.precio_menor)

    @property
    def precio_mayor_float(self):
        return self._parse_precio(self.precio_mayor)

    def to_dict(self):
        precio_min = self.precio_menor_float
        precio_may = self.precio_mayor_float
        return {
            "id": self.codigo,
            "codigo": self.codigo,
            "producto": self.producto,
            "categoria": self.categoria,
            "precio_menor": precio_min,
            "precio_mayor": precio_may,
            "costo_compra": 0.0,  # No existe en esquema actual
            "unidad": self.unidad,
            "codigo_barra": self.codigo_barra,
            "ultima_actualizacion": self.ultima_actualizacion,
            "diferencia_porcentual": round(
                ((precio_min - precio_may) / precio_may * 100)
                if precio_may and precio_may > 0 else 0, 2
            )
        }


class Venta(Base):
    __tablename__ = "ventas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    fecha = Column(DateTime, default=datetime.utcnow, nullable=False)
    cliente_nombre = Column(String, nullable=False, default="Cliente General")
    total = Column(Float, nullable=False, default=0.0)
    tipo_venta = Column(String, nullable=False, default="Minorista")  # Mayorista/Minorista
    observaciones = Column(Text, nullable=True)

    # Relacion con detalles
    detalles = relationship("DetalleVenta", back_populates="venta", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "fecha": self.fecha.isoformat() if self.fecha else None,
            "cliente_nombre": self.cliente_nombre,
            "total": self.total,
            "tipo_venta": self.tipo_venta,
            "observaciones": self.observaciones,
            "detalles": [d.to_dict() for d in self.detalles] if self.detalles else []
        }


class DetalleVenta(Base):
    __tablename__ = "detalles_venta"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    venta_id = Column(Integer, ForeignKey("ventas.id"), nullable=False)
    producto_codigo = Column(String, ForeignKey('productos."CÓDIGO"'), nullable=True)  # FK al codigo del producto
    codigo_producto = Column(String, nullable=False)  # Guardar codigo por si se borra el producto
    nombre_producto = Column(String, nullable=False)  # Guardar nombre por si se borra el producto
    cantidad = Column(Float, nullable=False, default=1.0)
    precio_unitario = Column(Float, nullable=False)  # Precio al momento de la venta
    subtotal = Column(Float, nullable=False)

    # Relaciones
    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto", foreign_keys=[producto_codigo])

    def to_dict(self):
        return {
            "id": self.id,
            "venta_id": self.venta_id,
            "producto_id": self.producto_codigo,  # Mantener nombre para compatibilidad
            "codigo_producto": self.codigo_producto,
            "nombre_producto": self.nombre_producto,
            "cantidad": self.cantidad,
            "precio_unitario": self.precio_unitario,
            "subtotal": self.subtotal
        }
