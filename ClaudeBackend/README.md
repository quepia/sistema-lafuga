# 🏪 Sistema de Gestión de Precios - LA FUGA

Sistema completo de consulta y actualización de precios para negocio minorista y mayorista con **2,099 productos** en 7 categorías.

---

## 🎯 Características Principales

✅ **Consulta Rápida**: Búsqueda instantánea por nombre, código o código de barras  
✅ **Precios Duales**: Visualización simultánea de precio minorista y mayorista  
✅ **Filtros Avanzados**: Por categoría, rango de precios, y más  
✅ **Actualización Masiva**: Ajustar precios por categoría o selección  
✅ **API REST Completa**: Endpoints documentados automáticamente  
✅ **Base de Datos SQLite**: Fácil de usar, sin configuración compleja  
✅ **Multi-dispositivo**: Accesible desde PC, tablet o celular  

---

## 📦 Contenido del Proyecto

```
sistema-precios-lafuga/
├── app/
│   ├── __init__.py
│   ├── models.py          # Modelos de base de datos (SQLAlchemy)
│   ├── schemas.py         # Esquemas de validación (Pydantic)
│   ├── database.py        # Configuración de BD
│   └── crud.py           # Operaciones CRUD y lógica de negocio
├── database/
│   └── lafuga.db         # Base de datos SQLite (se crea automáticamente)
├── main.py              # Aplicación FastAPI principal
├── cargar_datos.py      # Script para carga inicial de datos
├── requirements.txt     # Dependencias Python
├── .env                # Variables de entorno
├── .gitignore          # Archivos a ignorar en git
└── README.md           # Este archivo
```

---

## 🚀 Instalación y Configuración

### Requisitos Previos

- Python 3.8 o superior
- pip (gestor de paquetes)

### Paso 1: Preparar el Entorno

```bash
# Navegar al directorio del proyecto
cd sistema-precios-lafuga

# Crear entorno virtual (RECOMENDADO)
python -m venv venv

# Activar entorno virtual
# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate
```

### Paso 2: Instalar Dependencias

```bash
pip install -r requirements.txt
```

Esto instalará:
- FastAPI (framework web)
- Uvicorn (servidor ASGI)
- SQLAlchemy (ORM para base de datos)
- Pydantic (validación de datos)
- Pandas (procesamiento de datos)
- OpenPyXL (lectura de Excel)

### Paso 3: Cargar Datos Iniciales

```bash
# Asegúrate de tener el archivo Excel en la misma carpeta
python cargar_datos.py LISTA_PRECIOS_CONSOLIDADA_LA_FUGA.xlsx
```

Esto creará la base de datos y cargará los 2,099 productos.

### Paso 4: Iniciar el Servidor

```bash
# Opción 1: Modo producción
python main.py

# Opción 2: Modo desarrollo (recarga automática)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

¡Listo! El servidor estará corriendo en: **http://localhost:8000**

---

## 📚 Documentación de la API

Una vez iniciado el servidor, accede a:

- **Swagger UI (interactiva)**: http://localhost:8000/docs
- **ReDoc (alternativa)**: http://localhost:8000/redoc

Estas interfaces permiten:
- Ver todos los endpoints disponibles
- Probar llamadas a la API directamente
- Ver ejemplos de request/response
- Descargar especificación OpenAPI

---

## 🔌 Endpoints Principales

### 1. Consulta de Productos

#### Listar todos los productos (con filtros)
```http
GET /productos?query=aceite&categoria=ALMACEN&limit=20
```

**Parámetros:**
- `query`: Búsqueda en nombre, código o código de barras
- `categoria`: Filtrar por categoría específica
- `precio_min`: Precio mínimo
- `precio_max`: Precio máximo
- `limit`: Cantidad de resultados (default: 100)
- `offset`: Para paginación

**Respuesta:**
```json
{
  "total": 167,
  "limit": 20,
  "offset": 0,
  "count": 20,
  "productos": [
    {
      "id": 1,
      "codigo": "ALM-0001",
      "producto": "Aceite Cocinero 900ml",
      "categoria": "ALMACEN",
      "precio_menor": 1500.00,
      "precio_mayor": 1350.00,
      "unidad": "unidad",
      "codigo_barra": "7790123456789",
      "ultima_actualizacion": "2026-01-14",
      "diferencia_porcentual": 11.11
    }
  ]
}
```

#### Buscar por código SKU
```http
GET /productos/codigo/ALM-0001
```

#### Buscar por código de barras
```http
GET /productos/barcode/7790123456789
```

### 2. Categorías

```http
GET /categorias
```

**Respuesta:**
```json
["ALMACEN", "BAZAR", "DUX", "LIBRERIA", "MASCOTAS", "QUIMICA", "SUELTOS - QUIMICA"]
```

```http
GET /categorias/ALMACEN/productos
```

### 3. Estadísticas

```http
GET /estadisticas
```

**Respuesta:**
```json
{
  "total_productos": 2099,
  "productos_por_categoria": {
    "DUX": 1367,
    "BAZAR": 170,
    "ALMACEN": 167
  },
  "productos_sin_precio": 243,
  "productos_sin_codigo_barra": 456,
  "promedio_precio_menor": 850.50,
  "promedio_precio_mayor": 750.25
}
```

### 4. Actualización de Productos

#### Crear producto
```http
POST /productos
Content-Type: application/json

