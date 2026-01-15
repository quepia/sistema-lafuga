from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models import Producto
from app.schemas import ProductoCreate, ProductoUpdate, ActualizacionMasiva
from typing import List, Optional
from datetime import date

class ProductoService:
    
    @staticmethod
    def get_producto(db: Session, producto_id: int) -> Optional[Producto]:
        """Obtiene un producto por ID"""
        return db.query(Producto).filter(Producto.id == producto_id).first()
    
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
        db_producto = Producto(**producto.model_dump())
        db_producto.ultima_actualizacion = date.today()
        db.add(db_producto)
        db.commit()
        db.refresh(db_producto)
        return db_producto
    
    @staticmethod
    def update_producto(db: Session, producto_id: int, producto_update: ProductoUpdate) -> Optional[Producto]:
        """Actualiza un producto existente"""
        db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
        if not db_producto:
            return None
        
        # Actualizar solo los campos proporcionados
        update_data = producto_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_producto, key, value)
        
        db_producto.ultima_actualizacion = date.today()
        db.commit()
        db.refresh(db_producto)
        return db_producto
    
    @staticmethod
    def delete_producto(db: Session, producto_id: int) -> bool:
        """Elimina un producto"""
        db_producto = db.query(Producto).filter(Producto.id == producto_id).first()
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
                producto.precio_menor = round(producto.precio_menor * factor, 2)
            if actualizacion.aplicar_a in ["mayor", "ambos"]:
                producto.precio_mayor = round(producto.precio_mayor * factor, 2)
            producto.ultima_actualizacion = date.today()
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
            func.count(Producto.id)
        ).group_by(Producto.categoria).all()
        
        productos_por_categoria = {cat: count for cat, count in categorias}
        
        # Productos sin precio
        sin_precio = db.query(Producto).filter(
            (Producto.precio_menor == 0) | (Producto.precio_mayor == 0)
        ).count()
        
        # Productos sin código de barras
        sin_codigo_barra = db.query(Producto).filter(
            (Producto.codigo_barra == None) | (Producto.codigo_barra == "")
        ).count()
        
        # Promedios
        promedios = db.query(
            func.avg(Producto.precio_menor),
            func.avg(Producto.precio_mayor)
        ).first()
        
        return {
            "total_productos": total,
            "productos_por_categoria": productos_por_categoria,
            "productos_sin_precio": sin_precio,
            "productos_sin_codigo_barra": sin_codigo_barra,
            "promedio_precio_menor": round(promedios[0] or 0, 2),
            "promedio_precio_mayor": round(promedios[1] or 0, 2)
        }

    @staticmethod
    def get_reportes(db: Session) -> dict:
        """Obtiene datos para reportes de negocio"""
        productos = db.query(Producto).all()

        # Valuation: Total Cost vs Total Retail Value
        total_costo = sum(p.costo_compra for p in productos)
        total_valor_menor = sum(p.precio_menor for p in productos)
        total_valor_mayor = sum(p.precio_mayor for p in productos)

        # Profitability: Average Margin %
        # Margin = (Price - Cost) / Price * 100
        margenes_menor = []
        margenes_mayor = []
        productos_margen_negativo = []
        productos_sin_precio = []

        for p in productos:
            # Margen minorista
            if p.precio_menor > 0:
                margen_menor = ((p.precio_menor - p.costo_compra) / p.precio_menor) * 100
                margenes_menor.append(margen_menor)
                if margen_menor < 0:
                    productos_margen_negativo.append(p.to_dict())
            else:
                productos_sin_precio.append(p.to_dict())

            # Margen mayorista
            if p.precio_mayor > 0:
                margen_mayor = ((p.precio_mayor - p.costo_compra) / p.precio_mayor) * 100
                margenes_mayor.append(margen_mayor)
                if margen_mayor < 0 and p not in [prod for prod in productos if prod.to_dict() in productos_margen_negativo]:
                    productos_margen_negativo.append(p.to_dict())

        promedio_margen_menor = round(sum(margenes_menor) / len(margenes_menor), 2) if margenes_menor else 0
        promedio_margen_mayor = round(sum(margenes_mayor) / len(margenes_mayor), 2) if margenes_mayor else 0

        # Category Performance
        categorias_stats = {}
        for p in productos:
            if p.categoria not in categorias_stats:
                categorias_stats[p.categoria] = {
                    "total_items": 0,
                    "total_costo": 0,
                    "total_valor_menor": 0,
                    "total_valor_mayor": 0,
                    "margenes_menor": [],
                    "margenes_mayor": []
                }

            categorias_stats[p.categoria]["total_items"] += 1
            categorias_stats[p.categoria]["total_costo"] += p.costo_compra
            categorias_stats[p.categoria]["total_valor_menor"] += p.precio_menor
            categorias_stats[p.categoria]["total_valor_mayor"] += p.precio_mayor

            if p.precio_menor > 0:
                margen = ((p.precio_menor - p.costo_compra) / p.precio_menor) * 100
                categorias_stats[p.categoria]["margenes_menor"].append(margen)
            if p.precio_mayor > 0:
                margen = ((p.precio_mayor - p.costo_compra) / p.precio_mayor) * 100
                categorias_stats[p.categoria]["margenes_mayor"].append(margen)

        categoria_performance = []
        for cat, stats in categorias_stats.items():
            avg_margen_menor = round(sum(stats["margenes_menor"]) / len(stats["margenes_menor"]), 2) if stats["margenes_menor"] else 0
            avg_margen_mayor = round(sum(stats["margenes_mayor"]) / len(stats["margenes_mayor"]), 2) if stats["margenes_mayor"] else 0
            categoria_performance.append({
                "categoria": cat,
                "total_items": stats["total_items"],
                "total_costo": round(stats["total_costo"], 2),
                "total_valor_menor": round(stats["total_valor_menor"], 2),
                "total_valor_mayor": round(stats["total_valor_mayor"], 2),
                "margen_promedio_menor": avg_margen_menor,
                "margen_promedio_mayor": avg_margen_mayor
            })

        return {
            "valuacion": {
                "total_costo_inventario": round(total_costo, 2),
                "total_valor_minorista": round(total_valor_menor, 2),
                "total_valor_mayorista": round(total_valor_mayor, 2),
                "ganancia_potencial_minorista": round(total_valor_menor - total_costo, 2),
                "ganancia_potencial_mayorista": round(total_valor_mayor - total_costo, 2)
            },
            "rentabilidad": {
                "margen_promedio_minorista": promedio_margen_menor,
                "margen_promedio_mayorista": promedio_margen_mayor
            },
            "alertas": {
                "productos_margen_negativo": productos_margen_negativo[:50],  # Limit to 50
                "productos_sin_precio": productos_sin_precio[:50],  # Limit to 50
                "total_margen_negativo": len(productos_margen_negativo),
                "total_sin_precio": len(productos_sin_precio)
            },
            "categoria_performance": sorted(categoria_performance, key=lambda x: x["total_items"], reverse=True)
        }
