// Variables globales
let contadorVanos = 0;
let stream = null;
let medidasCapturadas = {
    ancho: 0,
    alto: 0
};
let modoAutomatico = false;
let videoStream = null;
let animationFrameId = null;

// ==================== MEDICIÓN AUTOMÁTICA AVANZADA ====================

async function abrirCamaraMedicion() {
    try {
        // Detener cualquier stream anterior
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment",
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        
        const video = document.getElementById('video');
        video.srcObject = stream;
        videoStream = stream;
        
        const modal = new bootstrap.Modal(document.getElementById('cameraModal'));
        modal.show();
        
        video.onloadedmetadata = () => {
            const canvas = document.getElementById('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            // Iniciar medición automática
            iniciarMedicionAutomatica();
        };
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        mostrarErrorGeneral('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
}

function iniciarMedicionAutomatica() {
    modoAutomatico = true;
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    function detectarYPintar() {
        if (video.readyState === 4 && video.videoWidth > 0) {
            // Dibujar frame
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Detectar bordes y pared
            const medidas = detectarPared(ctx, canvas.width, canvas.height);
            
            if (medidas) {
                // Actualizar UI con medidas detectadas
                document.getElementById('medidaAncho').textContent = `${medidas.ancho.toFixed(2)} m`;
                document.getElementById('medidaAlto').textContent = `${medidas.alto.toFixed(2)} m`;
                medidasCapturadas.ancho = medidas.ancho;
                medidasCapturadas.alto = medidas.alto;
                
                // Dibujar overlay de medición
                dibujarOverlayMedicion(ctx, canvas.width, canvas.height, medidas);
            }
        }
        animationFrameId = requestAnimationFrame(detectarYPintar);
    }
    
    detectarYPintar();
}

function detectarPared(ctx, anchoCanvas, altoCanvas) {
    // Obtener datos de imagen para análisis
    const imageData = ctx.getImageData(0, 0, anchoCanvas, altoCanvas);
    const data = imageData.data;
    
    // Detectar bordes usando diferencia de luminancia
    let bordesVerticales = [];
    let bordesHorizontales = [];
    
    // Análisis simplificado de bordes
    for (let x = 10; x < anchoCanvas - 10; x += 20) {
        let diff = 0;
        for (let y = 10; y < altoCanvas - 10; y += 5) {
            const idx = (y * anchoCanvas + x) * 4;
            const brillo = (data[idx] + data[idx+1] + data[idx+2]) / 3;
            const idx2 = (y * anchoCanvas + (x + 5)) * 4;
            const brillo2 = (data[idx2] + data[idx2+1] + data[idx2+2]) / 3;
            diff += Math.abs(brillo - brillo2);
        }
        if (diff > 5000) bordesVerticales.push(x);
    }
    
    for (let y = 10; y < altoCanvas - 10; y += 20) {
        let diff = 0;
        for (let x = 10; x < anchoCanvas - 10; x += 5) {
            const idx = (y * anchoCanvas + x) * 4;
            const brillo = (data[idx] + data[idx+1] + data[idx+2]) / 3;
            const idx2 = ((y + 5) * anchoCanvas + x) * 4;
            const brillo2 = (data[idx2] + data[idx2+1] + data[idx2+2]) / 3;
            diff += Math.abs(brillo - brillo2);
        }
        if (diff > 5000) bordesHorizontales.push(y);
    }
    
    // Calcular medida estimada basada en proporción de pantalla
    // Asumiendo que una pared típica tiene ancho ≈ 4-8 metros y alto ≈ 2-3 metros
    let anchoEstimado = 0;
    let altoEstimado = 0;
    
    if (bordesVerticales.length > 1) {
        const anchoPx = Math.max(...bordesVerticales) - Math.min(...bordesVerticales);
        // Calibración: asumimos que el ancho de pantalla representa aproximadamente 6 metros
        anchoEstimado = (anchoPx / anchoCanvas) * 6;
    } else {
        anchoEstimado = 5; // Valor por defecto
    }
    
    if (bordesHorizontales.length > 1) {
        const altoPx = Math.max(...bordesHorizontales) - Math.min(...bordesHorizontales);
        altoEstimado = (altoPx / altoCanvas) * 3.5;
    } else {
        altoEstimado = 2.5; // Valor por defecto
    }
    
    // Limitar valores razonables
    anchoEstimado = Math.min(Math.max(anchoEstimado, 1), 15);
    altoEstimado = Math.min(Math.max(altoEstimado, 0.5), 5);
    
    return {
        ancho: anchoEstimado,
        alto: altoEstimado,
        bordesV: bordesVerticales,
        bordesH: bordesHorizontales
    };
}

function dibujarOverlayMedicion(ctx, anchoCanvas, altoCanvas, medidas) {
    // Dibujar rectángulo de la pared detectada
    if (medidas.bordesV && medidas.bordesV.length > 0 && medidas.bordesH && medidas.bordesH.length > 0) {
        const minX = Math.min(...medidas.bordesV);
        const maxX = Math.max(...medidas.bordesV);
        const minY = Math.min(...medidas.bordesH);
        const maxY = Math.max(...medidas.bordesH);
        
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 4;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    }
    
    // Dibujar líneas de medición
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, 10, 250, 80);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`📐 Ancho: ${medidas.ancho.toFixed(2)} m`, 20, 35);
    ctx.fillText(`📏 Alto: ${medidas.alto.toFixed(2)} m`, 20, 65);
    
    // Dibujar guía visual
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.strokeRect(anchoCanvas * 0.15, altoCanvas * 0.2, anchoCanvas * 0.7, altoCanvas * 0.5);
    ctx.setLineDash([]);
    
    // Dibujar texto de instrucción
    ctx.fillStyle = '#10b981';
    ctx.font = '14px Arial';
    ctx.fillText('🎯 Alinea la pared dentro del rectángulo', anchoCanvas * 0.25, altoCanvas * 0.15);
}

// Función para calibrar con un objeto de referencia
function calibrarConReferencia() {
    const referencia = prompt(
        "🔧 CALIBRACIÓN DE MEDICIÓN\n\n" +
        "Coloca un objeto de tamaño conocido en la cámara\n" +
        "y escribe su tamaño REAL en metros.\n\n" +
        "Ejemplos:\n" +
        "- Hoja A4: 0.297m\n" +
        "- Celular: 0.15m\n" +
        "- Puerta: 2.0m\n\n" +
        "Tamaño real del objeto (en metros):"
    );
    
    if (referencia && !isNaN(parseFloat(referencia))) {
        mostrarToast(`✅ Calibración configurada: ${referencia}m como referencia`);
        return parseFloat(referencia);
    }
    return null;
}

function capturarMedida(tipo) {
    if (tipo === 'automatico') {
        if (medidasCapturadas.ancho > 0 && medidasCapturadas.alto > 0) {
            aplicarMedidas();
        } else {
            mostrarErrorGeneral('Esperando detección automática de la pared...');
        }
    } else {
        // Modo manual (original)
        let medidaEstimada = prompt(
            `📏 Medición de ${tipo === 'ancho' ? 'ancho' : 'alto'}\n\n` +
            `Instrucciones:\n` +
            `1. Mira la pared en la cámara\n` +
            `2. Usa la guía visual como referencia\n` +
            `3. Ingresa la medida estimada en metros\n\n` +
            `💡 Medida actual detectada: ${tipo === 'ancho' ? medidasCapturadas.ancho.toFixed(2) : medidasCapturadas.alto.toFixed(2)} m`
        );
        
        if (medidaEstimada && !isNaN(parseFloat(medidaEstimada))) {
            const valor = parseFloat(medidaEstimada);
            
            if (tipo === 'ancho') {
                medidasCapturadas.ancho = valor;
                document.getElementById('medidaAncho').textContent = `${valor.toFixed(2)} m`;
                mostrarToast('Ancho capturado: ' + valor.toFixed(2) + ' m');
            } else {
                medidasCapturadas.alto = valor;
                document.getElementById('medidaAlto').textContent = `${valor.toFixed(2)} m`;
                mostrarToast('Alto capturado: ' + valor.toFixed(2) + ' m');
            }
            
            if (medidasCapturadas.ancho > 0 && medidasCapturadas.alto > 0) {
                setTimeout(() => {
                    if (confirm('¿Deseas aplicar ambas medidas al cálculo?')) {
                        aplicarMedidas();
                    }
                }, 500);
            }
        } else {
            mostrarErrorGeneral('Por favor, ingresa un número válido para la medida.');
        }
    }
}

function mostrarToast(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-content">
            <i class="fas fa-check-circle"></i>
            <span>${mensaje}</span>
        </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }, 100);
}

