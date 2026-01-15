from sqlalchemy.orm import Session
from sqlalchemy import or_, func, desc
from models import Producto, User, Venta, DetalleVenta
from schemas import ProductoCreate, ProductoUpdate, ActualizacionMasiva, UserCreate, VentaCreate
from typing import List, Optional
from datetime import date, datetime

class ProductoService:
    
    @staticmethod
    def get_producto(db: Session, producto_id) -> Optional[Producto]:
        """Obtiene un producto por ID (codigo)"""
        return db.query(Producto).filter(Producto.codigo == str(producto_id)).first()
    
    @staticmethod
    def get_producto_by_codigo(db: Session, codigo: str) -> Optional[Producto]:
        """Obtiene un producto por código"""
        return db.query(Producto).filter(Producto.codigo == codigo).first()
    
    @staticmethod
    def get_producto_by_codigo_barra(db: Session, codigo_barra: str) -> Optional[Producto]:
        """Obtiene un producto por código de barras"""
        return db.query(Producto).filter(Producto.codigo_barra == codigo_barra).first()
    
    @staticmethod
    def buscar_productos(
        db: Session,
        query: Optional[str] = None,
        categoria: Optional[str] = None,
        precio_min: Optional[float] = None,
        precio_max: Optional[float] = None,
        limit: int = 100,
        offset: int = 0
    ) -> tuple[List[Producto], int]:
        """Busca productos con filtros múltiples"""
        db_query = db.query(Producto)
        
        # Filtro por búsqueda de texto
        if query:
            search = f"%{query}%"
            db_query = db_query.filter(
                or_(
                    Producto.producto.ilike(search),
                    Producto.codigo.ilike(search),
                    Producto.codigo_barra.ilike(search)
                )
            )
        
        # Filtro por categoría
        if categoria:
            db_query = db_query.filter(Producto.categoria == categoria)
        
        # Filtro por rango de precios
        if precio_min is not None:
            db_query = db_query.filter(Producto.precio_menor >= precio_min)
        if precio_max is not None:
            db_query = db_query.filter(Producto.precio_menor <= precio_max)
        
        # Obtener total
        total = db_query.count()
        
        # Aplicar paginación
        productos = db_query.offset(offset).limit(limit).all()
        
        return productos, total
    
    @staticmethod
    def get_productos_by_categoria(db: Session, categoria: str) -> List[Producto]:
        """Obtiene todos los productos de una categoría"""
        return db.query(Producto).filter(Producto.categoria == categoria).all()
    
    @staticmethod
    def get_all_categorias(db: Session) -> List[str]:
        """Obtiene lista de todas las categorías únicas"""
        return [cat[0] for cat in db.query(Producto.categoria).distinct().all()]
    
    @staticmethod
    def create_producto(db: Session, producto: ProductoCreate) -> Producto:
        """Crea un nuevo producto"""
        data = producto.model_dump()
        # Campos válidos en Supabase
        valid_fields = {'codigo', 'producto', 'categoria', 'precio_menor', 'precio_mayor', 'unidad', 'codigo_barra', 'ultima_actualizacion'}
        filtered_data = {k: v for k, v in data.items() if k in valid_fields}
        # Establecer fecha de actualización
        filtered_data['ultima_actualizacion'] = str(date.today())
        db_producto = Producto(**filtered_data)
        db.add(db_producto)
        db.commit()
        db.refresh(db_producto)
        return db_producto
    
    @staticmethod
    def update_producto(db: Session, producto_id, producto_update: ProductoUpdate) -> Optional[Producto]:
        """Actualiza un producto existente"""
        db_producto = db.query(Producto).filter(Producto.codigo == str(producto_id)).first()
        if not db_producto:
            return None

        # Actualizar solo los campos proporcionados
        update_data = producto_update.model_dump(exclude_unset=True)
        valid_fields = {'producto', 'categoria', 'precio_menor', 'precio_mayor', 'unidad', 'codigo_barra'}
        for key, value in update_data.items():
            if key in valid_fields:
                setattr(db_producto, key, value)

        # Actualizar fecha
        db_producto.ultima_actualizacion = str(date.today())
        db.commit()
        db.refresh(db_producto)
        return db_producto
    
    @staticmethod
    def delete_producto(db: Session, producto_id) -> bool:
        """Elimina un producto"""
        db_producto = db.query(Producto).filter(Producto.codigo == str(producto_id)).first()
        if not db_producto:
            return False
        db.delete(db_producto)
        db.commit()
        return True
    
    @staticmethod
    def actualizacion_masiva(db: Session, actualizacion: ActualizacionMasiva) -> int:
        """Actualiza precios de múltiples productos"""
        query = db.query(Producto)
        
        # Filtrar por categoría o códigos
        if actualizacion.categoria:
            query = query.filter(Producto.categoria == actualizacion.categoria)
        elif actualizacion.codigos:
            query = query.filter(Producto.codigo.in_(actualizacion.codigos))
        else:
            return 0
        
        productos = query.all()
        factor = 1 + (actualizacion.porcentaje / 100)

        count = 0
        for producto in productos:
            if actualizacion.aplicar_a in ["menor", "ambos"]:
                nuevo_precio = round(producto.precio_menor_float * factor, 2)
                producto.precio_menor = str(nuevo_precio)
            if actualizacion.aplicar_a in ["mayor", "ambos"]:
                nuevo_precio = round(producto.precio_mayor_float * factor, 2)
                producto.precio_mayor = str(nuevo_precio)
            producto.ultima_actualizacion = str(date.today())
            count += 1

        db.commit()
        return count
    
    @staticmethod
    def get_estadisticas(db: Session) -> dict:
        """Obtiene estadísticas generales"""
        total = db.query(Producto).count()

        # Productos por categoría
        categorias = db.query(
            Producto.categoria,
            func.count(Producto.codigo)
        ).group_by(Producto.categoria).all()

        productos_por_categoria = {cat: count for cat, count in categorias}

        # Productos sin precio (precio_menor es String, comparar con '0' o vacío)
        sin_precio = db.query(Producto).filter(
            (Producto.precio_menor == None) |
            (Producto.precio_menor == '') |
            (Producto.precio_menor == '0') |
            (Producto.precio_mayor == None) |
            (Producto.precio_mayor == '') |
            (Producto.precio_mayor == '0')
        ).count()

        # Productos sin código de barras
        sin_codigo_barra = db.query(Producto).filter(
            (Producto.codigo_barra == None) | (Producto.codigo_barra == "")
        ).count()

        # Promedios - obtener todos los productos y calcular en Python
        productos = db.query(Producto).all()
        precios_menor = [p.precio_menor_float for p in productos if p.precio_menor_float > 0]
        precios_mayor = [p.precio_mayor_float for p in productos if p.precio_mayor_float > 0]

        promedio_menor = sum(precios_menor) / len(precios_menor) if precios_menor else 0
        promedio_mayor = sum(precios_mayor) / len(precios_mayor) if precios_mayor else 0

        return {
            "total_productos": total,
            "productos_por_categoria": productos_por_categoria,
            "productos_sin_precio": sin_precio,
            "productos_sin_codigo_barra": sin_codigo_barra,
            "promedio_precio_menor": round(promedio_menor, 2),
            "promedio_precio_mayor": round(promedio_mayor, 2)
        }


