// Variables globales
let contadorVanos = 0;
let stream = null;
let medidasCapturadas = { ancho: 0, alto: 0 };
let animationFrameId = null;

// ==================== FUNCIÓN PARA NORMALIZAR DECIMALES ====================
// Convierte coma a punto y valida números
function normalizarDecimal(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    // Convertir a string y reemplazar coma por punto
    let normalizado = valor.toString().replace(/,/g, '.');
    // Eliminar espacios
    normalizado = normalizado.trim();
    // Parsear a número
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? null : numero;
}

// Función para limpiar y normalizar inputs en tiempo real
function normalizarInputNumerico(input) {
    if (!input) return;
    
    let valor = input.value;
    // Si tiene coma, la reemplazamos por punto para el valor real
    if (valor.includes(',')) {
        input.dataset.valorReal = valor.replace(/,/g, '.');
    } else {
        input.dataset.valorReal = valor;
    }
}

// ==================== MEDICIÓN CON CÁMARA ====================

async function abrirCamaraMedicion() {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
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
            dibujarGuiaMedicion();
        };
        
    } catch (error) {
        console.error('Error:', error);
        mostrarErrorGeneral('No se pudo acceder a la cámara. Verifica los permisos.');
    }
}

function dibujarGuiaMedicion() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    function dibujar() {
        if (video.readyState === 4 && video.videoWidth > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Rectángulo guía para alinear la pared
            const guiaX = canvas.width * 0.15;
            const guiaY = canvas.height * 0.2;
            const guiaW = canvas.width * 0.7;
            const guiaH = canvas.height * 0.5;
            
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 15]);
            ctx.strokeRect(guiaX, guiaY, guiaW, guiaH);
            ctx.setLineDash([]);
            
            // Panel de instrucciones
            ctx.fillStyle = 'rgba(0,0,0,0.85)';
            ctx.fillRect(15, 15, 350, 140);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('📏 MEDICIÓN CON CÁMARA', 25, 40);
            ctx.font = '12px Arial';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('1. Alinea la pared dentro del rectángulo', 25, 65);
            ctx.fillText('2. Usa la regla virtual como referencia', 25, 85);
            ctx.fillText('3. Usa PUNTO (.) o COMA (,) para decimales', 25, 105);
            ctx.fillText('4. Ejemplo: 2.5 o 2,5 = dos metros cincuenta', 25, 125);
            ctx.fillText('5. Luego aplica las medidas al cálculo', 25, 145);
            
            // Regla virtual en la parte inferior
            const rulerY = canvas.height - 45;
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(0, rulerY - 15, canvas.width, 55);
            
            ctx.fillStyle = '#fbbf24';
            ctx.font = 'bold 10px Arial';
            ctx.fillText('📏 REGLA VIRTUAL DE REFERENCIA', 15, rulerY - 2);
            
            for (let x = 0; x < canvas.width; x += 50) {
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(x, rulerY - 8);
                ctx.lineTo(x, rulerY + 8);
                ctx.stroke();
                
                const metros = (x / canvas.width) * 3.5;
                ctx.fillStyle = 'white';
                ctx.font = '9px Arial';
                ctx.fillText(`${metros.toFixed(1)}m`, x - 12, rulerY + 22);
            }
        }
        animationFrameId = requestAnimationFrame(dibujar);
    }
    
    dibujar();
}