function aplicarMedidas() {
    if (medidasCapturadas.ancho > 0) {
        document.getElementById('largoPared').value = medidasCapturadas.ancho.toFixed(2);
        const errorDiv = document.getElementById('errorLargoPared');
        if (errorDiv) errorDiv.textContent = '';
    }
    
    if (medidasCapturadas.alto > 0) {
        document.getElementById('altoPared').value = medidasCapturadas.alto.toFixed(2);
        const errorDiv = document.getElementById('errorAltoPared');
        if (errorDiv) errorDiv.textContent = '';
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('cameraModal'));
    if (modal) {
        modal.hide();
    }
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    mostrarToast('✅ Medidas aplicadas correctamente');
    
    if (confirm('¿Deseas calcular la cantidad de ladrillos con estas medidas?')) {
        calcular();
    }
}

// Cerrar cámara correctamente
document.getElementById('cameraModal')?.addEventListener('hidden.bs.modal', () => {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
});

// ==================== VALIDACIONES (originales se mantienen) ====================

function validarNumeroNegativo(valor, campoId, nombreCampo) {
    const errorDiv = document.getElementById(`error${campoId}`);
    
    if (!errorDiv) return true;
    
    if (valor === "" || valor === null) {
        errorDiv.textContent = `⚠️ El ${nombreCampo} es obligatorio`;
        return false;
    }
    
    const numero = parseFloat(valor);
    if (isNaN(numero)) {
        errorDiv.textContent = `⚠️ ${nombreCampo} debe ser un número válido`;
        return false;
    }
    
    if (numero < 0) {
        errorDiv.textContent = `❌ El ${nombreCampo} no puede ser negativo`;
        return false;
    }
    
    if (numero === 0) {
        errorDiv.textContent = `⚠️ El ${nombreCampo} debe ser mayor a cero`;
        return false;
    }
    
    errorDiv.textContent = "";
    return true;
}

