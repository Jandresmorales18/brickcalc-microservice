// Variables globales
let contadorVanos = 0;
let stream = null;
let medidasCapturadas = {
    ancho: 0,
    alto: 0
};

// ==================== VALIDACIONES ====================

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
            <strong>Error de validación</strong><br>
            ${mensaje}
        </div>
    `;
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Limpiar el error después de 3 segundos
    setTimeout(() => {
        if (resultadoDiv.innerHTML.includes('Error de validación')) {
            resultadoDiv.style.display = 'none';
        }
    }, 3000);
}

function limpiarErrores() {
    // Limpiar todos los mensajes de error
    const errores = document.querySelectorAll('.error-message');
    errores.forEach(error => {
        error.textContent = '';
        error.style.display = 'block';
    });
    
    // Limpiar estilos de inputs con error
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

function calcular() {
    // Limpiar errores ANTES de validar
    limpiarErrores();
    
    // Ocultar resultado anterior
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'none';
    
    if (!validarTodosLosCampos()) {
        mostrarErrorGeneral('Por favor, corrija los errores marcados antes de continuar.');
        return;
    }
    
    let largoPared = parseFloat(document.getElementById('largoPared').value);
    let altoPared = parseFloat(document.getElementById('altoPared').value);
    const unidadPared = document.getElementById('unidadPared').value;
    
    let largoLadrillo = parseFloat(document.getElementById('largoLadrillo').value);
    let altoLadrillo = parseFloat(document.getElementById('altoLadrillo').value);
    let junta = parseFloat(document.getElementById('junta').value);
    const unidadLadrillo = document.getElementById('unidadLadrillo').value;
    const unidadJunta = document.getElementById('unidadJunta').value;
    
    largoPared = convertirAMetros(largoPared, unidadPared);
    altoPared = convertirAMetros(altoPared, unidadPared);
    largoLadrillo = convertirAMetros(largoLadrillo, unidadLadrillo);
    altoLadrillo = convertirAMetros(altoLadrillo, unidadLadrillo);
    junta = convertirAMetros(junta, unidadJunta, 'junta');
    
    const areaPared = largoPared * altoPared;
    
    let areaVanos = 0;
    const vanos = document.querySelectorAll('.vano');
    
    vanos.forEach((vano) => {
        let anchoVano = parseFloat(vano.querySelector(`input[id^="anchoVano"]`).value);
        let altoVano = parseFloat(vano.querySelector(`input[id^="altoVano"]`).value);
        const unidadVano = vano.querySelector(`select[id^="unidadVano"]`).value;
        
        if (!isNaN(anchoVano) && !isNaN(altoVano)) {
            anchoVano = convertirAMetros(anchoVano, unidadVano);
            altoVano = convertirAMetros(altoVano, unidadVano);
            areaVanos += anchoVano * altoVano;
        }
    });
    
    const areaNeta = areaPared - areaVanos;
    const areaLadrillo = (largoLadrillo + junta) * (altoLadrillo + junta);
    const cantidadBase = Math.ceil(areaNeta / areaLadrillo);
    
    const proporcion = largoPared / altoPared;
    const formaPared = (proporcion > 2 || proporcion < 0.5) ? "irregular" : "regular";
    
    const recomendacion = recomendarMargen(cantidadBase, areaPared, vanos.length, formaPared);
    
    const margen5 = Math.ceil(cantidadBase * 1.05);
    const margen10 = Math.ceil(cantidadBase * 1.10);
    const cantidadRecomendada = Math.ceil(cantidadBase * (1 + recomendacion.porcentaje / 100));
    const volumenMortero = areaNeta * 0.02;
    
    mostrarResultados({
        cantidadBase: cantidadBase,
        cantidad5: margen5,
        cantidad10: margen10,
        cantidadRecomendada: cantidadRecomendada,
        porcentajeRecomendado: recomendacion.porcentaje,
        razonRecomendacion: recomendacion.razon,
        explicacionRecomendacion: recomendacion.explicacion,
        areaPared: areaPared,
        areaVanos: areaVanos,
        areaNeta: areaNeta,
        volumenMortero: volumenMortero,
        vanos: vanos.length,
        formaPared: formaPared
    });
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

// ==================== FUNCIONES DE CÁMARA ====================

async function abrirCamaraMedicion() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: "environment",
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        const video = document.getElementById('video');
        video.srcObject = stream;
        
        const modal = new bootstrap.Modal(document.getElementById('cameraModal'));
        modal.show();
        
        video.onloadedmetadata = () => {
            const canvas = document.getElementById('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            dibujarGrid();
        };
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        mostrarErrorGeneral('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
    }
}

function dibujarGrid() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    function draw() {
        if (video.readyState === 4) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 2;
            
            const gridSize = 50;
            for (let x = gridSize; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            
            for (let y = gridSize; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }
            
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 220, 40);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.fillText('Referencia: 1 cuadro ≈ 0.5m', 15, 35);
        }
        requestAnimationFrame(draw);
    }
    
    draw();
}

function capturarMedida(tipo) {
    let medidaEstimada = prompt(
        `📏 Medición de ${tipo === 'ancho' ? 'ancho' : 'alto'}\n\n` +
        `Instrucciones:\n` +
        `1. Mira la pared en la cámara\n` +
        `2. Usa la cuadrícula como referencia (1 cuadro ≈ 0.5m)\n` +
        `3. Ingresa la medida estimada en metros\n\n` +
        `💡 Tip: Si conoces una medida real, ingrésala para mayor precisión`
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
        document.getElementById('largoPared').value = medidasCapturadas.ancho;
        const errorDiv = document.getElementById('errorLargoPared');
        if (errorDiv) errorDiv.textContent = '';
    }
    
    if (medidasCapturadas.alto > 0) {
        document.getElementById('altoPared').value = medidasCapturadas.alto;
        const errorDiv = document.getElementById('errorAltoPared');
        if (errorDiv) errorDiv.textContent = '';
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('cameraModal'));
    modal.hide();
    
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    
    mostrarToast('✅ Medidas aplicadas correctamente');
    
    if (confirm('¿Deseas calcular la cantidad de ladrillos con estas medidas?')) {
        calcular();
    }
}

document.getElementById('cameraModal')?.addEventListener('hidden.bs.modal', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', function() {
    // Validación en tiempo real para todos los inputs numéricos
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

// Agregar vano inicial
setTimeout(() => {
    if (document.querySelectorAll('.vano').length === 0) {
        agregarVano();
    }
}, 100);