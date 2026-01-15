#!/usr/bin/env python3
"""
Script para cargar los datos iniciales desde el archivo Excel consolidado
"""
import pandas as pd
import sys
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, Producto

def cargar_datos_iniciales(excel_path: str, db_url: str = "sqlite:///./database/lafuga.db"):
    """
    Carga los datos iniciales desde el archivo Excel consolidado
    """
    print("=" * 70)
    print("  SISTEMA DE GESTIÓN DE PRECIOS - LA FUGA")
    print("  Carga de Datos Iniciales")
    print("=" * 70)
    
    # Crear engine y sesión
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Leer Excel
        print(f"\n📂 Leyendo archivo: {excel_path}")
        df = pd.read_excel(excel_path, sheet_name='LISTA_COMPLETA')
        print(f"✓ Archivo leído correctamente")
        print(f"✓ Productos encontrados: {len(df)}")
        
        # Mostrar columnas
        print(f"✓ Columnas: {', '.join(df.columns)}")
        
        # Limpiar datos
        df = df.fillna({
            'UNIDAD': '',
            'CODIGO_BARRA': '',
            'PRECIO_MENOR': 0.0,
            'PRECIO_MAYOR': 0.0,
            'COSTO': 0.0
        })

        # Si no existe la columna COSTO, crearla con valor 0
        if 'COSTO' not in df.columns:
            df['COSTO'] = 0.0
        
        # Verificar si ya hay datos
        existing_count = db.query(Producto).count()
        if existing_count > 0:
            print(f"\n⚠️  ATENCIÓN: Ya existen {existing_count} productos en la base de datos")
            respuesta = input("¿Deseas eliminarlos y cargar nuevamente? (s/n): ")
            if respuesta.lower() == 's':
                print("⏳ Eliminando datos anteriores...")
                db.query(Producto).delete()
                db.commit()
                print("✓ Datos anteriores eliminados")
            else:
                print("❌ Carga cancelada por el usuario")
                return
        
        # Insertar productos
        print("\n⏳ Insertando productos en la base de datos...")
        print("   Esto puede tomar unos momentos...")
        
        productos_insertados = 0
        errores = []
        
        for idx, row in df.iterrows():
            try:
                # Convertir fecha
                fecha = None
                if pd.notna(row['ULTIMA_ACTUALIZACION']):
                    if isinstance(row['ULTIMA_ACTUALIZACION'], str):
                        fecha = datetime.strptime(row['ULTIMA_ACTUALIZACION'], '%Y-%m-%d').date()
                    else:
                        fecha = row['ULTIMA_ACTUALIZACION']
                
                producto = Producto(
                    codigo=str(row['CÓDIGO']),
                    producto=str(row['PRODUCTO']),
                    categoria=str(row['CATEGORIA']),
                    precio_menor=float(row['PRECIO_MENOR']),
                    precio_mayor=float(row['PRECIO_MAYOR']),
                    costo_compra=float(row['COSTO']),
                    unidad=str(row['UNIDAD']) if row['UNIDAD'] else None,
                    codigo_barra=str(row['CODIGO_BARRA']) if row['CODIGO_BARRA'] else None,
                    ultima_actualizacion=fecha
                )
                
                db.add(producto)
                productos_insertados += 1
                
                # Commit cada 100 productos para mejor rendimiento
                if productos_insertados % 100 == 0:
                    db.commit()
                    print(f"   → {productos_insertados} productos insertados...")
                    
            except Exception as e:
                errores.append(f"Fila {idx + 2}: {str(e)}")
        
        # Commit final
        db.commit()
        
        # Resumen
        print("\n" + "=" * 70)
        print("  RESUMEN DE LA CARGA")
        print("=" * 70)
        print(f"\n✅ Productos insertados exitosamente: {productos_insertados}")
        
        if errores:
            print(f"\n⚠️  Errores encontrados: {len(errores)}")
            for error in errores[:5]:  # Mostrar primeros 5 errores
                print(f"   - {error}")
            if len(errores) > 5:
                print(f"   ... y {len(errores) - 5} errores más")
        
        # Estadísticas por categoría
        print("\n📊 DISTRIBUCIÓN POR CATEGORÍA:")
        print("-" * 40)
        for categoria in sorted(df['CATEGORIA'].unique()):
            count = len(df[df['CATEGORIA'] == categoria])
            porcentaje = (count / len(df)) * 100
            print(f"   {categoria:.<25} {count:>4} ({porcentaje:>5.1f}%)")
        
        # Información adicional
        sin_precio_menor = len(df[df['PRECIO_MENOR'] == 0])
        sin_precio_mayor = len(df[df['PRECIO_MAYOR'] == 0])
        sin_codigo_barra = len(df[df['CODIGO_BARRA'].isna()])
        
        print("\n📋 INFORMACIÓN ADICIONAL:")
        print("-" * 40)
        print(f"   Productos con precio menor = 0: {sin_precio_menor}")
        print(f"   Productos con precio mayor = 0: {sin_precio_mayor}")
        print(f"   Productos sin código de barras: {sin_codigo_barra}")
        
        print("\n✅ ¡Carga completada exitosamente!")
        print("\n💡 PRÓXIMO PASO:")
        print("   Inicia el servidor con: python main.py")
        print("   o con: uvicorn main:app --reload")
        print("\n" + "=" * 70)
        
    except FileNotFoundError:
        print(f"\n❌ ERROR: No se encontró el archivo: {excel_path}")
        print("   Verifica la ruta del archivo y vuelve a intentar.")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR INESPERADO: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    # Permitir especificar ruta del archivo por argumento
    if len(sys.argv) > 1:
        excel_path = sys.argv[1]
    else:
        # Ruta por defecto
        excel_path = "LISTA_PRECIOS_CONSOLIDADA_LA_FUGA.xlsx"
    
    cargar_datos_iniciales(excel_path)
