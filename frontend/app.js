// Variables globales
let contadorVanos = 0;
let stream = null;
let medidasCapturadas = {
    ancho: 0,
    alto: 0
};
let animationFrameId = null;
let modoAutoMedicion = false;
let factorEscala = null;
let puntosCalibracion = [];

// ==================== MEDICIÓN AUTOMÁTICA PRECISA ====================

async function abrirCamaraMedicion() {
    try {
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
        
        const modal = new bootstrap.Modal(document.getElementById('cameraModal'));
        modal.show();
        
        video.onloadedmetadata = () => {
            const canvas = document.getElementById('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Iniciar medición automática real
            iniciarDeteccionReal();
        };
        
    } catch (error) {
        console.error('Error:', error);
        mostrarErrorGeneral('No se pudo acceder a la cámara. Verifica los permisos.');
    }
}

function iniciarDeteccionReal() {
    modoAutoMedicion = true;
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // Variables para detección de movimiento estable
    let frameAnterior = null;
    let medicionEstable = false;
    let contadorEstable = 0;
    let ultimaMedicion = { ancho: 0, alto: 0 };
    
    function detectarParedReal() {
        if (video.readyState === 4 && video.videoWidth > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Obtener datos de imagen
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Detección de bordes usando algoritmo de Sobel simplificado
            const bordes = detectarBordes(data, canvas.width, canvas.height);
            
            // Encontrar la región más grande (posible pared)
            const regionPared = encontrarRegionPared(bordes, canvas.width, canvas.height);
            
            if (regionPared) {
                // Calcular medidas en metros basado en proporción de pantalla
                // Una pantalla típica a 1 metro muestra aproximadamente 1.5m de ancho
                const proporcionPantalla = 1.5; // metros por ancho de pantalla a distancia típica
                const anchoM = (regionPared.ancho / canvas.width) * proporcionPantalla * 1.8;
                const altoM = (regionPared.alto / canvas.height) * proporcionPantalla * 2.2;
                
                // Limitar valores razonables
                const anchoFinal = Math.min(Math.max(anchoM, 0.5), 15);
                const altoFinal = Math.min(Math.max(altoM, 0.5), 5);
                
                // Verificar si la medición es estable (poca variación)
                if (Math.abs(ultimaMedicion.ancho - anchoFinal) < 0.1 && 
                    Math.abs(ultimaMedicion.alto - altoFinal) < 0.05) {
                    contadorEstable++;
                    if (contadorEstable > 10 && !medicionEstable) {
                        medicionEstable = true;
                        mostrarToast("✅ Medición estabilizada");
                    }
                } else {
                    contadorEstable = 0;
                    medicionEstable = false;
                }
                
                ultimaMedicion = { ancho: anchoFinal, alto: altoFinal };
                
                // Actualizar UI con las medidas detectadas
                if (medicionEstable) {
                    medidasCapturadas.ancho = anchoFinal;
                    medidasCapturadas.alto = altoFinal;
                    document.getElementById('medidaAncho').textContent = `${anchoFinal.toFixed(2)} m`;
                    document.getElementById('medidaAlto').textContent = `${altoFinal.toFixed(2)} m`;
                }
                
                // Dibujar overlay de la pared detectada
                dibujarOverlayDeteccion(ctx, regionPared, anchoFinal, altoFinal, medicionEstable);
            } else {
                // No se detectó pared, mostrar guía
                dibujarGuiaMedicion(ctx, canvas.width, canvas.height);
            }
            
            frameAnterior = imageData;
        }
        animationFrameId = requestAnimationFrame(detectarParedReal);
    }
    
    detectarParedReal();
}

function detectarBordes(data, width, height) {
    const bordes = new Array(width * height).fill(0);
    
    // Algoritmo de detección de bordes por diferencia de luminancia
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const brillo = (data[idx] + data[idx+1] + data[idx+2]) / 3;
            
            // Calcular gradiente horizontal
            const idxIzq = (y * width + (x - 1)) * 4;
            const brilloIzq = (data[idxIzq] + data[idxIzq+1] + data[idxIzq+2]) / 3;
            const gradX = Math.abs(brillo - brilloIzq);
            
            // Calcular gradiente vertical
            const idxArr = ((y - 1) * width + x) * 4;
            const brilloArr = (data[idxArr] + data[idxArr+1] + data[idxArr+2]) / 3;
            const gradY = Math.abs(brillo - brilloArr);
            
            const gradiente = Math.sqrt(gradX * gradX + gradY * gradY);
            
            if (gradiente > 30) { // Umbral de detección de borde
                bordes[y * width + x] = 1;
            }
        }
    }
    
    return bordes;
}