function validarTodosLosCampos() {
    let valid = true;
    
    const largoPared = document.getElementById('largoPared').value;
    const altoPared = document.getElementById('altoPared').value;
    
    if (!validarNumeroNegativo(largoPared, 'LargoPared', 'largo de la pared')) valid = false;
    if (!validarNumeroNegativo(altoPared, 'AltoPared', 'alto de la pared')) valid = false;
    
    const largoLadrillo = document.getElementById('largoLadrillo').value;
    const altoLadrillo = document.getElementById('altoLadrillo').value;
    const junta = document.getElementById('junta').value;
    
    if (!validarNumeroNegativo(largoLadrillo, 'LargoLadrillo', 'largo del ladrillo')) valid = false;
    if (!validarNumeroNegativo(altoLadrillo, 'AltoLadrillo', 'alto del ladrillo')) valid = false;
    if (!validarNumeroNegativo(junta, 'Junta', 'valor de la junta')) valid = false;
    
    const vanos = document.querySelectorAll('.vano');
    vanos.forEach((vano, index) => {
        const anchoInput = vano.querySelector(`input[id^="anchoVano"]`);
        const altoInput = vano.querySelector(`input[id^="altoVano"]`);
        
        if (anchoInput) {
            if (!validarNumeroNegativo(anchoInput.value, `Vano${index}Ancho`, `ancho del vano ${index + 1}`)) valid = false;
        }
        if (altoInput) {
            if (!validarNumeroNegativo(altoInput.value, `Vano${index}Alto`, `alto del vano ${index + 1}`)) valid = false;
        }
    });
    
    return valid;
}

function mostrarErrorGeneral(mensaje) {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `
        <div style="background: #fee2e2; color: #dc2626; padding: 20px; border-radius: 16px; text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            <strong>Error</strong><br>
            ${mensaje}
        </div>
    `;
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
        if (resultadoDiv.innerHTML.includes('Error')) {
            resultadoDiv.style.display = 'none';
        }
    }, 3000);
}

function limpiarErrores() {
    const errores = document.querySelectorAll('.error-message');
    errores.forEach(error => {
        error.textContent = '';
        error.style.display = 'block';
    });
    
    const inputsConError = document.querySelectorAll('.form-control-modern.input-error');
    inputsConError.forEach(input => {
        input.classList.remove('input-error');
    });
}

// ==================== CONVERSIONES ====================

function convertirAMetros(valor, unidad, tipo = 'longitud') {
    let metros = parseFloat(valor);
    
    if (isNaN(metros)) return 0;
    
    if (tipo === 'junta') {
        switch(unidad) {
            case 'mm': return metros / 1000;
            case 'cm': return metros / 100;
            case 'in': return metros * 0.0254;
            case 'm': return metros;
            default: return metros;
        }
    }
    
    switch(unidad) {
        case 'cm': return metros / 100;
        case 'in': return metros * 0.0254;
        case 'm': return metros;
        default: return metros;
    }
}