{
  "codigo": "TEST-0001",
  "producto": "Producto de prueba",
  "categoria": "ALMACEN",
  "precio_menor": 100.00,
  "precio_mayor": 80.00,
  "unidad": "unidad"
}
```

#### Actualizar producto
```http
PUT /productos/123
Content-Type: application/json

{
  "precio_menor": 110.00,
  "precio_mayor": 90.00
}
```

#### Eliminar producto
```http
DELETE /productos/123
```

### 5. Actualización Masiva de Precios

```http
POST /productos/actualizar-masiva
Content-Type: application/json

{
  "categoria": "ALMACEN",
  "porcentaje": 10,
  "aplicar_a": "ambos"
}
```

**Ejemplos:**
- Aumentar 10% precio menor en ALMACEN:
  ```json
  {"categoria": "ALMACEN", "porcentaje": 10, "aplicar_a": "menor"}
  ```

- Disminuir 5% precio mayor en productos específicos:
  ```json
  {"codigos": ["ALM-0001", "ALM-0002"], "porcentaje": -5, "aplicar_a": "mayor"}
  ```

- Aumentar 15% ambos precios en BAZAR:
  ```json
  {"categoria": "BAZAR", "porcentaje": 15, "aplicar_a": "ambos"}
  ```

### 6. Importación desde Excel

```http
POST /importar/excel
Content-Type: multipart/form-data
```

---

## 💻 Uso con Cursor + Claude Code

### 1. Abrir el proyecto en Cursor

```bash
cursor .
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Comandos útiles

```bash
# Iniciar en modo desarrollo
uvicorn main:app --reload

# Ver logs en tiempo real
uvicorn main:app --reload --log-level debug

# Cambiar puerto
uvicorn main:app --port 8001

# Hacer accesible en red local
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 4. Testing con curl

```bash
# Obtener todos los productos
curl http://localhost:8000/productos

# Buscar por nombre
curl "http://localhost:8000/productos?query=aceite"

# Obtener categorías
curl http://localhost:8000/categorias

