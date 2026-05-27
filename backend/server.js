const express = require('express');
const cors = require('cors');

const app = express();

// Puerto dinámico para Render
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// ==================== FUNCIONES ====================

// Convertir unidades a metros
function convertirAMetros(valor, unidad) {

    switch (unidad) {

        case 'm':
            return valor;

        case 'cm':
            return valor / 100;

        case 'in':
            return valor * 0.0254;

        default:
            return valor;
    }
}

// ==================== RUTA PRINCIPAL ====================

// Ruta de prueba
app.get('/', (req, res) => {

    res.send('🚀 Backend BrickCalc funcionando correctamente');
});

// Ruta cálculo
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
            unidadLadrillo
        } = req.body;

        // ==================== ÁREA PARED ====================

        const areaPared =
            convertirAMetros(largoPared, unidadPared) *
            convertirAMetros(altoPared, unidadPared);

        // ==================== ÁREA VANOS ====================

        let areaVanos = 0;

        if (vanos && vanos.length > 0) {

            vanos.forEach(vano => {

                areaVanos +=
                    convertirAMetros(vano.ancho, unidadPared) *
                    convertirAMetros(vano.alto, unidadPared);
            });
        }

        // ==================== ÁREA NETA ====================

        const areaNeta = areaPared - areaVanos;

        // ==================== CONVERSIÓN LADRILLO ====================

        const L = convertirAMetros(largoLadrillo, unidadLadrillo);
        const H = convertirAMetros(altoLadrillo, unidadLadrillo);
        const J = convertirAMetros(junta, unidadLadrillo);

        // ==================== CÁLCULO ====================

        const ladrillosPorM2 = 1 / ((L + J) * (H + J));

        const totalLadrillos = areaNeta * ladrillosPorM2;

        const totalConMargen = totalLadrillos * 1.05;

        // ==================== RESPUESTA ====================

        res.json({

            areaPared: areaPared.toFixed(2),

            areaVanos: areaVanos.toFixed(2),

            areaNeta: areaNeta.toFixed(2),

            ladrillosPorM2: ladrillosPorM2.toFixed(2),

            totalLadrillos: Math.ceil(totalLadrillos),

            totalConMargen: Math.ceil(totalConMargen)
        });

    } catch (error) {

        res.status(500).json({

            mensaje: 'Error en cálculo',

            error: error.message
        });
    }
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {

    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
});