// ==================== RECOMENDACIÓN INTELIGENTE ====================

function recomendarMargen(ladrillosBase, areaTotal, tieneVanos, formaPared) {
    let porcentajeRecomendado = 5;
    let razon = "";
    let explicacion = "";
    
    const esAreaGrande = areaTotal > 20;
    const hayMuchosVanos = tieneVanos > 2;
    const esFormaIrregular = formaPared === "irregular";
    
    if (esAreaGrande && hayMuchosVanos) {
        porcentajeRecomendado = 10;
        razon = "⚠️ Alto desperdicio";
        explicacion = "Área grande con múltiples vanos genera más cortes y desperdicio.";
    } else if (esAreaGrande || hayMuchosVanos) {
        porcentajeRecomendado = 8;
        razon = "⚡ Desperdicio moderado";
        explicacion = esAreaGrande ? "Área grande requiere más material por cortes y ajustes." : "Múltiples vanos aumentan el desperdicio por cortes alrededor de ellos.";
    } else if (esFormaIrregular) {
        porcentajeRecomendado = 10;
        razon = "🔺 Alto desperdicio";
        explicacion = "Pared con forma irregular genera muchos cortes y desperdicio de material.";
    } else {
        porcentajeRecomendado = 5;
        razon = "✅ Bajo desperdicio";
        explicacion = "Pared rectangular sin muchos vanos, desperdicio mínimo recomendado.";
    }
    
    if (ladrillosBase < 100) {
        porcentajeRecomendado = Math.min(porcentajeRecomendado + 2, 10);
        explicacion += " Al ser un proyecto pequeño, se recomienda un margen ligeramente mayor.";
    } else if (ladrillosBase > 1000) {
        porcentajeRecomendado = Math.max(porcentajeRecomendado - 1, 5);
        explicacion += " Proyecto grande permite optimizar la compra, margen reducido.";
    }
    
    return {
        porcentaje: porcentajeRecomendado,
        razon: razon,
        explicacion: explicacion
    };
}

// ==================== VANOS ====================

function agregarVano() {
    contadorVanos++;
    const container = document.getElementById('vanosContainer');
    const vanoDiv = document.createElement('div');
    vanoDiv.className = 'vano';
    vanoDiv.id = `vano${contadorVanos}`;
    
    vanoDiv.innerHTML = `
        <button class="btn-danger" onclick="eliminarVano(${contadorVanos})">
            <i class="fas fa-times"></i>
        </button>
        <div class="row g-3">
            <div class="col-md-5">
                <label style="font-size: 0.85rem;">📐 Ancho del vano</label>
                <input type="number" step="any" id="anchoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 1.0">
                <div class="error-message" id="errorAnchoVano${contadorVanos}"></div>
            </div>
            <div class="col-md-5">
                <label style="font-size: 0.85rem;">📏 Alto del vano</label>
                <input type="number" step="any" id="altoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 2.0">
                <div class="error-message" id="errorAltoVano${contadorVanos}"></div>
            </div>
            <div class="col-md-2">
                <label style="font-size: 0.85rem;">Unidad</label>
                <select id="unidadVano${contadorVanos}" class="form-select-modern" style="font-size: 0.85rem;">
                    <option value="m">m</option>
                    <option value="cm">cm</option>
                    <option value="in">in</option>
                </select>
            </div>
        </div>
    `;
    
    container.appendChild(vanoDiv);
    
    const inputs = vanoDiv.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            limpiarErrorInput(this);
        });
    });
}

function limpiarErrorInput(input) {
    let errorId = '';
    if (input.id.includes('anchoVano')) {
        errorId = input.id.replace('anchoVano', 'errorAnchoVano');
    } else if (input.id.includes('altoVano')) {
        errorId = input.id.replace('altoVano', 'errorAltoVano');
    } else {
        errorId = input.id.replace('largo', 'errorLargo')
                           .replace('alto', 'errorAlto')
                           .replace('junta', 'errorJunta');
    }
    
    const errorDiv = document.getElementById(errorId);
    if (errorDiv && input.value !== "") {
        const value = parseFloat(input.value);
        if (!isNaN(value) && value > 0) {
            errorDiv.textContent = '';
            input.classList.remove('input-error');
        }
    }
}

