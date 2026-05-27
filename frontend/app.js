// Variables globales
let contadorVanos = 0;
let stream = null;
let medidasCapturadas = { ancho: 0, alto: 0 };
let animationFrameId = null;

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
            iniciarGuiaMedicion();
        };
        
    } catch (error) {
        console.error('Error:', error);
        mostrarErrorGeneral('No se pudo acceder a la cámara. Verifica los permisos.');
    }
}

function iniciarGuiaMedicion() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    function dibujarGuia() {
        if (video.readyState === 4 && video.videoWidth > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Dibujar rectángulo guía
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
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.fillRect(15, 15, 280, 100);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('📏 MEDICIÓN MANUAL', 25, 40);
            ctx.font = '12px Arial';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText('1. Usa la regla virtual como referencia', 25, 65);
            ctx.fillText('2. Ingresa el ancho y alto manualmente', 25, 85);
            ctx.fillText('3. O usa "Auto-medir" para detección', 25, 105);
            
            // Regla virtual
            const rulerY = canvas.height - 40;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0, rulerY - 10, canvas.width, 45);
            
            for (let x = 0; x < canvas.width; x += 50) {
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, rulerY - 5);
                ctx.lineTo(x, rulerY + 5);
                ctx.stroke();
                
                const metros = (x / canvas.width) * 3;
                ctx.fillStyle = 'white';
                ctx.font = '9px Arial';
                ctx.fillText(`${metros.toFixed(1)}m`, x - 10, rulerY + 18);
            }
        }
        animationFrameId = requestAnimationFrame(dibujarGuia);
    }
    
    dibujarGuia();
}

function capturarMedida(tipo) {
    if (tipo === 'auto') {
        const ancho = prompt(
            "📏 AUTO-MEDICIÓN\n\n" +
            "Observa la regla virtual en la pantalla.\n" +
            "Estima el ANCHO de la pared en metros.\n\n" +
            "Ejemplo: Si la pared ocupa toda la pantalla,\n" +
            "y la regla llega hasta 3m, el ancho ≈ 3m\n\n" +
            "Ingresa el ANCHO en METROS:"
        );
        
        if (ancho && !isNaN(parseFloat(ancho))) {
            medidasCapturadas.ancho = parseFloat(ancho);
            document.getElementById('medidaAncho').textContent = `${medidasCapturadas.ancho.toFixed(2)} m`;
            
            const alto = prompt(
                "📏 Ingresa el ALTO de la pared en METROS:\n\n" +
                "El alto típico es 2.4m (240cm)"
            );
            
            if (alto && !isNaN(parseFloat(alto))) {
                medidasCapturadas.alto = parseFloat(alto);
                document.getElementById('medidaAlto').textContent = `${medidasCapturadas.alto.toFixed(2)} m`;
                mostrarToast(`✅ Medidas registradas: ${medidasCapturadas.ancho}m x ${medidasCapturadas.alto}m`);
                aplicarMedidas();
            }
        }
    } else if (tipo === 'ancho') {
        const valor = prompt(
            "📏 INGRESAR ANCHO\n\n" +
            "Usa la regla virtual como referencia.\n" +
            "Ingresa el valor en METROS:"
        );
        if (valor && !isNaN(parseFloat(valor)) && parseFloat(valor) > 0) {
            medidasCapturadas.ancho = parseFloat(valor);
            document.getElementById('medidaAncho').textContent = `${medidasCapturadas.ancho.toFixed(2)} m`;
            mostrarToast(`✅ Ancho: ${medidasCapturadas.ancho.toFixed(2)} m`);
        }
    } else if (tipo === 'alto') {
        const valor = prompt(
            "📏 INGRESAR ALTO\n\n" +
            "El alto típico es 2.4m (240cm).\n" +
            "Ingresa el valor en METROS:"
        );
        if (valor && !isNaN(parseFloat(valor)) && parseFloat(valor) > 0) {
            medidasCapturadas.alto = parseFloat(valor);
            document.getElementById('medidaAlto').textContent = `${medidasCapturadas.alto.toFixed(2)} m`;
            mostrarToast(`✅ Alto: ${medidasCapturadas.alto.toFixed(2)} m`);
        }
    }
    
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
    if (modal) modal.hide();
    
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    if (stream) stream.getTracks().forEach(track => track.stop());
    
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
    
    if (!validarNumeroNegativo(document.getElementById('largoPared').value, 'LargoPared', 'largo de la pared')) valid = false;
    if (!validarNumeroNegativo(document.getElementById('altoPared').value, 'AltoPared', 'alto de la pared')) valid = false;
    if (!validarNumeroNegativo(document.getElementById('largoLadrillo').value, 'LargoLadrillo', 'largo del ladrillo')) valid = false;
    if (!validarNumeroNegativo(document.getElementById('altoLadrillo').value, 'AltoLadrillo', 'alto del ladrillo')) valid = false;
    if (!validarNumeroNegativo(document.getElementById('junta').value, 'Junta', 'la junta')) valid = false;
    
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
    let v = parseFloat(valor);
    if (isNaN(v)) return 0;
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
                <input type="number" step="any" id="anchoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 1.0">
                <div class="error-message" id="errorAnchoVano${contadorVanos}"></div>
            </div>
            <div class="col-md-5">
                <label>📏 Alto del vano</label>
                <input type="number" step="any" id="altoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 2.0">
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
}

