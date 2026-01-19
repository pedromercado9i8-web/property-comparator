const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base de datos en memoria (puedes cambiar a SQLite/PostgreSQL después)
let properties = [];

// ==================== ENDPOINTS PARA N8N ====================

// Endpoint 1: Recibir propiedades desde n8n
app.post('/api/properties', (req, res) => {
    try {
        const { properties: newProperties, replace } = req.body;
        
        if (!newProperties || !Array.isArray(newProperties)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere un array de propiedades' 
            });
        }

        // Validar estructura de propiedades
        const invalidProps = newProperties.filter(prop => 
            !prop.id || !prop.operacion || !prop.tipo || 
            !prop.ambientes || !prop.lat || !prop.lng
        );

        if (invalidProps.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Propiedades con datos faltantes',
                invalid: invalidProps
            });
        }

        if (replace) {
            // Reemplazar toda la base de datos
            properties = newProperties;
        } else {
            // Agregar o actualizar propiedades
            newProperties.forEach(newProp => {
                const index = properties.findIndex(p => p.id === newProp.id);
                if (index !== -1) {
                    properties[index] = newProp; // Actualizar
                } else {
                    properties.push(newProp); // Agregar
                }
            });
        }

        res.json({ 
            success: true, 
            message: `${newProperties.length} propiedades procesadas`,
            total: properties.length 
        });
    } catch (error) {
        console.error('Error al procesar propiedades:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint 2: Filtrar propiedades comparables
app.post('/api/filter', (req, res) => {
    try {
        const { operacion, tipo, ambientes, lat, lng, radio } = req.body;

        // Validar datos requeridos
        if (!lat || !lng || !radio) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren lat, lng y radio'
            });
        }

        // Filtrar propiedades
        const filtered = properties.filter(prop => {
            // Filtro por distancia
            const distance = calculateDistance(lat, lng, prop.lat, prop.lng);
            if (distance > radio) return false;

            // Filtros opcionales por datos duros
            if (operacion && prop.operacion !== operacion) return false;
            if (tipo && prop.tipo !== tipo) return false;
            if (ambientes && prop.ambientes !== parseInt(ambientes)) return false;

            return true;
        });

        // Calcular distancias para cada propiedad filtrada
        const results = filtered.map(prop => ({
            id: prop.id,
            distance: Math.round(calculateDistance(lat, lng, prop.lat, prop.lng)),
            operacion: prop.operacion,
            tipo: prop.tipo,
            ambientes: prop.ambientes
        }));

        // Ordenar por distancia
        results.sort((a, b) => a.distance - b.distance);

        res.json({
            success: true,
            count: results.length,
            ids: results.map(r => r.id),
            properties: results,
            filters: { operacion, tipo, ambientes, lat, lng, radio }
        });
    } catch (error) {
        console.error('Error al filtrar propiedades:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint 3: Obtener todas las propiedades (para el frontend)
app.get('/api/properties', (req, res) => {
    res.json({
        success: true,
        count: properties.length,
        properties: properties
    });
});

// Endpoint 4: Eliminar propiedad
app.delete('/api/properties/:id', (req, res) => {
    const { id } = req.params;
    const index = properties.findIndex(p => p.id === id);
    
    if (index === -1) {
        return res.status(404).json({
            success: false,
            error: 'Propiedad no encontrada'
        });
    }

    properties.splice(index, 1);
    res.json({
        success: true,
        message: `Propiedad ${id} eliminada`,
        total: properties.length
    });
});

// Endpoint 5: Health check (para mantener el servicio activo)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        properties_count: properties.length
    });
});

// ==================== FUNCIONES AUXILIARES ====================

// Calcular distancia entre dos puntos (fórmula Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en metros
}

// Servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📍 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api/`);
});
