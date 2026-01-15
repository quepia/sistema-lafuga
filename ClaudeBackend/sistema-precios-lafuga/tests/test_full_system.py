"""
Test Suite Completo - Sistema de Gestión de Precios LA FUGA
============================================================

Este archivo contiene pruebas automatizadas que cubren los módulos principales
del sistema según FUNCIONALIDADES_Y_TESTING.md:

- Módulo 1: Búsqueda de Productos (T1.1.1, T1.1.2)
- Módulo 2: Visualización (estructura de endpoints)
- Módulo 3: Filtros (categoría, rango de precios)
- Módulo 4: Actualización Individual (precios, costo_compra, historial)
- Módulo 5: Actualización Masiva (T5.1.1)
- Módulo 7: Estadísticas (promedios)

Ejecutar con: pytest tests/test_full_system.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import date
import sys
import os

# Agregar el directorio raíz al path para importar módulos
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from app.database import Base, get_db
from app.models import Producto

# Base de datos de prueba en memoria
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_database.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override de dependencia para usar DB de prueba"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


# Aplicar override
app.dependency_overrides[get_db] = override_get_db

# Cliente de prueba
client = TestClient(app)


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    """Configura la base de datos antes de cada test"""
    # Crear tablas
    Base.metadata.create_all(bind=engine)

    # Insertar datos de prueba
    db = TestingSessionLocal()
    try:
        # Limpiar datos existentes
        db.query(Producto).delete()
        db.commit()

        # Productos de prueba
        productos_test = [
            Producto(
                codigo="ALM001",
                producto="Arroz Largo Fino 1kg",
                categoria="ALMACEN",
                precio_menor=1500.0,
                precio_mayor=1200.0,
                costo_compra=900.0,
                unidad="UN",
                codigo_barra="7790001",
                ultima_actualizacion=date(2024, 1, 1)
            ),
            Producto(
                codigo="ALM002",
                producto="Aceite Girasol 1.5L",
                categoria="ALMACEN",
                precio_menor=2500.0,
                precio_mayor=2000.0,
                costo_compra=1500.0,
                unidad="UN",
                codigo_barra="7790002",
                ultima_actualizacion=date(2024, 1, 1)
            ),
            Producto(
                codigo="BEB001",
                producto="Coca Cola 2.25L",
                categoria="BEBIDAS",
                precio_menor=1800.0,
                precio_mayor=1500.0,
                costo_compra=1100.0,
                unidad="UN",
                codigo_barra="7790003",
                ultima_actualizacion=date(2024, 1, 1)
            ),
            Producto(
                codigo="BEB002",
                producto="Agua Mineral 2L",
                categoria="BEBIDAS",
                precio_menor=800.0,
                precio_mayor=600.0,
                costo_compra=400.0,
                unidad="UN",
                codigo_barra="7790004",
                ultima_actualizacion=date(2024, 1, 1)
            ),
            Producto(
                codigo="BAZ001",
                producto="Detergente Líquido 750ml",
                categoria="BAZAR",
                precio_menor=1200.0,
                precio_mayor=1000.0,
                costo_compra=700.0,
                unidad="UN",
                codigo_barra="7790005",
                ultima_actualizacion=date(2024, 1, 1)
            ),
            Producto(
                codigo="SIN001",
                producto="Producto Sin Precio",
                categoria="ALMACEN",
                precio_menor=0.0,
                precio_mayor=0.0,
                costo_compra=0.0,
                unidad="UN",
                codigo_barra=None,
                ultima_actualizacion=date(2024, 1, 1)
            ),
        ]

        for producto in productos_test:
            db.add(producto)

        db.commit()
    finally:
        db.close()

    yield

    # Cleanup después del test
    Base.metadata.drop_all(bind=engine)


# ============================================================
# MÓDULO 1: BÚSQUEDA DE PRODUCTOS
# ============================================================

class TestModulo1Busqueda:
    """
    Pruebas del Módulo 1: Búsqueda de Productos
    Casos: T1.1.1, T1.1.2
    """

    def test_T1_1_1_busqueda_por_nombre_producto(self):
        """
        T1.1.1: Búsqueda por nombre de producto
        Entrada: "Arroz"
        Esperado: Devuelve productos que contengan "Arroz" en el nombre
        """
        response = client.get("/productos", params={"query": "Arroz"})
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1

        # Verificar que el producto encontrado contiene "Arroz"
        productos = data["productos"]
        assert any("Arroz" in p["producto"] for p in productos)

    def test_T1_1_2_busqueda_por_codigo_sku(self):
        """
        T1.1.2: Búsqueda por código SKU
        Entrada: "ALM001"
        Esperado: Devuelve el producto con código ALM001
        """
        response = client.get("/productos", params={"query": "ALM001"})
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1

        # Verificar que encontró el producto correcto
        productos = data["productos"]
        assert any(p["codigo"] == "ALM001" for p in productos)

    def test_busqueda_por_codigo_barras(self):
        """
        Búsqueda por código de barras
        Entrada: "7790001"
        Esperado: Devuelve el producto con ese código de barras
        """
        response = client.get("/productos", params={"query": "7790001"})
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1

        productos = data["productos"]
        assert any(p["codigo_barra"] == "7790001" for p in productos)

    def test_busqueda_sin_resultados(self):
        """
        Búsqueda que no devuelve resultados
        Entrada: "XXXNOEXISTE"
        Esperado: Devuelve lista vacía con total 0
        """
        response = client.get("/productos", params={"query": "XXXNOEXISTE"})
        assert response.status_code == 200

        data = response.json()
        assert data["total"] == 0
        assert data["productos"] == []

    def test_busqueda_case_insensitive(self):
        """
        Búsqueda case-insensitive
        Entrada: "arroz" (minúsculas)
        Esperado: Devuelve productos que contengan "Arroz"
        """
        response = client.get("/productos", params={"query": "arroz"})
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1


# ============================================================
# MÓDULO 2: VISUALIZACIÓN
# ============================================================

class TestModulo2Visualizacion:
    """
    Pruebas del Módulo 2: Visualización
    Verifica la estructura de respuestas de los endpoints
    """

    def test_estructura_respuesta_productos(self):
        """
        Verifica que la respuesta de productos tiene la estructura correcta
        """
        response = client.get("/productos")
        assert response.status_code == 200

        data = response.json()

        # Verificar campos de paginación
        assert "total" in data
        assert "limit" in data
        assert "offset" in data
        assert "count" in data
        assert "productos" in data

        # Verificar estructura de producto
        if data["productos"]:
            producto = data["productos"][0]
            assert "id" in producto
            assert "codigo" in producto
            assert "producto" in producto
            assert "categoria" in producto
            assert "precio_menor" in producto
            assert "precio_mayor" in producto
            assert "costo_compra" in producto
            assert "unidad" in producto
            assert "codigo_barra" in producto
            assert "ultima_actualizacion" in producto
            assert "diferencia_porcentual" in producto

    def test_endpoint_producto_individual(self):
        """
        Verifica endpoint de producto individual por código
        """
        response = client.get("/productos/codigo/ALM001")
        assert response.status_code == 200

        data = response.json()
        assert data["codigo"] == "ALM001"
        assert data["producto"] == "Arroz Largo Fino 1kg"

    def test_endpoint_producto_no_encontrado(self):
        """
        Verifica manejo de producto no encontrado
        """
        response = client.get("/productos/codigo/NOEXISTE")
        assert response.status_code == 404

        data = response.json()
        assert "detail" in data

    def test_endpoint_health_check(self):
        """
        Verifica que el endpoint de health check funciona
        """
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


# ============================================================
# MÓDULO 3: FILTROS
# ============================================================

class TestModulo3Filtros:
    """
    Pruebas del Módulo 3: Filtros
    """

    def test_filtro_por_categoria(self):
        """
        Filtro por categoría
        Entrada: categoria="ALMACEN"
        Esperado: Solo productos de ALMACEN
        """
        response = client.get("/productos", params={"categoria": "ALMACEN"})
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1

        # Todos los productos deben ser de ALMACEN
        for producto in data["productos"]:
            assert producto["categoria"] == "ALMACEN"

    def test_filtro_por_rango_precio_minimo(self):
        """
        Filtro por precio mínimo
        Entrada: precio_min=1500
        Esperado: Solo productos con precio_menor >= 1500
        """
        response = client.get("/productos", params={"precio_min": 1500})
        assert response.status_code == 200

        data = response.json()

        for producto in data["productos"]:
            assert producto["precio_menor"] >= 1500

    def test_filtro_por_rango_precio_maximo(self):
        """
        Filtro por precio máximo
        Entrada: precio_max=1000
        Esperado: Solo productos con precio_menor <= 1000
        """
        response = client.get("/productos", params={"precio_max": 1000})
        assert response.status_code == 200

        data = response.json()

        for producto in data["productos"]:
            assert producto["precio_menor"] <= 1000

    def test_filtro_combinado_categoria_y_query(self):
        """
        Filtro combinado: categoría + búsqueda
        """
        response = client.get("/productos", params={
            "categoria": "BEBIDAS",
            "query": "Coca"
        })
        assert response.status_code == 200

        data = response.json()
        assert data["total"] >= 1

        for producto in data["productos"]:
            assert producto["categoria"] == "BEBIDAS"
            assert "Coca" in producto["producto"]

    def test_endpoint_categorias(self):
        """
        Verifica endpoint de listado de categorías
        """
        response = client.get("/categorias")
        assert response.status_code == 200

        categorias = response.json()
        assert isinstance(categorias, list)
        assert "ALMACEN" in categorias
        assert "BEBIDAS" in categorias
        assert "BAZAR" in categorias

    def test_paginacion(self):
        """
        Verifica paginación con limit y offset
        """
        response = client.get("/productos", params={"limit": 2, "offset": 0})
        assert response.status_code == 200

        data = response.json()
        assert data["limit"] == 2
        assert data["offset"] == 0
        assert len(data["productos"]) <= 2


# ============================================================
# MÓDULO 4: ACTUALIZACIÓN INDIVIDUAL
# ============================================================

class TestModulo4ActualizacionIndividual:
    """
    Pruebas del Módulo 4: Actualización Individual de Precios
    Incluye costo_compra y verificación de historial
    """

    def test_actualizar_precio_menor(self):
        """
        Actualiza el precio menor de un producto
        """
        # Obtener producto actual
        response = client.get("/productos/codigo/ALM001")
        producto = response.json()
        producto_id = producto["id"]
        precio_original = producto["precio_menor"]

        # Actualizar precio
        nuevo_precio = 1750.0
        response = client.put(f"/productos/{producto_id}", json={
            "precio_menor": nuevo_precio
        })
        assert response.status_code == 200

        data = response.json()
        assert data["precio_menor"] == nuevo_precio

        # Verificar que se actualizó la fecha
        assert data["ultima_actualizacion"] == str(date.today())

    def test_actualizar_precio_mayor(self):
        """
        Actualiza el precio mayor de un producto
        """
        response = client.get("/productos/codigo/ALM001")
        producto = response.json()
        producto_id = producto["id"]

        nuevo_precio = 1350.0
        response = client.put(f"/productos/{producto_id}", json={
            "precio_mayor": nuevo_precio
        })
        assert response.status_code == 200

        data = response.json()
        assert data["precio_mayor"] == nuevo_precio

    def test_actualizar_costo_compra(self):
        """
        Actualiza el costo de compra de un producto
        Característica nueva: costo_compra
        """
        response = client.get("/productos/codigo/ALM001")
        producto = response.json()
        producto_id = producto["id"]

        nuevo_costo = 950.0
        response = client.put(f"/productos/{producto_id}", json={
            "costo_compra": nuevo_costo
        })
        assert response.status_code == 200

        data = response.json()
        assert data["costo_compra"] == nuevo_costo

    def test_actualizar_multiples_campos(self):
        """
        Actualiza múltiples campos simultáneamente
        """
        response = client.get("/productos/codigo/ALM002")
        producto = response.json()
        producto_id = producto["id"]

        response = client.put(f"/productos/{producto_id}", json={
            "precio_menor": 2700.0,
            "precio_mayor": 2200.0,
            "costo_compra": 1600.0
        })
        assert response.status_code == 200

        data = response.json()
        assert data["precio_menor"] == 2700.0
        assert data["precio_mayor"] == 2200.0
        assert data["costo_compra"] == 1600.0

    def test_actualizar_producto_no_existente(self):
        """
        Intento de actualizar producto inexistente
        """
        response = client.put("/productos/99999", json={
            "precio_menor": 1000.0
        })
        assert response.status_code == 404

    def test_historial_actualizacion(self):
        """
        Verifica que se actualiza la fecha de última actualización
        """
        response = client.get("/productos/codigo/BEB001")
        producto = response.json()
        producto_id = producto["id"]
        fecha_original = producto["ultima_actualizacion"]

        # Actualizar
        response = client.put(f"/productos/{producto_id}", json={
            "precio_menor": 1900.0
        })
        assert response.status_code == 200

        data = response.json()
        # La fecha debe ser la de hoy
        assert data["ultima_actualizacion"] == str(date.today())

    def test_validacion_precio_negativo(self):
        """
        Verifica que no se permiten precios negativos
        """
        response = client.get("/productos/codigo/ALM001")
        producto = response.json()
        producto_id = producto["id"]

        response = client.put(f"/productos/{producto_id}", json={
            "precio_menor": -100.0
        })
        # FastAPI con Pydantic debería rechazar esto
        assert response.status_code == 422


# ============================================================
# MÓDULO 5: ACTUALIZACIÓN MASIVA
# ============================================================

class TestModulo5ActualizacionMasiva:
    """
    Pruebas del Módulo 5: Actualización Masiva de Precios
    Caso: T5.1.1
    """

    def test_T5_1_1_aumento_porcentaje_categoria(self):
        """
        T5.1.1: Aumento porcentual por categoría
        Entrada: categoria=ALMACEN, porcentaje=10, aplicar_a=menor
        Esperado: Todos los productos ALMACEN aumentan 10% precio menor
        """
        # Obtener precios originales
        response = client.get("/productos", params={"categoria": "ALMACEN"})
        productos_originales = {
            p["codigo"]: p["precio_menor"]
            for p in response.json()["productos"]
        }

        # Aplicar aumento masivo
        response = client.post("/productos/actualizar-masiva", json={
            "categoria": "ALMACEN",
            "porcentaje": 10.0,
            "aplicar_a": "menor"
        })
        assert response.status_code == 200

        data = response.json()
        assert data["productos_actualizados"] >= 1

        # Verificar que los precios aumentaron 10%
        response = client.get("/productos", params={"categoria": "ALMACEN"})
        for producto in response.json()["productos"]:
            if producto["codigo"] in productos_originales:
                precio_original = productos_originales[producto["codigo"]]
                precio_esperado = round(precio_original * 1.10, 2)
                assert producto["precio_menor"] == precio_esperado

    def test_aumento_masivo_precio_mayor(self):
        """
        Aumento masivo en precio mayor
        """
        response = client.post("/productos/actualizar-masiva", json={
            "categoria": "BEBIDAS",
            "porcentaje": 5.0,
            "aplicar_a": "mayor"
        })
        assert response.status_code == 200

        data = response.json()
        assert data["productos_actualizados"] >= 1

    def test_aumento_masivo_ambos_precios(self):
        """
        Aumento masivo en ambos precios
        """
        response = client.get("/productos", params={"categoria": "BAZAR"})
        productos_originales = {
            p["codigo"]: (p["precio_menor"], p["precio_mayor"])
            for p in response.json()["productos"]
        }

        response = client.post("/productos/actualizar-masiva", json={
            "categoria": "BAZAR",
            "porcentaje": 15.0,
            "aplicar_a": "ambos"
        })
        assert response.status_code == 200

        # Verificar ambos precios
        response = client.get("/productos", params={"categoria": "BAZAR"})
        for producto in response.json()["productos"]:
            if producto["codigo"] in productos_originales:
                original_menor, original_mayor = productos_originales[producto["codigo"]]
                assert producto["precio_menor"] == round(original_menor * 1.15, 2)
                assert producto["precio_mayor"] == round(original_mayor * 1.15, 2)

    def test_descuento_masivo(self):
        """
        Descuento masivo (porcentaje negativo)
        """
        response = client.post("/productos/actualizar-masiva", json={
            "categoria": "BEBIDAS",
            "porcentaje": -5.0,
            "aplicar_a": "menor"
        })
        assert response.status_code == 200

        data = response.json()
        assert data["productos_actualizados"] >= 1

    def test_actualizacion_masiva_sin_categoria_ni_codigos(self):
        """
        Actualización masiva sin criterio de selección
        Debe retornar 0 productos actualizados
        """
        response = client.post("/productos/actualizar-masiva", json={
            "porcentaje": 10.0,
            "aplicar_a": "menor"
        })
        assert response.status_code == 200

        data = response.json()
        assert data["productos_actualizados"] == 0


# ============================================================
# MÓDULO 7: ESTADÍSTICAS
# ============================================================

class TestModulo7Estadisticas:
    """
    Pruebas del Módulo 7: Estadísticas
    """

    def test_endpoint_estadisticas(self):
        """
        Verifica que el endpoint de estadísticas devuelve datos correctos
        """
        response = client.get("/estadisticas")
        assert response.status_code == 200

        data = response.json()

        # Verificar campos requeridos
        assert "total_productos" in data
        assert "productos_por_categoria" in data
        assert "productos_sin_precio" in data
        assert "productos_sin_codigo_barra" in data
        assert "promedio_precio_menor" in data
        assert "promedio_precio_mayor" in data

    def test_total_productos_correcto(self):
        """
        Verifica que el total de productos es correcto
        """
        response = client.get("/estadisticas")
        data = response.json()

        # Tenemos 6 productos de prueba
        assert data["total_productos"] == 6

    def test_productos_por_categoria(self):
        """
        Verifica conteo por categoría
        """
        response = client.get("/estadisticas")
        data = response.json()

        categorias = data["productos_por_categoria"]
        assert "ALMACEN" in categorias
        assert "BEBIDAS" in categorias
        assert "BAZAR" in categorias

        # ALMACEN tiene 3 productos (ALM001, ALM002, SIN001)
        assert categorias["ALMACEN"] == 3
        # BEBIDAS tiene 2 productos
        assert categorias["BEBIDAS"] == 2
        # BAZAR tiene 1 producto
        assert categorias["BAZAR"] == 1

    def test_productos_sin_precio(self):
        """
        Verifica conteo de productos sin precio
        """
        response = client.get("/estadisticas")
        data = response.json()

        # SIN001 tiene precio 0
        assert data["productos_sin_precio"] >= 1

    def test_productos_sin_codigo_barra(self):
        """
        Verifica conteo de productos sin código de barras
        """
        response = client.get("/estadisticas")
        data = response.json()

        # SIN001 no tiene código de barras
        assert data["productos_sin_codigo_barra"] >= 1

    def test_promedio_precio_menor(self):
        """
        Verifica cálculo de promedio de precio menor
        """
        response = client.get("/estadisticas")
        data = response.json()

        # Promedio debe ser mayor que 0
        assert data["promedio_precio_menor"] > 0

        # Calcular promedio esperado:
        # (1500 + 2500 + 1800 + 800 + 1200 + 0) / 6 = 1300
        assert abs(data["promedio_precio_menor"] - 1300) < 1

    def test_promedio_precio_mayor(self):
        """
        Verifica cálculo de promedio de precio mayor
        """
        response = client.get("/estadisticas")
        data = response.json()

        assert data["promedio_precio_mayor"] > 0

        # (1200 + 2000 + 1500 + 600 + 1000 + 0) / 6 = 1050
        assert abs(data["promedio_precio_mayor"] - 1050) < 1


# ============================================================
# TESTS DE CRUD BÁSICO
# ============================================================

class TestCRUDBasico:
    """
    Pruebas de operaciones CRUD básicas
    """

    def test_crear_producto(self):
        """
        Crea un nuevo producto
        """
        nuevo_producto = {
            "codigo": "TEST001",
            "producto": "Producto de Prueba",
            "categoria": "TEST",
            "precio_menor": 100.0,
            "precio_mayor": 80.0,
            "costo_compra": 50.0,
            "unidad": "UN",
            "codigo_barra": "9999999"
        }

        response = client.post("/productos", json=nuevo_producto)
        assert response.status_code == 201

        data = response.json()
        assert data["codigo"] == "TEST001"
        assert data["producto"] == "Producto de Prueba"
        assert data["costo_compra"] == 50.0

    def test_crear_producto_duplicado(self):
        """
        Intenta crear producto con código duplicado
        """
        producto = {
            "codigo": "ALM001",  # Ya existe
            "producto": "Duplicado",
            "categoria": "TEST",
            "precio_menor": 100.0,
            "precio_mayor": 80.0
        }

        response = client.post("/productos", json=producto)
        assert response.status_code == 400

    def test_eliminar_producto(self):
        """
        Elimina un producto
        """
        # Primero crear un producto para eliminar
        nuevo_producto = {
            "codigo": "DEL001",
            "producto": "Para Eliminar",
            "categoria": "TEST",
            "precio_menor": 100.0,
            "precio_mayor": 80.0
        }

        response = client.post("/productos", json=nuevo_producto)
        producto_id = response.json()["id"]

        # Eliminar
        response = client.delete(f"/productos/{producto_id}")
        assert response.status_code == 204

        # Verificar que no existe
        response = client.get(f"/productos/{producto_id}")
        assert response.status_code == 404

    def test_obtener_productos_por_categoria_endpoint(self):
        """
        Obtiene productos de una categoría específica usando endpoint dedicado
        """
        response = client.get("/categorias/ALMACEN/productos")
        assert response.status_code == 200

        productos = response.json()
        assert isinstance(productos, list)
        for producto in productos:
            assert producto["categoria"] == "ALMACEN"


# ============================================================
# CLEANUP
# ============================================================

@pytest.fixture(scope="session", autouse=True)
def cleanup():
    """Limpieza final después de todos los tests"""
    yield

    # Eliminar archivo de base de datos de prueba
    import os
    if os.path.exists("test_database.db"):
        try:
            os.remove("test_database.db")
        except:
            pass