function eliminarVano(id) { 
    document.getElementById(`vano${id}`)?.remove(); 
}

// ==================== CÁLCULO PRINCIPAL ====================

async function calcular() {
    limpiarErrores();
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'none';
    
    if (!validarTodosLosCampos()) { 
        mostrarErrorGeneral('Corrige los errores marcados en rojo'); 
        return; 
    }
    
    // Recoger datos
    const largoPared = parseFloat(document.getElementById('largoPared').value);
    const altoPared = parseFloat(document.getElementById('altoPared').value);
    const unidadPared = document.getElementById('unidadPared').value;
    const largoLadrillo = parseFloat(document.getElementById('largoLadrillo').value);
    const altoLadrillo = parseFloat(document.getElementById('altoLadrillo').value);
    const junta = parseFloat(document.getElementById('junta').value);
    const unidadLadrillo = document.getElementById('unidadLadrillo').value;
    const unidadJunta = document.getElementById('unidadJunta').value;
    
    // Recoger vanos
    let vanos = [];
    document.querySelectorAll('.vano').forEach(vano => {
        const anchoInput = vano.querySelector('input[id^="anchoVano"]');
        const altoInput = vano.querySelector('input[id^="altoVano"]');
        const unidadSelect = vano.querySelector('select[id^="unidadVano"]');
        
        if (anchoInput && altoInput && anchoInput.value && altoInput.value) {
            vanos.push({
                ancho: parseFloat(anchoInput.value),
                alto: parseFloat(altoInput.value),
                unidad: unidadSelect ? unidadSelect.value : 'm'
            });
        }
    });
    
    // Mostrar loading
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
        <div class="resultado-item" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 15px; border-radius: 16px; text-align: center; color: white;">
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
                    <div class="margen-card margen-5" style="border: 2px solid #3b82f6; background: #eff6ff; border-radius: 16px; padding: 15px; text-align: center;">
                        <strong style="color: #1e293b;">Margen 5%</strong>
                        <div class="margen-cantidad" style="font-size: 1.5rem; font-weight: 800;">${datos.totalConMargen5.toLocaleString()}</div>
                        <small style="color: #64748b;">+${(datos.totalConMargen5 - datos.totalLadrillos).toLocaleString()} unidades</small>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="margen-card margen-10" style="border: 2px solid #10b981; background: #ecfdf5; border-radius: 16px; padding: 15px; text-align: center;">
                        <strong style="color: #1e293b;">Margen 10%</strong>
                        <div class="margen-cantidad" style="font-size: 1.5rem; font-weight: 800;">${datos.totalConMargen10.toLocaleString()}</div>
                        <small style="color: #64748b;">+${(datos.totalConMargen10 - datos.totalLadrillos).toLocaleString()} unidades</small>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="margen-card margen-15" style="border: 2px solid #f59e0b; background: #fef3c7; border-radius: 16px; padding: 15px; text-align: center;">
                        <strong style="color: #1e293b;">Margen 15%</strong>
                        <div class="margen-cantidad" style="font-size: 1.5rem; font-weight: 800;">${datos.totalConMargen15.toLocaleString()}</div>
                        <small style="color: #64748b;">+${(datos.totalConMargen15 - datos.totalLadrillos).toLocaleString()} unidades</small>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Recomendación -->
        <div class="recomendacion-container" style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 20px; padding: 20px; margin: 15px 0; text-align: center;">
            <div class="recomendacion-header" style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px;">
                <i class="fas fa-star-of-life"></i>
                <strong>RECOMENDACIÓN INTELIGENTE</strong>
                <i class="fas fa-robot"></i>
            </div>
            <div>
                <span class="badge-recomendado" style="background: #f59e0b; color: white; padding: 5px 15px; border-radius: 50px; font-weight: 800;">${datos.margenRecomendado}%</span>
                <strong style="font-size: 1.3rem; margin-left: 10px;">${datos.margenRecomendado === 5 ? datos.totalConMargen5.toLocaleString() : datos.totalConMargen10.toLocaleString()} ladrillos</strong>
            </div>
            <small style="display: block; margin-top: 10px; color: #78350f;">${datos.totalLadrillos < 100 ? 'Proyecto pequeño, se recomienda mayor margen' : 'Margen estándar recomendado'}</small>
        </div>
        
        <!-- Detalles técnicos -->
        <div class="resultado-detalles" style="background: white; border-radius: 16px; padding: 20px; margin: 15px 0;">
            <h6 style="margin-bottom: 15px; font-weight: 700;"><i class="fas fa-info-circle"></i> Detalles del cálculo</h6>
            <p style="margin: 8px 0; display: flex; align-items: center; gap: 10px;"><i class="fas fa-vector-square"></i> <strong>Área total de la pared:</strong> ${datos.areaPared} m²</p>
            <p style="margin: 8px 0; display: flex; align-items: center; gap: 10px;"><i class="fas fa-door-open"></i> <strong>Área de vanos:</strong> ${datos.areaVanos} m²</p>
            <p style="margin: 8px 0; display: flex; align-items: center; gap: 10px;"><i class="fas fa-chart-line"></i> <strong>Área neta a cubrir:</strong> ${datos.areaNeta} m²</p>
            <p style="margin: 8px 0; display: flex; align-items: center; gap: 10px;"><i class="fas fa-fill-drip"></i> <strong>Volumen estimado de mortero:</strong> ${datos.volumenMortero} m³</p>
            <p style="margin: 8px 0; display: flex; align-items: center; gap: 10px;"><i class="fas fa-chart-simple"></i> <strong>Ladrillos por m²:</strong> ${datos.ladrillosPorM2}</p>
        </div>
        
        <!-- Consejo profesional -->
        <div class="consejo-profesional" style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; border-radius: 12px;">
            <i class="fas fa-tools"></i>
            <strong>💡 Consejo profesional:</strong> Siempre compra un poco más de material. El desperdicio puede deberse a cortes, ladrillos rotos, esquinas, o errores de cálculo. ¡Mejor que sobre a que falte!
        </div>
    `;
    
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', function() {
            const val = parseFloat(this.value);
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
                    else if (isNaN(val)) errDiv.textContent = "⚠️ Número inválido";
                    else if (val < 0) errDiv.textContent = "❌ No puede ser negativo";
                    else if (val === 0) errDiv.textContent = "⚠️ Debe ser mayor a cero";
                    else errDiv.textContent = "";
                }
            }
        });
    });
    
    setTimeout(() => { 
        if (!document.querySelector('.vano')) agregarVano(); 
    }, 100);
});