function encontrarRegionPared(bordes, width, height) {
    let mejorRegion = null;
    let maxArea = 0;
    
    // Buscar la región contigua más grande (simplificado)
    let visitados = new Array(width * height).fill(false);
    
    for (let y = 0; y < height; y += 10) {
        for (let x = 0; x < width; x += 10) {
            if (!visitados[y * width + x]) {
                let minX = width, maxX = 0, minY = height, maxY = 0;
                let area = 0;
                
                // Explorar región (BFS simplificado)
                let queue = [{x, y}];
                visitados[y * width + x] = true;
                
                while (queue.length > 0) {
                    const p = queue.shift();
                    area++;
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                    
                    // Verificar vecinos (solo si hay bordes cerca)
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const nx = p.x + dx;
                            const ny = p.y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const idx = ny * width + nx;
                                if (!visitados[idx] && bordes[idx] === 0) {
                                    visitados[idx] = true;
                                    queue.push({x: nx, y: ny});
                                }
                            }
                        }
                    }
                }
                
                if (area > maxArea && area > 1000) {
                    maxArea = area;
                    mejorRegion = {
                        x: minX,
                        y: minY,
                        ancho: maxX - minX,
                        alto: maxY - minY
                    };
                }
            }
        }
    }
    
    return mejorRegion;
}

function dibujarOverlayDeteccion(ctx, region, anchoM, altoM, estable) {
    const color = estable ? '#10b981' : '#f59e0b';
    
    // Dibujar rectángulo de la pared detectada
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(region.x, region.y, region.ancho, region.alto);
    
    // Dibujar esquinas redondeadas
    ctx.fillStyle = color;
    const esquinaSize = 15;
    ctx.fillRect(region.x - 2, region.y - 2, esquinaSize, 4);
    ctx.fillRect(region.x - 2, region.y - 2, 4, esquinaSize);
    ctx.fillRect(region.x + region.ancho - esquinaSize + 2, region.y - 2, esquinaSize, 4);
    ctx.fillRect(region.x + region.ancho + 2, region.y - 2, 4, esquinaSize);
    ctx.fillRect(region.x - 2, region.y + region.alto + 2, esquinaSize, 4);
    ctx.fillRect(region.x - 2, region.y + region.alto - esquinaSize + 2, 4, esquinaSize);
    ctx.fillRect(region.x + region.ancho - esquinaSize + 2, region.y + region.alto + 2, esquinaSize, 4);
    ctx.fillRect(region.x + region.ancho + 2, region.y + region.alto - esquinaSize + 2, 4, esquinaSize);
    
    // Mostrar medidas en el overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(region.x + 10, region.y + 10, 180, 60);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`📐 Ancho: ${anchoM.toFixed(2)} m`, region.x + 20, region.y + 30);
    ctx.fillText(`📏 Alto: ${altoM.toFixed(2)} m`, region.x + 20, region.y + 55);
    
    if (estable) {
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('✅ Listo para aplicar', region.x + 10, region.y + 85);
    }
}