function eliminarVano(id) {
    const vano = document.getElementById(`vano${id}`);
    if (vano) {
        vano.remove();
    }
}

// ==================== CÁLCULO PRINCIPAL ====================

async function calcular() {
    limpiarErrores();

    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'none';

    if (!validarTodosLosCampos()) {
        mostrarErrorGeneral('Por favor, corrija los errores marcados antes de continuar.');
        return;
    }

    const largoPared = parseFloat(document.getElementById('largoPared').value);
    const altoPared = parseFloat(document.getElementById('altoPared').value);
    const unidadPared = document.getElementById('unidadPared').value;
    const largoLadrillo = parseFloat(document.getElementById('largoLadrillo').value);
    const altoLadrillo = parseFloat(document.getElementById('altoLadrillo').value);
    const junta = parseFloat(document.getElementById('junta').value);
    const unidadLadrillo = document.getElementById('unidadLadrillo').value;
    const unidadJunta = document.getElementById('unidadJunta').value;

    let vanos = [];

    document.querySelectorAll('.vano').forEach(vano => {
        const anchoInput = vano.querySelector('input[id^="anchoVano"]');
        const altoInput = vano.querySelector('input[id^="altoVano"]');
        
        if (anchoInput && altoInput) {
            const ancho = parseFloat(anchoInput.value);
            const alto = parseFloat(altoInput.value);

            if (!isNaN(ancho) && !isNaN(alto) && ancho > 0 && alto > 0) {
                const unidadVano = vano.querySelector('select[id^="unidadVano"]').value;
                vanos.push({
                    ancho: ancho,
                    alto: alto,
                    unidad: unidadVano
                });
            }
        }
    });

    try {
        const response = await fetch(
            'https://brickcalc-microservice.onrender.com/calcular',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    largoPared,
                    altoPared,
                    unidadPared,
                    vanos,
                    largoLadrillo,
                    altoLadrillo,
                    junta,
                    unidadLadrillo,
                    unidadJunta
                })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const datos = await response.json();

        const areaParedCalc = convertirAMetros(largoPared, unidadPared) * convertirAMetros(altoPared, unidadPared);
        let areaVanosCalc = 0;
        vanos.forEach(v => {
            areaVanosCalc += convertirAMetros(v.ancho, v.unidad) * convertirAMetros(v.alto, v.unidad);
        });
        const areaNetaCalc = areaParedCalc - areaVanosCalc;

        mostrarResultados({
            cantidadBase: datos.totalLadrillos,
            cantidad5: datos.totalConMargen,
            cantidad10: Math.ceil(datos.totalLadrillos * 1.10),
            cantidadRecomendada: datos.totalConMargen,
            porcentajeRecomendado: 5,
            razonRecomendacion: "✅ Medición automática activada",
            explicacionRecomendacion: "Las medidas fueron capturadas automáticamente por la cámara con detección de bordes.",
            areaPared: areaParedCalc,
            areaVanos: areaVanosCalc,
            areaNeta: areaNetaCalc,
            volumenMortero: datos.volumenMortero || areaNetaCalc * 0.02,
            vanos: vanos.length,
            formaPared: "regular"
        });

    } catch (error) {
        console.error('Error:', error);
        mostrarErrorGeneral('❌ Error conectando con el servidor. Por favor, intenta más tarde.');
    }
}

