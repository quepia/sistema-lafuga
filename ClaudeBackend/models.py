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

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo = Column(String, unique=True, index=True, nullable=False)
    producto = Column(String, nullable=False, index=True)
    categoria = Column(String, index=True, nullable=False)
    precio_menor = Column(Float, nullable=False, default=0.0)
    precio_mayor = Column(Float, nullable=False, default=0.0)
    costo_compra = Column(Float, nullable=False, default=0.0)
    unidad = Column(String)
    codigo_barra = Column(String, index=True)
    ultima_actualizacion = Column(Date, default=date.today)

    def to_dict(self):
        return {
            "id": self.id,
            "codigo": self.codigo,
            "producto": self.producto,
            "categoria": self.categoria,
            "precio_menor": self.precio_menor,
            "precio_mayor": self.precio_mayor,
            "costo_compra": self.costo_compra,
            "unidad": self.unidad,
            "codigo_barra": self.codigo_barra,
            "ultima_actualizacion": str(self.ultima_actualizacion) if self.ultima_actualizacion else None,
            "diferencia_porcentual": round(
                ((self.precio_menor - self.precio_mayor) / self.precio_mayor * 100)
                if self.precio_mayor > 0 else 0, 2
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
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=True)  # Nullable por si se borra el producto
    codigo_producto = Column(String, nullable=False)  # Guardar codigo por si se borra el producto
    nombre_producto = Column(String, nullable=False)  # Guardar nombre por si se borra el producto
    cantidad = Column(Float, nullable=False, default=1.0)
    precio_unitario = Column(Float, nullable=False)  # Precio al momento de la venta
    subtotal = Column(Float, nullable=False)

    # Relaciones
    venta = relationship("Venta", back_populates="detalles")
    producto = relationship("Producto")

    def to_dict(self):
        return {
            "id": self.id,
            "venta_id": self.venta_id,
            "producto_id": self.producto_id,
            "codigo_producto": self.codigo_producto,
            "nombre_producto": self.nombre_producto,
            "cantidad": self.cantidad,
            "precio_unitario": self.precio_unitario,
            "subtotal": self.subtotal
        }