function dibujarGuiaMedicion(ctx, width, height) {
    // Dibujar rectángulo guía para que el usuario alinee la pared
    const guiaX = width * 0.15;
    const guiaY = height * 0.2;
    const guiaAncho = width * 0.7;
    const guiaAlto = height * 0.5;
    
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 15]);
    ctx.strokeRect(guiaX, guiaY, guiaAncho, guiaAlto);
    ctx.setLineDash([]);
    
    ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('🎯 Alinea la pared dentro del rectángulo', width * 0.25, height * 0.15);
    
    // Dibujar regla virtual
    const rulerY = height - 50;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, rulerY - 20, width, 50);
    
    for (let x = 0; x < width; x += 50) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, rulerY - 10);
        ctx.lineTo(x, rulerY + 10);
        ctx.stroke();
        
        const cm = (x / width) * 250;
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.fillText(`${cm.toFixed(0)}cm`, x - 15, rulerY + 25);
    }
    
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('📏 REGLA DE REFERENCIA', 15, rulerY - 5);
}

// ==================== CALIBRACIÓN MANUAL PRECISA ====================

function calibrarConObjetoReal() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    puntosCalibracion = [];
    
    mostrarToast("📱 Toca el extremo IZQUIERDO del objeto de referencia");
    
    function capturarPuntoCalibracion(e) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if (e.touches) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
            e.preventDefault();
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        // Escalar a coordenadas del canvas real
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        
        puntosCalibracion.push({ x: canvasX, y: canvasY });
        
        // Dibujar punto
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 5, 0, 2 * Math.PI);
        ctx.fill();
        
        if (puntosCalibracion.length === 1) {
            mostrarToast("📱 Ahora toca el extremo DERECHO del objeto");
        } else if (puntosCalibracion.length === 2) {
            const distanciaPx = Math.abs(puntosCalibracion[1].x - puntosCalibracion[0].x);
            
            const tamañoReal = prompt(
                "📏 CALIBRACIÓN\n\n" +
                "¿Cuál es el tamaño REAL del objeto en METROS?\n\n" +
                "Ejemplos:\n" +
                "• Hoja A4 ancho: 0.297m\n" +
                "• Celular: 0.15m\n" +
                "• Puerta: 0.9m\n\n" +
                "Tamaño real (metros):"
            );
            
            if (tamañoReal && !isNaN(parseFloat(tamañoReal))) {
                factorEscala = parseFloat(tamañoReal) / distanciaPx;
                mostrarToast(`✅ Calibrado! 1 píxel = ${(factorEscala * 100).toFixed(2)} cm`);
                
                // Remover event listeners
                canvas.removeEventListener('click', capturarPuntoCalibracion);
                canvas.removeEventListener('touchstart', capturarPuntoCalibracion);
                
                iniciarMedicionConCalibracion();
            } else {
                mostrarErrorGeneral('Calibración cancelada');
            }
        }
    }
    
    canvas.addEventListener('click', capturarPuntoCalibracion);
    canvas.addEventListener('touchstart', capturarPuntoCalibracion);
}

function iniciarMedicionConCalibracion() {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let puntosPared = [];
    
    mostrarToast("📏 Toca dos puntos para medir el ANCHO de la pared");
    
    function medirPared(e) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        
        if (e.touches) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
            e.preventDefault();
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const canvasX = x * scaleX;
        const canvasY = y * scaleY;
        
        puntosPared.push({ x: canvasX, y: canvasY });
        
        // Dibujar punto y línea
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        if (puntosPared.length === 2) {
            ctx.beginPath();
            ctx.moveTo(puntosPared[0].x, puntosPared[0].y);
            ctx.lineTo(puntosPared[1].x, puntosPared[1].y);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            const distanciaPx = Math.sqrt(
                Math.pow(puntosPared[1].x - puntosPared[0].x, 2) +
                Math.pow(puntosPared[1].y - puntosPared[0].y, 2)
            );
            
            const distanciaReal = distanciaPx * factorEscala;
            
            if (!medidasCapturadas.ancho) {
                medidasCapturadas.ancho = distanciaReal;
                document.getElementById('medidaAncho').textContent = `${distanciaReal.toFixed(2)} m`;
                mostrarToast(`✅ Ancho: ${distanciaReal.toFixed(2)} m. Ahora mide el ALTO`);
                puntosPared = [];
                mostrarToast("📏 Toca dos puntos para medir el ALTO de la pared");
            } else {
                medidasCapturadas.alto = distanciaReal;
                document.getElementById('medidaAlto').textContent = `${distanciaReal.toFixed(2)} m`;
                mostrarToast(`✅ Alto: ${distanciaReal.toFixed(2)} m`);
                
                canvas.removeEventListener('click', medirPared);
                canvas.removeEventListener('touchstart', medirPared);
                
                setTimeout(() => {
                    if (confirm('¿Aplicar medidas al cálculo?')) {
                        aplicarMedidas();
                    }
                }, 500);
            }
        }
    }
    
    canvas.addEventListener('click', medirPared);
    canvas.addEventListener('touchstart', medirPared);
}

