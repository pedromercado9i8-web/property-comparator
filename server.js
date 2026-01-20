const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configuración de PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Inicializar base de datos (crear tabla si no existe)
async function initDatabase() {
    try {
        await pool.query(`
            CREATE EXTENSION IF NOT EXISTS postgis;
            
            CREATE TABLE IF NOT EXISTS properties (
                id VARCHAR(100) PRIMARY KEY,
                operacion VARCHAR(50) NOT NULL,
                tipo VARCHAR(50) NOT NULL,
                ambientes INTEGER NOT NULL,
                lat DOUBLE PRECISION NOT NULL,
                lng DOUBLE PRECISION NOT NULL,
                m2_totales INTEGER,
                m2_cubiertos INTEGER,
                antiguedad INTEGER,
                precio DECIMAL(12, 2),
                location GEOGRAPHY(POINT, 4326),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_properties_location ON properties USING GIST(location);
            CREATE INDEX IF NOT EXISTS idx_properties_operacion ON properties(operacion);
            CREATE INDEX IF NOT EXISTS idx_properties_tipo ON properties(tipo);
        `);
        console.log('✅ Base de datos inicializada correctamente');
    } catch (error) {
        console.error('❌ Error al inicializar base de datos:', error);
    }
}

// ==================== ENDPOINTS PARA N8N ====================

