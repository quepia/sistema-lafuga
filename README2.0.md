
```markdown
# Sistema de Gestión de Precios - LA FUGA

Sistema completo para gestionar precios minoristas (MENOR) y mayoristas (MAYOR) de productos.

## Estructura del Proyecto


```

SISTEMA DE GESTION DE PRECIOS/
├── ClaudeBackend/
│   └── sistema-precios-lafuga/     # Backend FastAPI
│       ├── app/
│       │   ├── **init**.py
│       │   ├── models.py           # Modelos SQLAlchemy
│       │   ├── schemas.py          # Schemas Pydantic
│       │   ├── crud.py             # Operaciones de base de datos
│       │   └── database.py         # Configuración de BD
│       ├── database/               # Directorio para SQLite
│       ├── main.py                 # Aplicación FastAPI
│       ├── cargar_datos.py         # Script para importar Excel
│       ├── requirements.txt        # Dependencias Python
│       └── LISTA_PRECIOS_CONSOLIDADA_LA_FUGA.xlsx
│
└── frontend-design-concept/        # Frontend Next.js
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── price-management-system.tsx
│   ├── dashboard-view.tsx
│   ├── price-consultation-view.tsx
│   └── mass-update-view.tsx
├── lib/
│   └── api.ts                  # Servicios de API
├── hooks/
│   ├── use-productos.ts
│   ├── use-estadisticas.ts
│   ├── use-categorias.ts
│   └── use-actualizacion-masiva.ts
└── .env.local                  # Configuración

```

## Inicio Rápido

### 1. Iniciar el Backend (FastAPI) - Configuración macOS

**Nota:** Es crítico usar Python 3.11 para evitar errores de compilación con Pandas.

```bash
# Navegar al directorio del backend

# 1. LIMPIEZA: Si hubo una instalación fallida previa, borrar el entorno viejo
rm -rf venv

# 2. INSTALACIÓN DE PYTHON (Si no tienes la versión 3.11)
brew install python@3.11

# 3. CREAR ENTORNO VIRTUAL (Forzando Python 3.11 explícitamente)
python3.11 -m venv venv

# 4. ACTIVAR ENTORNO VIRTUAL
source venv/bin/activate

# 5. INSTALAR DEPENDENCIAS
# Primero actualizamos pip para evitar advertencias
pip install --upgrade pip
# Instalamos los requerimientos
pip install -r requirements.txt

# 6. CARGAR DATOS E INICIAR
# Cargar datos desde Excel (solo la primera vez)
python cargar_datos.py

# Iniciar el servidor
uvicorn main:app --reload --host 0.0.0.0 --port 8000

```

El backend estará disponible en:

* API: http://localhost:8000
* Documentación Swagger: http://localhost:8000/docs
* Health check: http://localhost:8000/health

### 2. Iniciar el Frontend (Next.js)

```bash
# En otra terminal, navegar al frontend
cd frontend-design-concept

# Instalar dependencias (usar pnpm, npm o yarn)
pnpm install
# o: npm install
# o: yarn install

# Iniciar servidor de desarrollo
pnpm dev
# o: npm run dev
# o: yarn dev

```

El frontend estará disponible en:

* http://localhost:3000

## Endpoints de la API

### Productos

| Método | Endpoint | Descripción |
| --- | --- | --- |
| GET | `/productos` | Lista productos con filtros |
| GET | `/productos/{id}` | Obtiene producto por ID |
| GET | `/productos/codigo/{codigo}` | Obtiene producto por SKU |
| GET | `/productos/barcode/{codigo}` | Obtiene producto por código de barras |
| POST | `/productos` | Crea nuevo producto |
| PUT | `/productos/{id}` | Actualiza producto |
| DELETE | `/productos/{id}` | Elimina producto |
| POST | `/productos/actualizar-masiva` | Actualización masiva |

### Categorías

| Método | Endpoint | Descripción |
| --- | --- | --- |
| GET | `/categorias` | Lista todas las categorías |
| GET | `/categorias/{categoria}/productos` | Productos de una categoría |

### Estadísticas

| Método | Endpoint | Descripción |
| --- | --- | --- |
| GET | `/estadisticas` | Estadísticas generales |

### Importación

| Método | Endpoint | Descripción |
| --- | --- | --- |
| POST | `/importar/excel` | Importa desde archivo Excel |

## Parámetros de Búsqueda

El endpoint `/productos` acepta los siguientes parámetros:

```
GET /productos?query=texto&categoria=DUX&precio_min=100&precio_max=5000&limit=20&offset=0