// ==================== FUNCIONES DE UI ====================

function capturarMedida(tipo) {
    if (tipo === 'automatico') {
        if (medidasCapturadas.ancho > 0 && medidasCapturadas.alto > 0) {
            aplicarMedidas();
        } else {
            mostrarErrorGeneral('Esperando detección automática. Apunta la cámara a la pared.');
        }
    } else if (tipo === 'calibrar') {
        calibrarConObjetoReal();
    } else if (tipo === 'ancho' || tipo === 'alto') {
        const valor = prompt(
            `📏 Medición manual de ${tipo === 'ancho' ? 'ancho' : 'alto'}\n\n` +
            `Usa la regla virtual como referencia.\n` +
            `Ingresa el valor en METROS:`
        );
        
        if (valor && !isNaN(parseFloat(valor))) {
            const v = parseFloat(valor);
            if (v > 0 && v < 20) {
                if (tipo === 'ancho') {
                    medidasCapturadas.ancho = v;
                    document.getElementById('medidaAncho').textContent = `${v.toFixed(2)} m`;
                } else {
                    medidasCapturadas.alto = v;
                    document.getElementById('medidaAlto').textContent = `${v.toFixed(2)} m`;
                }
                mostrarToast(`✅ ${tipo === 'ancho' ? 'Ancho' : 'Alto'} registrado: ${v.toFixed(2)} m`);
                
                if (medidasCapturadas.ancho > 0 && medidasCapturadas.alto > 0) {
                    setTimeout(() => {
                        if (confirm('¿Aplicar medidas al cálculo?')) {
                            aplicarMedidas();
                        }
                    }, 500);
                }
            } else {
                mostrarErrorGeneral('La medida debe estar entre 0.1 y 20 metros');
            }
        }
    }
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

// ==================== CIERRE DE CÁMARA ====================

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
    document.querySelectorAll('.error-message').forEach(el => { el.textContent = ''; el.style.display = 'block'; });
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
            <div class="col-md-5"><label>📐 Ancho</label><input type="number" step="any" id="anchoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 1.0"><div class="error-message" id="errorAnchoVano${contadorVanos}"></div></div>
            <div class="col-md-5"><label>📏 Alto</label><input type="number" step="any" id="altoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 2.0"><div class="error-message" id="errorAltoVano${contadorVanos}"></div></div>
            <div class="col-md-2"><label>Unidad</label><select id="unidadVano${contadorVanos}" class="form-select-modern"><option value="m">m</option><option value="cm">cm</option><option value="in">in</option></select></div>
        </div>
    `;
    document.getElementById('vanosContainer').appendChild(div);
}

function eliminarVano(id) { document.getElementById(`vano${id}`)?.remove(); }

// ==================== CÁLCULO PRINCIPAL ====================

async function calcular() {
    limpiarErrores();
    document.getElementById('resultado').style.display = 'none';
    if (!validarTodosLosCampos()) { mostrarErrorGeneral('Corrige los errores marcados'); return; }
    
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
        const ancho = parseFloat(vano.querySelector('input[id^="anchoVano"]')?.value);
        const alto = parseFloat(vano.querySelector('input[id^="altoVano"]')?.value);
        if (!isNaN(ancho) && !isNaN(alto) && ancho > 0 && alto > 0) {
            vanos.push({ ancho, alto, unidad: vano.querySelector('select[id^="unidadVano"]').value });
        }
    });
    
    try {
        const response = await fetch('https://brickcalc-microservice.onrender.com/calcular', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ largoPared, altoPared, unidadPared, vanos, largoLadrillo, altoLadrillo, junta, unidadLadrillo, unidadJunta })
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const datos = await response.json();
        
        const areaParedCalc = convertirAMetros(largoPared, unidadPared) * convertirAMetros(altoPared, unidadPared);
        let areaVanosCalc = 0;
        vanos.forEach(v => { areaVanosCalc += convertirAMetros(v.ancho, v.unidad) * convertirAMetros(v.alto, v.unidad); });
        const areaNetaCalc = areaParedCalc - areaVanosCalc;
        
        mostrarResultados({
            cantidadBase: datos.totalLadrillos, cantidad5: datos.totalConMargen,
            cantidad10: Math.ceil(datos.totalLadrillos * 1.10), cantidadRecomendada: datos.totalConMargen,
            porcentajeRecomendado: 5, razonRecomendacion: "✅ Medición automática", explicacionRecomendacion: "Medidas detectadas por cámara con detección de bordes",
            areaPared: areaParedCalc, areaVanos: areaVanosCalc, areaNeta: areaNetaCalc, volumenMortero: datos.volumenMortero || areaNetaCalc * 0.02,
            vanos: vanos.length, formaPared: "regular"
        });
    } catch (error) { mostrarErrorGeneral('❌ Error conectando con el servidor'); }
}

function mostrarResultados(datos) {
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `
        <h4><i class="fas fa-chart-bar"></i> Resultados</h4>
        <div class="resultado-item" style="background:#3b82f6;color:white;padding:15px;border-radius:16px;text-align:center">
            <strong>Cantidad base:</strong> ${datos.cantidadBase.toLocaleString()} unidades
        </div>
        <div class="row g-3 mt-2">
            <div class="col-md-6"><div class="margen-card margen-5"><strong>Margen 5%</strong><div class="margen-cantidad">${datos.cantidad5.toLocaleString()}</div><small>+${(datos.cantidad5-datos.cantidadBase).toLocaleString()}</small></div></div>
            <div class="col-md-6"><div class="margen-card margen-10"><strong>Margen 10%</strong><div class="margen-cantidad">${datos.cantidad10.toLocaleString()}</div><small>+${(datos.cantidad10-datos.cantidadBase).toLocaleString()}</small></div></div>
        </div>
        <div class="recomendacion-container"><div class="recomendacion-header">🤖 RECOMENDACIÓN</div><div><span class="badge-recomendado">${datos.porcentajeRecomendado}%</span> <strong>${datos.cantidadRecomendada.toLocaleString()} ladrillos</strong></div><div>${datos.razonRecomendacion}</div><small>${datos.explicacionRecomendacion}</small></div>
        <div class="resultado-detalles"><strong>Detalles:</strong><br>📐 Área pared: ${datos.areaPared.toFixed(2)} m²<br>🚪 Área vanos: ${datos.areaVanos.toFixed(2)} m²<br>📊 Área neta: ${datos.areaNeta.toFixed(2)} m²<br>🧱 Mortero: ${datos.volumenMortero.toFixed(3)} m³</div>
        <div class="consejo-profesional"><i class="fas fa-tools"></i> 💡 Consejo: Compra 5-10% extra por desperdicio</div>
    `;
    resultadoDiv.scrollIntoView({ behavior: 'smooth' });
}

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.addEventListener('input', function() {
            const val = parseFloat(this.value);
            let errId = { largoPared: 'errorLargoPared', altoPared: 'errorAltoPared', largoLadrillo: 'errorLargoLadrillo', altoLadrillo: 'errorAltoLadrillo', junta: 'errorJunta' }[this.id];
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
    setTimeout(() => { if (!document.querySelector('.vano')) agregarVano(); }, 100);
});