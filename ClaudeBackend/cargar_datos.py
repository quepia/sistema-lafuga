#!/usr/bin/env python3
"""
Script para cargar los datos iniciales desde el archivo Excel consolidado (LISTA_MAESTRA_LIMPIA).

Mapeo de columnas esperado:
- CODIGO -> codigo
- PRODUCTO -> producto
- CATEGORIA -> categoria
- COSTO -> costo_compra (0.0 si es nulo)
- PRECIO_MENOR -> precio_menor
- PRECIO_MAYOR -> precio_mayor
- UNIDAD -> unidad
- CODIGO_BARRA -> codigo_barra
- ULTIMA_ACTUALIZACION -> ultima_actualizacion
"""
import pandas as pd
import sys
import os
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base, Producto

# --- CONFIGURACIÓN DE BASE DE DATOS ---
# Ajuste automático de ruta para evitar errores de "file not found" en la DB
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database", "lafuga.db")
DB_URL = f"sqlite:///{DB_PATH}"

def cargar_datos_iniciales(excel_path: str):
    """
    Carga los datos iniciales desde el archivo Excel consolidado.
    """
    print("=" * 70)
    print("  SISTEMA DE GESTION DE PRECIOS - LA FUGA")
    print("  Carga de Datos (Lista Maestra)")
    print("=" * 70)

    # Crear carpeta database si no existe
    db_folder = os.path.dirname(DB_PATH)
    if not os.path.exists(db_folder):
        os.makedirs(db_folder)
        print(f"[*] Carpeta creada: {db_folder}")

    # Crear engine y sesión
    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Verificar si el archivo Excel existe
        if not os.path.exists(excel_path):
            print(f"\n[ERROR] No se encontró el archivo: {excel_path}")
            print("        Asegúrate de haber ejecutado primero el script 'consolidar_todo.py'")
            return

        # Leer Excel
        print(f"\n[*] Leyendo archivo: {excel_path}")
        df = pd.read_excel(excel_path)
        print(f"[OK] Archivo leído correctamente")
        print(f"[OK] Productos encontrados: {len(df)}")

        # Verificar si ya hay datos en la DB
        existing_count = db.query(Producto).count()
        if existing_count > 0:
            print(f"\n[!] ATENCIÓN: Ya existen {existing_count} productos en la base de datos")
            respuesta = input("¿Deseas eliminarlos y cargar nuevamente? (s/n): ")
            if respuesta.lower() == 's':
                print("[*] Eliminando datos anteriores...")
                db.query(Producto).delete()
                db.commit()
                print("[OK] Datos anteriores eliminados")
            else:
                print("[X] Carga cancelada. Se mantendrán los datos actuales.")
                return

        # Insertar productos
        print("\n[*] Insertando productos en la base de datos...")
        
        productos_insertados = 0
        errores = []

        for idx, row in df.iterrows():
            try:
                # 1. GENERACIÓN/LIMPIEZA DE CÓDIGO
                # Usamos .get() para seguridad si la columna no existe
                raw_codigo = row.get('CODIGO', None)
                
                if pd.isna(raw_codigo) or str(raw_codigo).strip() == '' or str(raw_codigo).lower() in ('nan', 'none'):
                    # Generar código basado en la categoría (Ej: ALM-001)
                    cat_prefix = str(row.get('CATEGORIA', 'GEN'))[:3].upper()
                    codigo = f"{cat_prefix}-{idx+1:04d}"
                    # print(f"    [Avance] Generado código automático: {codigo}")
                else:
                    codigo = str(raw_codigo).strip()

                # 2. COSTO (Manejo de vacíos)
                costo_raw = row.get('COSTO', 0)
                try:
                    costo = 0.0 if pd.isna(costo_raw) else float(costo_raw)
                except:
                    costo = 0.0

                # 3. PRECIOS (Manejo de vacíos)
                p_menor_raw = row.get('PRECIO_MENOR', 0)
                precio_menor = 0.0 if pd.isna(p_menor_raw) else float(p_menor_raw)

                p_mayor_raw = row.get('PRECIO_MAYOR', 0)
                precio_mayor = 0.0 if pd.isna(p_mayor_raw) else float(p_mayor_raw)

                # 4. FECHA
                fecha_raw = row.get('ULTIMA_ACTUALIZACION', datetime.now())
                if pd.isna(fecha_raw):
                    fecha = datetime.now()
                else:
                    fecha = fecha_raw

                # Crear objeto Producto
                producto = Producto(
                    codigo=codigo,
                    producto=str(row.get('PRODUCTO', 'Sin Nombre')).strip(),
                    categoria=str(row.get('CATEGORIA', 'General')).strip(),
                    costo_compra=costo,
                    precio_menor=precio_menor,
                    precio_mayor=precio_mayor,
                    unidad=str(row.get('UNIDAD', 'Unidad')),
                    codigo_barra=str(row.get('CODIGO_BARRA', '')).replace('nan', '') if not pd.isna(row.get('CODIGO_BARRA')) else None,
                    ultima_actualizacion=fecha
                )

                db.add(producto)
                productos_insertados += 1

                # Commit parcial cada 100 registros
                if productos_insertados % 100 == 0:
                    db.commit()
                    print(f"    -> {productos_insertados} procesados...", end='\r')

            except Exception as e:
                errores.append(f"Fila {idx + 2}: {str(e)}")

        # Commit final
        db.commit()
        print(f"    -> {productos_insertados} procesados (Finalizado).")

        # --- RESUMEN FINAL ---
        print("\n" + "=" * 70)
        print(f"✅ CARGA COMPLETADA: {productos_insertados} productos insertados.")
        
        if errores:
            print(f"⚠️ Se encontraron {len(errores)} errores (filas no cargadas).")
            # Opcional: imprimir los primeros errores
            # for e in errores[:3]: print(e)
        
        # Estadísticas rápidas
        print("-" * 40)
        print("RESUMEN POR CATEGORÍA:")
        categorias = df['CATEGORIA'].unique()
        for cat in categorias:
            cant = len(df[df['CATEGORIA'] == cat])
            print(f"   - {cat}: {cant} productos")
        print("-" * 40)
        print("💡 Ahora puedes iniciar el servidor con: uvicorn main:app --reload")

    except Exception as e:
        print(f"\n[ERROR CRÍTICO] {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Nombre del archivo generado por el script de consolidación
    ARCHIVO_NUEVO = "LISTA_MAESTRA_LIMPIA.xlsx"
    
    # Permitir argumento por consola, si no, usa el por defecto
    archivo_a_usar = sys.argv[1] if len(sys.argv) > 1 else ARCHIVO_NUEVO
    
    cargar_datos_iniciales(archivo_a_usar)