// Endpoint 1: Cargar propiedades desde n8n
app.post('/api/properties', async (req, res) => {
    try {
        const { properties, replace } = req.body;
        
        if (!properties || !Array.isArray(properties)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Se requiere un array de propiedades' 
            });
        }

        // Validar estructura de propiedades
        const invalidProps = properties.filter(prop => 
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

        // Si replace=true, borrar todas las propiedades primero
        if (replace) {
            await pool.query('DELETE FROM properties');
        }

        // Insertar o actualizar propiedades
        let insertedCount = 0;
        let updatedCount = 0;

        for (const prop of properties) {
            const result = await pool.query(`
                INSERT INTO properties (id, operacion, tipo, ambientes, lat, lng, m2_totales, m2_cubiertos, antiguedad, precio, location)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ST_SetSRID(ST_MakePoint($6, $5), 4326))
                ON CONFLICT (id) 
                DO UPDATE SET 
                    operacion = $2,
                    tipo = $3,
                    ambientes = $4,
                    lat = $5,
                    lng = $6,
                    m2_totales = $7,
                    m2_cubiertos = $8,
                    antiguedad = $9,
                    precio = $10,
                    location = ST_SetSRID(ST_MakePoint($6, $5), 4326),
                    updated_at = CURRENT_TIMESTAMP
                RETURNING (xmax = 0) AS inserted
            `, [
                prop.id,
                prop.operacion,
                prop.tipo,
                prop.ambientes,
                prop.lat,
                prop.lng,
                prop.m2_totales || null,
                prop.m2_cubiertos || null,
                prop.antiguedad || null,
                prop.precio || null
            ]);

            if (result.rows[0].inserted) {
                insertedCount++;
            } else {
                updatedCount++;
            }
        }

        // Obtener total de propiedades
        const totalResult = await pool.query('SELECT COUNT(*) FROM properties');
        const total = parseInt(totalResult.rows[0].count);

        res.json({ 
            success: true, 
            message: `${insertedCount} insertadas, ${updatedCount} actualizadas`,
            total: total 
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
app.post('/api/filter', async (req, res) => {
    try {
        const { operacion, tipo, ambientes, lat, lng, radio, m2_min, m2_max, antiguedad_max } = req.body;

        // Validar datos requeridos
        if (!lat || !lng || !radio) {
            return res.status(400).json({
                success: false,
                error: 'Se requieren lat, lng y radio'
            });
        }

        // Construir query dinámico
        let queryText = `
            SELECT 
                id,
                operacion,
                tipo,
                ambientes,
                lat,
                lng,
                m2_totales,
                m2_cubiertos,
                antiguedad,
                precio,
                ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)) as distance
            FROM properties
            WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
        `;

        const queryParams = [lng, lat, radio];
        let paramIndex = 4;

        // Filtros opcionales
        if (operacion) {
            queryText += ` AND operacion = $${paramIndex}`;
            queryParams.push(operacion);
            paramIndex++;
        }

        if (tipo) {
            queryText += ` AND tipo = $${paramIndex}`;
            queryParams.push(tipo);
            paramIndex++;
        }

        if (ambientes) {
            queryText += ` AND ambientes = $${paramIndex}`;
            queryParams.push(parseInt(ambientes));
            paramIndex++;
        }

        if (m2_min) {
            queryText += ` AND m2_totales >= $${paramIndex}`;
            queryParams.push(parseInt(m2_min));
            paramIndex++;
        }

        if (m2_max) {
            queryText += ` AND m2_totales <= $${paramIndex}`;
            queryParams.push(parseInt(m2_max));
            paramIndex++;
        }

        if (antiguedad_max) {
            queryText += ` AND (antiguedad IS NULL OR antiguedad <= $${paramIndex})`;
            queryParams.push(parseInt(antiguedad_max));
            paramIndex++;
        }

        queryText += ` ORDER BY distance ASC`;

        const result = await pool.query(queryText, queryParams);

        // Formatear resultados
        const properties = result.rows.map(row => ({
            id: row.id,
            distance: Math.round(row.distance),
            operacion: row.operacion,
            tipo: row.tipo,
            ambientes: row.ambientes,
            m2_totales: row.m2_totales,
            m2_cubiertos: row.m2_cubiertos,
            antiguedad: row.antiguedad,
            precio: row.precio ? parseFloat(row.precio) : null,
            lat: row.lat,
            lng: row.lng
        }));

        res.json({
            success: true,
            count: properties.length,
            ids: properties.map(p => p.id),
            properties: properties,
            filters: { operacion, tipo, ambientes, lat, lng, radio, m2_min, m2_max, antiguedad_max }
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
app.get('/api/properties', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM properties ORDER BY created_at DESC');
        
        res.json({
            success: true,
            count: result.rows.length,
            properties: result.rows
        });
    } catch (error) {
        console.error('Error al obtener propiedades:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint 4: Obtener una propiedad por ID
app.get('/api/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM properties WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Propiedad no encontrada'
            });
        }

        res.json({
            success: true,
            property: result.rows[0]
        });
    } catch (error) {
        console.error('Error al obtener propiedad:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint 5: Eliminar propiedad
app.delete('/api/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM properties WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Propiedad no encontrada'
            });
        }

        const totalResult = await pool.query('SELECT COUNT(*) FROM properties');
        const total = parseInt(totalResult.rows[0].count);

        res.json({
            success: true,
            message: `Propiedad ${id} eliminada`,
            total: total
        });
    } catch (error) {
        console.error('Error al eliminar propiedad:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint 6: Estadísticas
app.get('/api/stats', async (req, res) => {
    try {
        const totalResult = await pool.query('SELECT COUNT(*) FROM properties');
        const byOperacion = await pool.query(`
            SELECT operacion, COUNT(*) as count 
            FROM properties 
            GROUP BY operacion
        `);
        const byTipo = await pool.query(`
            SELECT tipo, COUNT(*) as count 
            FROM properties 
            GROUP BY tipo
        `);

        res.json({
            success: true,
            total: parseInt(totalResult.rows[0].count),
            by_operacion: byOperacion.rows.reduce((acc, row) => {
                acc[row.operacion] = parseInt(row.count);
                return acc;
            }, {}),
            by_tipo: byTipo.rows.reduce((acc, row) => {
                acc[row.tipo] = parseInt(row.count);
                return acc;
            }, {})
        });
    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Endpoint 7: Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        const totalResult = await pool.query('SELECT COUNT(*) FROM properties');
        
        res.json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString(),
            properties_count: parseInt(totalResult.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            database: 'disconnected',
            error: error.message
        });
    }
});

// Servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, async () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📍 Frontend: http://localhost:${PORT}`);
    console.log(`🔌 API: http://localhost:${PORT}/api/`);
    await initDatabase();
});

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido, cerrando conexiones...');
    await pool.end();
    process.exit(0);
});