```

* `query`: Búsqueda en nombre, código o código de barras
* `categoria`: Filtrar por categoría específica
* `precio_min`: Precio mínimo
* `precio_max`: Precio máximo
* `limit`: Cantidad de resultados (default: 100)
* `offset`: Desplazamiento para paginación

## Actualización Masiva

Para actualizar precios masivamente:

```json
POST /productos/actualizar-masiva
{
  "categoria": "DUX",
  "porcentaje": 10,
  "aplicar_a": "menor"  // "menor", "mayor" o "ambos"
}

```

También puedes actualizar por códigos específicos:

```json
{
  "codigos": ["SKU001", "SKU002", "SKU003"],
  "porcentaje": -5,
  "aplicar_a": "ambos"
}

```

## Categorías Disponibles

* DUX
* ALMACEN
* BAZAR
* MASCOTAS
* LIBRERIA
* QUIMICA
* SUELTOS - QUIMICA

## Funcionalidades del Frontend

### Dashboard

* Total de productos
* Productos sin precio (requieren atención)
* Productos sin código de barras
* Cantidad de categorías
* Precios promedio (menor y mayor)
* Distribución de productos por categoría

### Consulta de Precios

* Búsqueda en tiempo real con debounce
* Filtro por categoría
* Paginación
* Edición individual de precios
* Visualización de precios MENOR (azul) y MAYOR (rosa)

### Actualización Masiva

* Selección de categoría
* Porcentaje de ajuste (positivo o negativo)
* Selección de tipo de precio a actualizar
* Vista previa de cambios
* Confirmación antes de aplicar

## Configuración

### Backend (.env)

```
DATABASE_URL=sqlite:///./database/lafuga.db
API_TITLE=Sistema de Gestión de Precios - LA FUGA
API_VERSION=1.0.0

```

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:8000

```

## Solución de Problemas

### Error: "metadata-generation-failed" o "clang error" al instalar

Este error ocurre por incompatibilidad con Python 3.14.
**Solución:** Asegúrate de seguir los pasos de instalación usando `python3.11 -m venv venv` y `brew install python@3.11`.

### El frontend no puede conectarse al backend

1. Verifica que el backend esté corriendo en http://localhost:8000
2. Prueba el health check: http://localhost:8000/health
3. Revisa la consola del navegador para errores CORS

### Error al cargar datos desde Excel

1. Verifica que el archivo Excel tenga la hoja 'LISTA_COMPLETA'
2. Asegúrate de que las columnas tengan los nombres correctos:
* CÓDIGO, PRODUCTO, CATEGORIA, PRECIO_MENOR, PRECIO_MAYOR, UNIDAD, CODIGO_BARRA, ULTIMA_ACTUALIZACION



### La base de datos no se crea

1. Verifica que exista el directorio `database/`
2. Asegúrate de tener permisos de escritura

## Tecnologías

### Backend

* FastAPI
* SQLAlchemy
* Pydantic
* SQLite (desarrollo) / PostgreSQL (producción)
* Pandas (importación Excel)

### Frontend

* Next.js 16
* React 19
* TypeScript
* Tailwind CSS
* shadcn/ui
* Sonner (notificaciones)

## Datos del Sistema

* **Total de productos:** 2,099
* **Categorías:** 7
* **Productos sin precio:** ~243

---

**LA FUGA - Ventas por Mayor y Menor**

```

```