function capturarMedida(tipo) {
    let valorIngresado;
    let numero;
    
    if (tipo === 'auto') {
        // Auto-medir - ANCHO
        valorIngresado = prompt(
            "📏 AUTO-MEDICIÓN\n\n" +
            "Observa la regla virtual en la pantalla.\n" +
            "Estima el ANCHO de la pared en metros.\n\n" +
            "✅ Puedes usar PUNTO (.) o COMA (,)\n" +
            "Ejemplos: 5.5  o  5,5\n\n" +
            "Ingresa el ANCHO en METROS:"
        );
        
        numero = normalizarDecimal(valorIngresado);
        if (numero !== null && numero > 0 && numero < 50) {
            medidasCapturadas.ancho = numero;
            document.getElementById('medidaAncho').textContent = `${numero.toFixed(2).replace('.', ',')} m`;
            mostrarToast(`✅ Ancho registrado: ${numero.toFixed(2)} m`);
            
            // Auto-medir - ALTO
            valorIngresado = prompt(
                "📏 AUTO-MEDICIÓN\n\n" +
                "Ahora ingresa el ALTO de la pared en metros.\n" +
                "El alto típico es 2.4m (240cm)\n\n" +
                "✅ Usa PUNTO (.) o COMA (,)\n" +
                "Ejemplo: 2.4  o  2,4\n\n" +
                "Ingresa el ALTO en METROS:"
            );
            
            numero = normalizarDecimal(valorIngresado);
            if (numero !== null && numero > 0 && numero < 20) {
                medidasCapturadas.alto = numero;
                document.getElementById('medidaAlto').textContent = `${numero.toFixed(2).replace('.', ',')} m`;
                mostrarToast(`✅ Alto registrado: ${numero.toFixed(2)} m`);
                aplicarMedidas();
            } else {
                mostrarErrorGeneral('Valor inválido para el alto. Usa punto (.) o coma (,)');
            }
        } else {
            mostrarErrorGeneral('Valor inválido para el ancho. Usa punto (.) o coma (,)');
        }
    } 
    else if (tipo === 'ancho') {
        valorIngresado = prompt(
            "📏 INGRESAR ANCHO\n\n" +
            "Usa la regla virtual como referencia.\n" +
            "✅ Usa PUNTO (.) o COMA (,)\n" +
            "Ejemplos: 5.5  o  5,5\n\n" +
            "Ingresa el ancho en METROS:"
        );
        
        numero = normalizarDecimal(valorIngresado);
        if (numero !== null && numero > 0 && numero < 50) {
            medidasCapturadas.ancho = numero;
            document.getElementById('medidaAncho').textContent = `${numero.toFixed(2).replace('.', ',')} m`;
            mostrarToast(`✅ Ancho: ${numero.toFixed(2)} m`);
        } else {
            mostrarErrorGeneral('Valor inválido. Ingresa un número entre 0.1 y 50 usando punto(.) o coma(,)');
        }
    } 
    else if (tipo === 'alto') {
        valorIngresado = prompt(
            "📏 INGRESAR ALTO\n\n" +
            "El alto típico es 2.4m (240cm)\n" +
            "✅ Usa PUNTO (.) o COMA (,)\n" +
            "Ejemplos: 2.4  o  2,4\n\n" +
            "Ingresa el alto en METROS:"
        );
        
        numero = normalizarDecimal(valorIngresado);
        if (numero !== null && numero > 0 && numero < 20) {
            medidasCapturadas.alto = numero;
            document.getElementById('medidaAlto').textContent = `${numero.toFixed(2).replace('.', ',')} m`;
            mostrarToast(`✅ Alto: ${numero.toFixed(2)} m`);
        } else {
            mostrarErrorGeneral('Valor inválido. Ingresa un número entre 0.5 y 10 usando punto(.) o coma(,)');
        }
    }
    
    // Verificar si ambas medidas están listas para aplicar
    if (medidasCapturadas.ancho > 0 && medidasCapturadas.alto > 0) {
        setTimeout(() => {
            if (confirm('¿Aplicar estas medidas al cálculo?')) {
                aplicarMedidas();
            }
        }, 500);
    }
}

function reiniciarMedicion() {
    medidasCapturadas = { ancho: 0, alto: 0 };
    document.getElementById('medidaAncho').textContent = '-- m';
    document.getElementById('medidaAlto').textContent = '-- m';
    mostrarToast('🔄 Mediciones reiniciadas');
}

function mostrarToast(mensaje) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `<div class="toast-content"><i class="fas fa-check-circle"></i><span>${mensaje}</span></div>`;
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
        // Mostrar con punto en el input (el input acepta ambos)
        document.getElementById('largoPared').value = medidasCapturadas.ancho.toString().replace('.', ',');
        const errorDiv = document.getElementById('errorLargoPared');
        if (errorDiv) errorDiv.textContent = '';
    }
    
    if (medidasCapturadas.alto > 0) {
        document.getElementById('altoPared').value = medidasCapturadas.alto.toString().replace('.', ',');
        const errorDiv = document.getElementById('errorAltoPared');
        if (errorDiv) errorDiv.textContent = '';
    }
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('cameraModal'));
    if (modal) modal.hide();
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
    
    mostrarToast('✅ Medidas aplicadas correctamente');
    
    setTimeout(() => {
        if (confirm('¿Calcular cantidad de ladrillos?')) calcular();
    }, 500);
}

