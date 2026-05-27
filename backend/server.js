const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// ==================== FUNCIONES DE CONVERSIÓN ====================

function convertirAMetros(valor, unidad) {
    const v = parseFloat(valor);
    if (isNaN(v)) return 0;
    
    switch (unidad) {
        case 'm': return v;
        case 'cm': return v / 100;
        case 'in': return v * 0.0254;
        case 'mm': return v / 1000;
        default: return v;
    }
}

// ==================== RUTAS ====================

app.get('/', (req, res) => {
    res.json({
        mensaje: '🚀 Backend BrickCalc funcionando correctamente',
        version: '2.0',
        endpoints: {
            calcular: 'POST /calcular',
            saludar: 'GET /'
        }
    });
});

app.post('/calcular', (req, res) => {
    try {
        const {
            largoPared,
            altoPared,
            unidadPared,
            vanos,
            largoLadrillo,
            altoLadrillo,
            junta,
            unidadLadrillo,
            unidadJunta
        } = req.body;

        // Validaciones básicas
        if (!largoPared || !altoPared || !largoLadrillo || !altoLadrillo) {
            return res.status(400).json({
                error: 'Faltan datos obligatorios',
                mensaje: 'Debes proporcionar largo, alto de pared y dimensiones del ladrillo'
            });
        }

        // 1. Convertir medidas de la pared a metros
        const largoParedM = convertirAMetros(largoPared, unidadPared);
        const altoParedM = convertirAMetros(altoPared, unidadPared);
        
        if (largoParedM <= 0 || altoParedM <= 0) {
            return res.status(400).json({
                error: 'Medidas inválidas',
                mensaje: 'Las medidas de la pared deben ser mayores a cero'
            });
        }

        // 2. Área total de la pared
        const areaPared = largoParedM * altoParedM;

        // 3. Área de vanos (puertas/ventanas)
        let areaVanos = 0;
        if (vanos && vanos.length > 0) {
            for (const vano of vanos) {
                const anchoVanoM = convertirAMetros(vano.ancho, vano.unidad || unidadPared);
                const altoVanoM = convertirAMetros(vano.alto, vano.unidad || unidadPared);
                if (anchoVanoM > 0 && altoVanoM > 0) {
                    areaVanos += anchoVanoM * altoVanoM;
                }
            }
        }

        // 4. Área neta a cubrir
        const areaNeta = Math.max(0, areaPared - areaVanos);

        // 5. Convertir dimensiones del ladrillo a metros
        const L = convertirAMetros(largoLadrillo, unidadLadrillo);
        const H = convertirAMetros(altoLadrillo, unidadLadrillo);
        const J = convertirAMetros(junta || 0, unidadJunta || 'cm');

        if (L <= 0 || H <= 0) {
            return res.status(400).json({
                error: 'Medidas de ladrillo inválidas',
                mensaje: 'Las dimensiones del ladrillo deben ser mayores a cero'
            });
        }

        // 6. Área de cada ladrillo incluyendo junta
        const areaLadrilloConJunta = (L + J) * (H + J);
        
        if (areaLadrilloConJunta <= 0) {
            return res.status(400).json({
                error: 'Cálculo inválido',
                mensaje: 'El área del ladrillo con junta es demasiado pequeña'
            });
        }

        // 7. Cantidad de ladrillos por metro cuadrado
        const ladrillosPorM2 = 1 / areaLadrilloConJunta;

        // 8. Total de ladrillos (redondeado hacia arriba)
        const totalLadrillos = Math.ceil(areaNeta * ladrillosPorM2);

        // 9. Márgenes de desperdicio
        const totalConMargen5 = Math.ceil(totalLadrillos * 1.05);
        const totalConMargen10 = Math.ceil(totalLadrillos * 1.10);
        const totalConMargen15 = Math.ceil(totalLadrillos * 1.15);

        // 10. Volumen estimado de mortero (aprox 0.02m³ por m²)
        const volumenMortero = areaNeta * 0.02;

        // 11. Respuesta completa
        res.json({
            success: true,
            datos: {
                // Áreas
                areaPared: parseFloat(areaPared.toFixed(2)),
                areaVanos: parseFloat(areaVanos.toFixed(2)),
                areaNeta: parseFloat(areaNeta.toFixed(2)),
                
                // Ladrillos
                ladrillosPorM2: parseFloat(ladrillosPorM2.toFixed(2)),
                totalLadrillos: totalLadrillos,
                
                // Márgenes
                totalConMargen5: totalConMargen5,
                totalConMargen10: totalConMargen10,
                totalConMargen15: totalConMargen15,
                margenRecomendado: totalLadrillos < 100 ? 10 : 5,
                
                // Materiales adicionales
                volumenMortero: parseFloat(volumenMortero.toFixed(3)),
                
                // Medidas utilizadas
                medidas: {
                    pared: { largo: largoParedM.toFixed(2), alto: altoParedM.toFixed(2) },
                    ladrillo: { largo: L.toFixed(4), alto: H.toFixed(4), junta: J.toFixed(4) }
                }
            }
        });

    } catch (error) {
        console.error('Error en cálculo:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            mensaje: error.message
        });
    }
});

// Ruta para verificar estado del servidor
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor BrickCalc ejecutándose en puerto ${PORT}`);
    console.log(`📐 Endpoint de cálculo: http://localhost:${PORT}/calcular`);
});