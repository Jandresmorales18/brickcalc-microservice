const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Convertir unidades a metros
function convertirAMetros(valor, unidad) {

    switch(unidad) {

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

// Ruta principal
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

        // Área pared
        const areaPared =
            convertirAMetros(largoPared, unidadPared) *
            convertirAMetros(altoPared, unidadPared);

        // Área vanos
        let areaVanos = 0;

        if(vanos && vanos.length > 0) {

            vanos.forEach(vano => {

                areaVanos +=
                    convertirAMetros(vano.ancho, unidadPared) *
                    convertirAMetros(vano.alto, unidadPared);
            });
        }

        // Área neta
        const areaNeta = areaPared - areaVanos;

        // Conversión ladrillo
        const L = convertirAMetros(largoLadrillo, unidadLadrillo);
        const H = convertirAMetros(altoLadrillo, unidadLadrillo);
        const J = convertirAMetros(junta, unidadLadrillo);

        // Ladrillos por m²
        const ladrillosPorM2 = 1 / ((L + J) * (H + J));

        // Totales
        const totalLadrillos = areaNeta * ladrillosPorM2;
        const totalConMargen = totalLadrillos * 1.05;

        // Respuesta
        res.json({

            areaPared: areaPared.toFixed(2),
            areaVanos: areaVanos.toFixed(2),
            areaNeta: areaNeta.toFixed(2),
            ladrillosPorM2: ladrillosPorM2.toFixed(2),
            totalLadrillos: Math.ceil(totalLadrillos),
            totalConMargen: Math.ceil(totalConMargen)
        });

    } catch(error) {

        res.status(500).json({
            mensaje: 'Error en cálculo',
            error: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, () => {

    console.log(`Servidor ejecutándose en puerto ${PORT}`);
});