document.getElementById('cameraModal')?.addEventListener('hidden.bs.modal', () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
});

// ==================== VALIDACIONES ====================

function validarNumeroNegativo(valor, campoId, nombreCampo) {
    const errorDiv = document.getElementById(`error${campoId}`);
    if (!errorDiv) return true;
    
    // Normalizar el valor (convertir coma a punto si es necesario)
    let numero;
    if (typeof valor === 'string') {
        numero = normalizarDecimal(valor);
    } else {
        numero = valor;
    }
    
    if (valor === "" || valor === null || valor === undefined) {
        errorDiv.textContent = `⚠️ El ${nombreCampo} es obligatorio`;
        return false;
    }
    
    if (numero === null || isNaN(numero)) {
        errorDiv.textContent = `⚠️ ${nombreCampo} debe ser un número válido (usa punto o coma)`;
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
    const largoLadrillo = document.getElementById('largoLadrillo').value;
    const altoLadrillo = document.getElementById('altoLadrillo').value;
    const junta = document.getElementById('junta').value;
    
    if (!validarNumeroNegativo(largoPared, 'LargoPared', 'largo de la pared')) valid = false;
    if (!validarNumeroNegativo(altoPared, 'AltoPared', 'alto de la pared')) valid = false;
    if (!validarNumeroNegativo(largoLadrillo, 'LargoLadrillo', 'largo del ladrillo')) valid = false;
    if (!validarNumeroNegativo(altoLadrillo, 'AltoLadrillo', 'alto del ladrillo')) valid = false;
    if (!validarNumeroNegativo(junta, 'Junta', 'la junta')) valid = false;
    
    document.querySelectorAll('.vano').forEach((vano, i) => {
        const ancho = vano.querySelector('input[id^="anchoVano"]')?.value;
        const alto = vano.querySelector('input[id^="altoVano"]')?.value;
        if (!validarNumeroNegativo(ancho, `Vano${i}Ancho`, `ancho del vano ${i + 1}`)) valid = false;
        if (!validarNumeroNegativo(alto, `Vano${i}Alto`, `alto del vano ${i + 1}`)) valid = false;
    });
    
    return valid;
}

function mostrarErrorGeneral(mensaje) {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `
        <div style="background: #fee2e2; color: #dc2626; padding: 20px; border-radius: 16px; text-align: center;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
            <strong>Error</strong><br>${mensaje}
        </div>
    `;
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => { if (resultadoDiv.innerHTML.includes('Error')) resultadoDiv.style.display = 'none'; }, 3000);
}

function limpiarErrores() {
    document.querySelectorAll('.error-message').forEach(el => { el.textContent = ''; });
    document.querySelectorAll('.form-control-modern.input-error').forEach(el => el.classList.remove('input-error'));
}

// ==================== CONVERSIONES ====================

function convertirAMetros(valor, unidad, esJunta = false) {
    // Normalizar valor (convertir coma a punto si es string)
    let v;
    if (typeof valor === 'string') {
        v = normalizarDecimal(valor);
    } else {
        v = valor;
    }
    
    if (v === null || isNaN(v)) return 0;
    
    if (esJunta) {
        if (unidad === 'mm') return v / 1000;
        if (unidad === 'cm') return v / 100;
        if (unidad === 'in') return v * 0.0254;
        return v;
    }
    if (unidad === 'cm') return v / 100;
    if (unidad === 'in') return v * 0.0254;
    return v;
}

// ==================== RECOMENDACIÓN INTELIGENTE ====================

