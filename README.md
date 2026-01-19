# 🏠 Sistema de Comparación de Propiedades

Sistema para filtrar propiedades comparables para tasación inmobiliaria, integrado con n8n.

## 📁 Estructura del Proyecto

```
property-comparator/
├── server.js           # Backend con Express
├── package.json        # Dependencias
├── render.yaml         # Configuración de Render
└── public/
    └── index.html      # Frontend con mapa
```

## 🚀 Deploy en Render.com (GRATIS)

### Paso 1: Crear cuenta en Render
1. Ve a [render.com](https://render.com)
2. Regístrate con GitHub (recomendado) o email
3. Verifica tu email

### Paso 2: Preparar el código

#### Opción A: Usando GitHub (RECOMENDADO)
1. Crea un nuevo repositorio en GitHub
2. Sube estos archivos:
   ```
   property-comparator/
   ├── server.js
   ├── package.json
   ├── render.yaml
   └── public/
       └── index.html
   ```
3. Haz commit y push

#### Opción B: Sin GitHub
Puedes deployar directamente desde tu computadora (te explico después)

### Paso 3: Crear el servicio en Render

**Si usaste GitHub:**
1. En Render Dashboard, click "New +" → "Web Service"
2. Conecta tu repositorio de GitHub
3. Render detectará automáticamente la configuración de `render.yaml`
4. Click "Create Web Service"

**Si NO usaste GitHub:**
1. En Render Dashboard, click "New +" → "Web Service"
2. Selecciona "Public Git repository"
3. Completa:
   - **Name:** `property-comparator` (o el que quieras)
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** `Free`
4. Click "Create Web Service"

### Paso 4: Esperar el deploy
- El primer deploy tarda 2-3 minutos
- Verás los logs en tiempo real
- Cuando termine, te dará una URL tipo: `https://property-comparator-xxxx.onrender.com`

### Paso 5: ¡Listo! 🎉
Tu aplicación ya está online. Prueba:
- Frontend: `https://tu-app.onrender.com`
- Health check: `https://tu-app.onrender.com/api/health`

---

## 🔗 Integración con n8n

### Endpoint 1: Cargar Propiedades

**Desde n8n → HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "https://tu-app.onrender.com/api/properties",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "properties": [
      {
        "id": "PROP001",
        "operacion": "venta",
        "tipo": "departamento",
        "ambientes": 2,
        "lat": -38.0055,
        "lng": -57.5426
      }
    ],
    "replace": false
  }
}
```

**Parámetros:**
- `properties`: Array de propiedades (requerido)
- `replace`: `true` = reemplaza toda la BD, `false` = agrega/actualiza (opcional, default: false)

**Respuesta:**
```json
{
  "success": true,
  "message": "5 propiedades procesadas",
  "total": 25
}
```

### Endpoint 2: Filtrar Comparables

**Desde n8n → HTTP Request Node:**

```json
{
  "method": "POST",
  "url": "https://tu-app.onrender.com/api/filter",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "operacion": "venta",
    "tipo": "departamento",
    "ambientes": 2,
    "lat": -38.0055,
    "lng": -57.5426,
    "radio": 1000
  }
}
```

**Parámetros:**
- `lat`, `lng`, `radio`: Requeridos
- `operacion`, `tipo`, `ambientes`: Opcionales (para filtrar)

**Respuesta:**
```json
{
  "success": true,
  "count": 8,
  "ids": ["PROP001", "PROP002", "PROP003"],
  "properties": [
    {
      "id": "PROP001",
      "distance": 150,
      "operacion": "venta",
      "tipo": "departamento",
      "ambientes": 2
    }
  ]
}
```

---

## ⚡ Flujo de Trabajo n8n → App

### Ejemplo de workflow completo en n8n:

```
1. [Webhook] → Recibe formulario del cliente
   ↓
2. [HTTP Request] → POST /api/filter
   {
     operacion: "venta",
     tipo: "departamento", 
     ambientes: 2,
     lat: -38.0055,
     lng: -57.5426,
     radio: 1000
   }
   ↓
3. [Recibe IDs] → ["PROP001", "PROP002", "PROP003"]
   ↓
4. [Continúa tu flujo] → Generar reporte, enviar email, etc.
```

---

## 🛠️ Desarrollo Local (Opcional)

Si quieres probar localmente antes de deployar:

1. **Instalar Node.js** (si no lo tienes): https://nodejs.org

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar servidor:**
   ```bash
   npm start
   ```

4. **Abrir navegador:**
   ```
   http://localhost:3000
   ```

---

## 🔥 Mantener el servicio activo (Evitar "spin down")

Render en plan gratuito "duerme" el servicio después de 15 min sin uso.

### Solución: Ping desde n8n

Crea un workflow en n8n que haga ping cada 10 minutos:

```
[Schedule Trigger] → cada 10 minutos
   ↓
[HTTP Request] → GET https://tu-app.onrender.com/api/health
```

Esto mantiene tu app siempre activa.

---

## 📊 Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/properties` | Cargar/actualizar propiedades |
| POST | `/api/filter` | Filtrar comparables |
| GET | `/api/properties` | Obtener todas las propiedades |
| DELETE | `/api/properties/:id` | Eliminar propiedad |
| GET | `/api/health` | Health check |
| GET | `/` | Frontend (mapa) |

---

## 🐛 Troubleshooting

### Error: "Cannot connect to server"
- Verifica que la URL sea correcta
- Chequea que el servicio esté activo en Render
- Revisa los logs en Render Dashboard

### Error: "Invalid data format"
- Verifica que el JSON tenga todos los campos requeridos
- `id`, `operacion`, `tipo`, `ambientes`, `lat`, `lng` son obligatorios

### La app se "duerme"
- Implementa el ping desde n8n (ver sección anterior)
- O considera upgradearte al plan paid ($7/mes sin spin down)

---

## 💰 Costos

- **Plan Free Render:** 
  - ✅ GRATIS
  - ⚠️ Spin down después de 15 min sin uso
  - 512 MB RAM
  - 750 horas/mes (más que suficiente)

- **Plan Paid Render ($7/mes):**
  - Sin spin down
  - 512 MB RAM
  - Mejor para producción real

---

## 📞 Soporte

Si tenés problemas:
1. Revisá los logs en Render Dashboard
2. Probá los endpoints con Postman/Insomnia
3. Verificá que n8n esté enviando el formato correcto

---

## 🎯 Próximos Pasos

Una vez deployado:
1. ✅ Copia tu URL de Render
2. ✅ Configura los HTTP Request nodes en n8n
3. ✅ Prueba cargar propiedades
4. ✅ Prueba filtrar comparables
5. ✅ Configura el ping para evitar spin down
6. 🚀 ¡A producción!