class UserService:

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Obtiene un usuario por email"""
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Obtiene un usuario por ID"""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create_user(db: Session, user: UserCreate) -> User:
        """Crea un nuevo usuario"""
        db_user = User(
            email=user.email,
            name=user.name,
            picture=user.picture,
            role="user",
            created_at=datetime.utcnow()
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def update_user_login(db: Session, user: User) -> User:
        """Actualiza el ultimo login del usuario"""
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def get_or_create_user(db: Session, email: str, name: str, picture: Optional[str] = None) -> User:
        """Obtiene un usuario existente o lo crea si no existe"""
        user = UserService.get_user_by_email(db, email)
        if user:
            # Update last login and potentially name/picture
            user.name = name
            if picture:
                user.picture = picture
            user.last_login = datetime.utcnow()
            db.commit()
            db.refresh(user)
            return user
        else:
            user_data = UserCreate(email=email, name=name, picture=picture)
            return UserService.create_user(db, user_data)


class VentaService:
    """Servicio para gestionar ventas"""

    @staticmethod
    def crear_venta(db: Session, venta_data: VentaCreate) -> Venta:
        """
        Crea una nueva venta con sus detalles.
        Calcula el total en el servidor basado en los precios actuales.
        """
        # Crear la venta
        venta = Venta(
            cliente_nombre=venta_data.cliente_nombre,
            tipo_venta=venta_data.tipo_venta,
            observaciones=venta_data.observaciones,
            fecha=datetime.utcnow(),
            total=0.0
        )
        db.add(venta)
        db.flush()  # Para obtener el ID de la venta

        total = 0.0
        for item in venta_data.items:
            # Obtener el producto por codigo
            producto = db.query(Producto).filter(Producto.codigo == str(item.producto_id)).first()
            if not producto:
                raise ValueError(f"Producto con código {item.producto_id} no encontrado")

            # Determinar precio segun tipo de venta (usar propiedades float)
            precio_unitario = producto.precio_mayor_float if venta_data.tipo_venta == "Mayorista" else producto.precio_menor_float
            subtotal = precio_unitario * item.cantidad

            # Crear detalle
            detalle = DetalleVenta(
                venta_id=venta.id,
                producto_codigo=producto.codigo,
                codigo_producto=producto.codigo,
                nombre_producto=producto.producto,
                cantidad=item.cantidad,
                precio_unitario=precio_unitario,
                subtotal=subtotal
            )
            db.add(detalle)
            total += subtotal

        # Actualizar total de la venta
        venta.total = round(total, 2)
        db.commit()
        db.refresh(venta)
        return venta

    @staticmethod
    def get_venta(db: Session, venta_id: int) -> Optional[Venta]:
        """Obtiene una venta por ID con sus detalles"""
        return db.query(Venta).filter(Venta.id == venta_id).first()

    @staticmethod
    def listar_ventas(
        db: Session,
        limit: int = 50,
        offset: int = 0,
        tipo_venta: Optional[str] = None,
        fecha_desde: Optional[datetime] = None,
        fecha_hasta: Optional[datetime] = None
    ) -> tuple[List[Venta], int]:
        """Lista ventas con filtros opcionales"""
        query = db.query(Venta)

        if tipo_venta:
            query = query.filter(Venta.tipo_venta == tipo_venta)

        if fecha_desde:
            query = query.filter(Venta.fecha >= fecha_desde)

        if fecha_hasta:
            query = query.filter(Venta.fecha <= fecha_hasta)

        total = query.count()
        ventas = query.order_by(desc(Venta.fecha)).offset(offset).limit(limit).all()

        return ventas, total

    @staticmethod
    def get_estadisticas_ventas(db: Session) -> dict:
        """Obtiene estadisticas de ventas"""
        total_ventas = db.query(Venta).count()
        total_monto = db.query(func.sum(Venta.total)).scalar() or 0

        ventas_mayorista = db.query(Venta).filter(Venta.tipo_venta == "Mayorista").count()
        ventas_minorista = db.query(Venta).filter(Venta.tipo_venta == "Minorista").count()

        monto_mayorista = db.query(func.sum(Venta.total)).filter(Venta.tipo_venta == "Mayorista").scalar() or 0
        monto_minorista = db.query(func.sum(Venta.total)).filter(Venta.tipo_venta == "Minorista").scalar() or 0

        return {
            "total_ventas": total_ventas,
            "total_monto": round(total_monto, 2),
            "ventas_mayorista": ventas_mayorista,
            "ventas_minorista": ventas_minorista,
            "monto_mayorista": round(monto_mayorista, 2),
            "monto_minorista": round(monto_minorista, 2)
        }