function recomendarMargen(ladrillosBase, areaTotal, cantVanos, formaPared) {
    let porc = 5;
    let razon = "✅ Bajo desperdicio";
    let expli = "Pared regular sin muchos vanos.";
    
    const esAreaGrande = areaTotal > 20;
    const hayMuchosVanos = cantVanos > 2;
    const esFormaIrregular = formaPared === "irregular";
    
    if ((esAreaGrande && hayMuchosVanos) || esFormaIrregular) {
        porc = 10;
        razon = "⚠️ Alto desperdicio";
        expli = "Múltiples vanos o forma irregular generan más cortes.";
    } else if (esAreaGrande || hayMuchosVanos) {
        porc = 8;
        razon = "⚡ Desperdicio moderado";
        expli = esAreaGrande ? "Área grande requiere más material por cortes y ajustes." : "Múltiples vanos aumentan el desperdicio por cortes alrededor de ellos.";
    }
    
    if (ladrillosBase < 100) porc = Math.min(porc + 2, 10);
    return { porcentaje: porc, razon, explicacion: expli };
}

// ==================== VANOS ====================

function agregarVano() {
    contadorVanos++;
    const div = document.createElement('div');
    div.className = 'vano';
    div.id = `vano${contadorVanos}`;
    div.innerHTML = `
        <button class="btn-danger" onclick="eliminarVano(${contadorVanos})"><i class="fas fa-times"></i></button>
        <div class="row g-3">
            <div class="col-md-5">
                <label>📐 Ancho del vano</label>
                <input type="text" step="any" id="anchoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 1.0 o 1,0">
                <div class="error-message" id="errorAnchoVano${contadorVanos}"></div>
            </div>
            <div class="col-md-5">
                <label>📏 Alto del vano</label>
                <input type="text" step="any" id="altoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 2.0 o 2,0">
                <div class="error-message" id="errorAltoVano${contadorVanos}"></div>
            </div>
            <div class="col-md-2">
                <label>Unidad</label>
                <select id="unidadVano${contadorVanos}" class="form-select-modern">
                    <option value="m">m</option>
                    <option value="cm" selected>cm</option>
                    <option value="in">in</option>
                </select>
            </div>
        </div>
    `;
    document.getElementById('vanosContainer').appendChild(div);
    
    // Agregar normalización a los nuevos inputs
    const inputs = div.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', function() { normalizarInputNumerico(this); });
        input.addEventListener('blur', function() {
            const num = normalizarDecimal(this.value);
            if (num !== null) this.value = num.toString().replace('.', ',');
        });
    });
}

function eliminarVano(id) { 
    document.getElementById(`vano${id}`)?.remove(); 
}

// ==================== CÁLCULO PRINCIPAL ====================