# Crear producto (PowerShell)
$body = @{
    codigo = "TEST-001"
    producto = "Producto Test"
    categoria = "ALMACEN"
    precio_menor = 100
    precio_mayor = 80
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8000/productos" -Method Post -Body $body -ContentType "application/json"
```

---

## 🌐 Desplegar en Internet

### Opción 1: Railway.app (RECOMENDADO ✅)

1. Crear cuenta en https://railway.app
2. Instalar Railway CLI o conectar con GitHub
3. En el proyecto, ejecutar:
   ```bash
   railway login
   railway init
   railway up
   ```
4. Railway detectará FastAPI automáticamente
5. Tu API estará en: `https://tu-proyecto.up.railway.app`

**Ventajas:**
- Gratuito hasta 500 horas/mes
- Deploy en segundos
- HTTPS automático
- Base de datos incluida

### Opción 2: Render.com

1. Crear cuenta en https://render.com
2. Nuevo → Web Service
3. Conectar con GitHub
4. Configurar:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Deploy automático en cada commit

### Opción 3: Vercel (Solo API)

```bash
pip install vercel
vercel --prod
```

### Migrar a PostgreSQL (para producción)

1. Crear base de datos PostgreSQL (Railway, Supabase, etc.)
2. Actualizar `.env`:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   ```
3. Reinstalar dependencias:
   ```bash
   pip install psycopg2-binary
   ```

---

## 🔧 Integración con Frontend (v0)

### Ejemplo de llamada desde JavaScript

```javascript
// Buscar productos
async function buscarProductos(query) {
  const response = await fetch(
    `http://localhost:8000/productos?query=${encodeURIComponent(query)}`
  );
  const data = await response.json();
  return data.productos;
}

// Obtener categorías
async function obtenerCategorias() {
  const response = await fetch('http://localhost:8000/categorias');
  return await response.json();
}

// Actualizar precio
async function actualizarPrecio(id, nuevoPrecio) {
  const response = await fetch(`http://localhost:8000/productos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      precio_menor: nuevoPrecio
    })
  });
  return await response.json();
}
```

### Ejemplo con React

```jsx
import { useState, useEffect } from 'react';

function BuscadorProductos() {
  const [query, setQuery] = useState('');
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    if (query.length > 2) {
      fetch(`http://localhost:8000/productos?query=${query}`)
        .then(res => res.json())
        .then(data => setProductos(data.productos));
    }
  }, [query]);

  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar productos..."
      />
      <div>
        {productos.map(p => (
          <div key={p.id}>
            <h3>{p.producto}</h3>
            <p>Menor: ${p.precio_menor}</p>
            <p>Mayor: ${p.precio_mayor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 📊 Base de Datos

### Esquema de la tabla `productos`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INTEGER | ID autoincremental (PK) |
| codigo | VARCHAR | Código SKU único (ej: ALM-0001) |
| producto | VARCHAR | Nombre del producto |
| categoria | VARCHAR | Categoría (ALMACEN, BAZAR, etc.) |
| precio_menor | FLOAT | Precio venta minorista |
| precio_mayor | FLOAT | Precio venta mayorista |
| unidad | VARCHAR | Unidad de medida |
| codigo_barra | VARCHAR | Código de barras |
| ultima_actualizacion | DATE | Fecha de última modificación |

### Consultas SQL útiles

```sql
-- Ver productos más caros
SELECT * FROM productos ORDER BY precio_menor DESC LIMIT 10;

-- Productos sin precio
SELECT * FROM productos WHERE precio_menor = 0 OR precio_mayor = 0;

-- Contar por categoría
SELECT categoria, COUNT(*) FROM productos GROUP BY categoria;

-- Buscar producto
SELECT * FROM productos WHERE producto LIKE '%aceite%';
```

---

## 🐛 Solución de Problemas

### Error: "No module named 'fastapi'"
```bash
pip install -r requirements.txt
```

### Error: "Database is locked"
Cierra otras conexiones a la base de datos o reinicia el servidor.

### Puerto 8000 ya en uso
```bash
# Usar otro puerto
uvicorn main:app --port 8001

# O matar el proceso (Linux/Mac)
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Error de CORS en el navegador
El backend ya tiene CORS configurado. Si persiste, verifica que estés haciendo peticiones al puerto correcto.

### Productos no aparecen después de importar
Verifica que el archivo Excel tenga las columnas correctas y ejecuta:
```bash
python cargar_datos.py
```

---

## 📝 Próximos Pasos

- [ ] Conectar con tu frontend de v0
- [ ] Agregar autenticación (JWT)
- [ ] Implementar logs de auditoría
- [ ] Sistema de roles (admin, vendedor)
- [ ] Gestión de inventario/stock
- [ ] Historial de cambios de precios
- [ ] Reportes en PDF
- [ ] Dashboard con gráficos
- [ ] Notificaciones de stock bajo
- [ ] Integración con punto de venta (POS)

---

## 🔐 Seguridad

Para producción, considera:

1. **Autenticación**: Implementar JWT o OAuth2
2. **HTTPS**: Usar certificados SSL
3. **Rate Limiting**: Limitar peticiones por IP
4. **Validación**: Ya implementada con Pydantic
5. **SQL Injection**: Protegido por SQLAlchemy ORM
6. **CORS**: Configurar dominios específicos (no usar `*`)

---

## 📞 Soporte

Para problemas, sugerencias o mejoras:
- Revisa la documentación en `/docs`
- Consulta los logs del servidor
- Usa Claude Code en Cursor para ayuda con el código

---

## 📄 Licencia

Proyecto privado - LA FUGA © 2026

---

**✨ ¡Tu backend está listo para producción!**

Ahora solo necesitas:
1. Instalar dependencias
2. Cargar los datos
3. Iniciar el servidor
4. Conectar tu frontend

¡Éxito con el proyecto! 🚀
