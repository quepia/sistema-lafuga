# ⚡ INICIO RÁPIDO - 3 PASOS

## 🎯 Para empezar en menos de 5 minutos:

### 1️⃣ Instalar dependencias
```bash
pip install -r requirements.txt
```

### 2️⃣ Cargar datos (solo la primera vez)
```bash
python cargar_datos.py LISTA_PRECIOS_CONSOLIDADA_LA_FUGA.xlsx
```

### 3️⃣ Iniciar servidor
```bash
python main.py
```

**¡Listo!** Abre tu navegador en: http://localhost:8000/docs

---

## 📱 Para usar en Cursor + Claude Code:

1. Abre el proyecto: `cursor .`
2. Terminal integrada → Ejecutar los 3 pasos de arriba
3. Para desarrollo con recarga: `uvicorn main:app --reload`

---

## 🔗 Conectar con tu frontend de v0:

```javascript
const API_URL = 'http://localhost:8000';

fetch(`${API_URL}/productos?query=aceite`)
  .then(res => res.json())
  .then(data => console.log(data.productos));
```

---

🚀 **¡Éxito con tu proyecto!**
