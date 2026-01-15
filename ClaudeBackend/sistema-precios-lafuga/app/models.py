from sqlalchemy import Column, String, Float, Date, Integer, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import date, datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    google_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    picture = Column(String, nullable=True)
    role = Column(String, default="user")  # "admin" or "user"
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

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

    @property
    def diferencia_porcentual(self) -> float:
        """Calcula la diferencia porcentual entre precio menor y mayor"""
        if self.precio_mayor > 0:
            return round(((self.precio_menor - self.precio_mayor) / self.precio_mayor * 100), 2)
        return 0.0

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
            "diferencia_porcentual": self.diferencia_porcentual
        }