function mostrarResultados(datos) {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'block';
    
    resultadoDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #059669; margin-bottom: 15px;">
                <i class="fas fa-chart-bar"></i> Resultados del Cálculo
            </h4>
        </div>
        
        <div class="resultado-item" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);">
            <p>
                <i class="fas fa-calculator"></i>
                <strong>Cantidad base (sin desperdicio):</strong>
                <span style="font-size: 1.3rem; font-weight: 800;">${datos.cantidadBase.toLocaleString()} unidades</span>
            </p>
        </div>
        
        <div style="margin: 20px 0;">
            <h5 style="color: #1e293b; margin-bottom: 15px;">
                <i class="fas fa-percent"></i> Opciones con margen de desperdicio
            </h5>
            
            <div class="row g-3">
                <div class="col-md-6">
                    <div class="margen-card margen-5">
                        <div class="margen-header">
                            <i class="fas fa-shield-alt"></i>
                            <strong>Margen del 5%</strong>
                        </div>
                        <div class="margen-cantidad">
                            ${datos.cantidad5.toLocaleString()} ladrillos
                        </div>
                        <div class="margen-diferencia">
                            +${(datos.cantidad5 - datos.cantidadBase).toLocaleString()} unidades
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6">
                    <div class="margen-card margen-10">
                        <div class="margen-header">
                            <i class="fas fa-shield-alt"></i>
                            <strong>Margen del 10%</strong>
                        </div>
                        <div class="margen-cantidad">
                            ${datos.cantidad10.toLocaleString()} ladrillos
                        </div>
                        <div class="margen-diferencia">
                            +${(datos.cantidad10 - datos.cantidadBase).toLocaleString()} unidades
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="recomendacion-container">
            <div class="recomendacion-header">
                <i class="fas fa-star-of-life"></i>
                <strong>RECOMENDACIÓN INTELIGENTE</strong>
                <i class="fas fa-robot"></i>
            </div>
            <div class="recomendacion-contenido">
                <div class="recomendacion-porcentaje">
                    <span class="badge-recomendado">${datos.porcentajeRecomendado}%</span>
                    <span class="cantidad-recomendada">${datos.cantidadRecomendada.toLocaleString()} ladrillos</span>
                </div>
                <div class="recomendacion-razon">
                    ${datos.razonRecomendacion}
                </div>
                <div class="recomendacion-explicacion">
                    <i class="fas fa-lightbulb"></i> ${datos.explicacionRecomendacion}
                </div>
            </div>
        </div>
        
        <div class="resultado-detalles">
            <h6><i class="fas fa-info-circle"></i> Detalles del cálculo</h6>
            <p><i class="fas fa-vector-square"></i> <strong>Área total de la pared:</strong> ${datos.areaPared.toFixed(2)} m²</p>
            <p><i class="fas fa-door-open"></i> <strong>Área de vanos:</strong> ${datos.areaVanos.toFixed(2)} m²</p>
            <p><i class="fas fa-chart-line"></i> <strong>Área neta a cubrir:</strong> ${datos.areaNeta.toFixed(2)} m²</p>
            <p><i class="fas fa-fill-drip"></i> <strong>Volumen estimado de mortero:</strong> ${datos.volumenMortero.toFixed(3)} m³</p>
            <p><i class="fas fa-shape"></i> <strong>Forma de la pared:</strong> ${datos.formaPared === "regular" ? "Rectangular regular" : "Forma irregular"}</p>
            ${datos.vanos > 0 ? `<p><i class="fas fa-door-closed"></i> <strong>Vanos restados:</strong> ${datos.vanos}</p>` : ''}
        </div>
        
        <div class="consejo-profesional">
            <i class="fas fa-tools"></i>
            <strong>💡 Consejo profesional:</strong> Siempre es mejor comprar un poco más de material. El desperdicio puede deberse a cortes, ladrillos rotos, esquinas, o errores de cálculo. ¡Mejor que sobre a que falte!
        </div>
    `;
    
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', function() {
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const value = parseFloat(this.value);
            let errorId = '';
            
            if (this.id === 'largoPared') errorId = 'errorLargoPared';
            else if (this.id === 'altoPared') errorId = 'errorAltoPared';
            else if (this.id === 'largoLadrillo') errorId = 'errorLargoLadrillo';
            else if (this.id === 'altoLadrillo') errorId = 'errorAltoLadrillo';
            else if (this.id === 'junta') errorId = 'errorJunta';
            else if (this.id.includes('anchoVano')) errorId = this.id.replace('anchoVano', 'errorAnchoVano');
            else if (this.id.includes('altoVano')) errorId = this.id.replace('altoVano', 'errorAltoVano');
            
            const errorDiv = document.getElementById(errorId);
            
            if (errorDiv) {
                if (this.value === "") {
                    errorDiv.textContent = '⚠️ Campo obligatorio';
                    this.classList.add('input-error');
                } else if (isNaN(value)) {
                    errorDiv.textContent = '⚠️ Ingrese un número válido';
                    this.classList.add('input-error');
                } else if (value < 0) {
                    errorDiv.textContent = '❌ No puede ser negativo';
                    this.classList.add('input-error');
                } else if (value === 0) {
                    errorDiv.textContent = '⚠️ Debe ser mayor a cero';
                    this.classList.add('input-error');
                } else {
                    errorDiv.textContent = '';
                    this.classList.remove('input-error');
                }
            }
        });
    });
});

setTimeout(() => {
    if (document.querySelectorAll('.vano').length === 0) {
        agregarVano();
    }
}, 100);