async function calcular() {
    limpiarErrores();
    document.getElementById('resultado').style.display = 'none';
    
    if (!validarTodosLosCampos()) { 
        mostrarErrorGeneral('Corrige los errores marcados en rojo'); 
        return; 
    }
    
    // Obtener y normalizar valores
    const largoParedRaw = document.getElementById('largoPared').value;
    const altoParedRaw = document.getElementById('altoPared').value;
    const largoLadrilloRaw = document.getElementById('largoLadrillo').value;
    const altoLadrilloRaw = document.getElementById('altoLadrillo').value;
    const juntaRaw = document.getElementById('junta').value;
    
    const largoPared = normalizarDecimal(largoParedRaw);
    const altoPared = normalizarDecimal(altoParedRaw);
    const largoLadrillo = normalizarDecimal(largoLadrilloRaw);
    const altoLadrillo = normalizarDecimal(altoLadrilloRaw);
    const junta = normalizarDecimal(juntaRaw);
    
    const unidadPared = document.getElementById('unidadPared').value;
    const unidadLadrillo = document.getElementById('unidadLadrillo').value;
    const unidadJunta = document.getElementById('unidadJunta').value;
    
    // Recoger vanos
    let vanos = [];
    document.querySelectorAll('.vano').forEach(vano => {
        const anchoInput = vano.querySelector('input[id^="anchoVano"]');
        const altoInput = vano.querySelector('input[id^="altoVano"]');
        const unidadSelect = vano.querySelector('select[id^="unidadVano"]');
        
        if (anchoInput && altoInput && anchoInput.value && altoInput.value) {
            const ancho = normalizarDecimal(anchoInput.value);
            const alto = normalizarDecimal(altoInput.value);
            if (ancho !== null && alto !== null) {
                vanos.push({
                    ancho: ancho,
                    alto: alto,
                    unidad: unidadSelect ? unidadSelect.value : 'm'
                });
            }
        }
    });
    
    // Mostrar loading
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #10b981;"></i>
            <p style="margin-top: 15px;">Calculando...</p>
        </div>
    `;
    
    try {
        const response = await fetch('https://brickcalc-microservice.onrender.com/calcular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                largoPared, altoPared, unidadPared,
                vanos,
                largoLadrillo, altoLadrillo, junta,
                unidadLadrillo, unidadJunta
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.mensaje || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            mostrarResultados(data.datos);
        } else {
            throw new Error(data.error || 'Error en el cálculo');
        }
        
    } catch (error) {
        console.error('Error:', error);
        resultadoDiv.innerHTML = `
            <div style="background: #fee2e2; color: #dc2626; padding: 20px; border-radius: 16px; text-align: center;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                <strong>❌ Error de conexión</strong><br>
                ${error.message}<br><br>
                <small>Verifica que el servidor backend esté activo en Render</small>
            </div>
        `;
    }
}

function mostrarResultados(datos) {
    const resultadoDiv = document.getElementById('resultado');
    
    resultadoDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #059669; margin-bottom: 15px;">
                <i class="fas fa-chart-bar"></i> Resultados del Cálculo
            </h4>
        </div>
        
        <!-- Cantidad base -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 15px; border-radius: 16px; text-align: center; color: white;">
            <i class="fas fa-calculator" style="font-size: 1.5rem;"></i>
            <strong style="display: block; font-size: 0.9rem;">Cantidad base (sin desperdicio)</strong>
            <span style="font-size: 2rem; font-weight: 800;">${datos.totalLadrillos.toLocaleString()}</span>
            <span style="display: block; font-size: 0.8rem;">unidades</span>
        </div>
        
        <!-- Márgenes -->
        <div style="margin: 20px 0;">
            <h5 style="color: #1e293b; margin-bottom: 15px;">
                <i class="fas fa-percent"></i> Opciones con margen de desperdicio
            </h5>
            <div class="row g-3">
                <div class="col-md-4">
                    <div style="border: 2px solid #3b82f6; background: #eff6ff; border-radius: 16px; padding: 15px; text-align: center;">
                        <strong>Margen 5%</strong>
                        <div style="font-size: 1.5rem; font-weight: 800;">${datos.totalConMargen5?.toLocaleString() || Math.ceil(datos.totalLadrillos * 1.05).toLocaleString()}</div>
                        <small>+${((datos.totalConMargen5 || Math.ceil(datos.totalLadrillos * 1.05)) - datos.totalLadrillos).toLocaleString()} unidades</small>
                    </div>
                </div>
                <div class="col-md-4">
                    <div style="border: 2px solid #10b981; background: #ecfdf5; border-radius: 16px; padding: 15px; text-align: center;">
                        <strong>Margen 10%</strong>
                        <div style="font-size: 1.5rem; font-weight: 800;">${datos.totalConMargen10?.toLocaleString() || Math.ceil(datos.totalLadrillos * 1.10).toLocaleString()}</div>
                        <small>+${((datos.totalConMargen10 || Math.ceil(datos.totalLadrillos * 1.10)) - datos.totalLadrillos).toLocaleString()} unidades</small>
                    </div>
                </div>
                <div class="col-md-4">
                    <div style="border: 2px solid #f59e0b; background: #fef3c7; border-radius: 16px; padding: 15px; text-align: center;">
                        <strong>Margen 15%</strong>
                        <div style="font-size: 1.5rem; font-weight: 800;">${datos.totalConMargen15?.toLocaleString() || Math.ceil(datos.totalLadrillos * 1.15).toLocaleString()}</div>
                        <small>+${((datos.totalConMargen15 || Math.ceil(datos.totalLadrillos * 1.15)) - datos.totalLadrillos).toLocaleString()} unidades</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Recomendación -->
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 20px; padding: 20px; margin: 15px 0; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-star-of-life"></i>
                <strong>RECOMENDACIÓN INTELIGENTE</strong>
                <i class="fas fa-robot"></i>
            </div>
            <div>
                <span style="background: #f59e0b; color: white; padding: 5px 15px; border-radius: 50px; font-weight: 800;">${datos.margenRecomendado || 5}%</span>
                <strong style="font-size: 1.3rem; margin-left: 10px;">${(datos.margenRecomendado === 5 ? (datos.totalConMargen5 || Math.ceil(datos.totalLadrillos * 1.05)) : (datos.totalConMargen10 || Math.ceil(datos.totalLadrillos * 1.10))).toLocaleString()} ladrillos</strong>
            </div>
            <small style="display: block; margin-top: 10px; color: #78350f;">${datos.totalLadrillos < 100 ? 'Proyecto pequeño, se recomienda mayor margen' : 'Margen estándar recomendado'}</small>
        </div>
        
        <!-- Detalles -->
        <div style="background: white; border-radius: 16px; padding: 20px; margin: 15px 0;">
            <h6 style="margin-bottom: 15px; font-weight: 700;"><i class="fas fa-info-circle"></i> Detalles del cálculo</h6>
            <p style="margin: 8px 0;"><i class="fas fa-vector-square"></i> <strong>Área total:</strong> ${datos.areaPared} m²</p>
            <p style="margin: 8px 0;"><i class="fas fa-door-open"></i> <strong>Área de vanos:</strong> ${datos.areaVanos} m²</p>
            <p style="margin: 8px 0;"><i class="fas fa-chart-line"></i> <strong>Área neta:</strong> ${datos.areaNeta} m²</p>
            <p style="margin: 8px 0;"><i class="fas fa-fill-drip"></i> <strong>Mortero estimado:</strong> ${datos.volumenMortero || (datos.areaNeta * 0.02).toFixed(3)} m³</p>
            <p style="margin: 8px 0;"><i class="fas fa-chart-simple"></i> <strong>Ladrillos por m²:</strong> ${datos.ladrillosPorM2}</p>
        </div>
        
        <!-- Consejo -->
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; border-radius: 12px;">
            <i class="fas fa-tools"></i>
            <strong>💡 Consejo profesional:</strong> Siempre compra un poco más de material. El desperdicio puede deberse a cortes, ladrillos rotos o errores de cálculo. ¡Mejor que sobre a que falte!
        </div>
    `;
    
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== NORMALIZAR INPUTS EN EL DOM ====================

function normalizarTodosLosInputs() {
    // Convertir inputs type="number" a type="text" para permitir comas
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.type = 'text';
        input.placeholder = input.placeholder + ' (usa punto o coma)';
        
        // Guardar valor original
        input.addEventListener('input', function() { normalizarInputNumerico(this); });
        
        // Al perder foco, mostrar con coma
        input.addEventListener('blur', function() {
            const num = normalizarDecimal(this.value);
            if (num !== null && num !== undefined && !isNaN(num)) {
                this.value = num.toString().replace('.', ',');
            }
        });
    });
    
    // Normalizar inputs de vanos existentes
    document.querySelectorAll('.vano input').forEach(input => {
        input.type = 'text';
        input.addEventListener('input', function() { normalizarInputNumerico(this); });
        input.addEventListener('blur', function() {
            const num = normalizarDecimal(this.value);
            if (num !== null && num !== undefined && !isNaN(num)) {
                this.value = num.toString().replace('.', ',');
            }
        });
    });
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    // Normalizar todos los inputs numéricos
    normalizarTodosLosInputs();
    
    // Validación en tiempo real
    const inputs = document.querySelectorAll('input.form-control-modern');
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            const val = normalizarDecimal(this.value);
            let errId = '';
            if (this.id === 'largoPared') errId = 'errorLargoPared';
            else if (this.id === 'altoPared') errId = 'errorAltoPared';
            else if (this.id === 'largoLadrillo') errId = 'errorLargoLadrillo';
            else if (this.id === 'altoLadrillo') errId = 'errorAltoLadrillo';
            else if (this.id === 'junta') errId = 'errorJunta';
            
            if (errId) {
                const errDiv = document.getElementById(errId);
                if (errDiv) {
                    if (this.value === "") errDiv.textContent = "⚠️ Campo obligatorio";
                    else if (val === null) errDiv.textContent = "⚠️ Usa punto (.) o coma (,)";
                    else if (val < 0) errDiv.textContent = "❌ No puede ser negativo";
                    else if (val === 0) errDiv.textContent = "⚠️ Debe ser mayor a cero";
                    else errDiv.textContent = "";
                }
            }
        });
    });
    
    // Agregar vano inicial si no hay
    setTimeout(() => { 
        if (!document.querySelector('.vano')) agregarVano(); 
    }, 100);
});