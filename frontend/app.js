// Variables globales
let contadorVanos = 0;
let stream = null;
let medidasCapturadas = { ancho: 0, alto: 0 };
let animationFrameId = null;
let modoCalibracion = false;
let factorEscala = null;
let puntosCalibracion = [];

// ==================== FUNCIÓN PARA NORMALIZAR DECIMALES ====================

function normalizarDecimal(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    let normalizado = valor.toString().replace(/,/g, '.');
    normalizado = normalizado.trim();
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? null : numero;
}

// ==================== CONVERSIÓN DE UNIDADES (CORREGIDA) ====================

function convertirAMetros(valor, unidad) {
    let v = normalizarDecimal(valor);
    if (v === null || isNaN(v)) return 0;
    
    switch (unidad) {
        case 'm': return v;
        case 'cm': return v / 100;
        case 'in': return v * 0.0254;
        case 'mm': return v / 1000;
        default: return v;
    }
}

// Función específica para junta
function convertirJuntaAMetros(valor, unidad) {
    let v = normalizarDecimal(valor);
    if (v === null || isNaN(v)) return 0;
    
    switch (unidad) {
        case 'mm': return v / 1000;
        case 'cm': return v / 100;
        case 'in': return v * 0.0254;
        case 'm': return v;
        default: return v;
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
            iniciarDeteccionReal();
        };
        
    } catch (error) {
        console.error('Error:', error);
        mostrarErrorGeneral('No se pudo acceder a la cámara. Verifica los permisos.');
    }
}

function iniciarDeteccionReal() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    let medicionEstable = false;
    let contadorEstable = 0;
    let ultimaMedicion = { ancho: 0, alto: 0 };
    
    function detectarBordesYMedir() {
        if (video.readyState === 4 && video.videoWidth > 0) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const bordes = detectarBordesSobel(ctx, canvas.width, canvas.height);
            const regionPared = encontrarRegionPared(bordes, canvas.width, canvas.height);
            
            if (regionPared) {
                let anchoM = 0, altoM = 0;
                
                if (factorEscala) {
                    anchoM = (regionPared.ancho / canvas.width) * factorEscala;
                    altoM = (regionPared.alto / canvas.height) * factorEscala;
                } else {
                    const distanciaEstimada = 1.5;
                    const anguloHorizontal = 60, anguloVertical = 45;
                    anchoM = 2 * distanciaEstimada * Math.tan((anguloHorizontal * Math.PI / 180) / 2) * (regionPared.ancho / canvas.width);
                    altoM = 2 * distanciaEstimada * Math.tan((anguloVertical * Math.PI / 180) / 2) * (regionPared.alto / canvas.height);
                }
                
                anchoM = Math.min(Math.max(anchoM, 0.5), 15);
                altoM = Math.min(Math.max(altoM, 0.5), 5);
                
                if (Math.abs(ultimaMedicion.ancho - anchoM) < 0.1 && Math.abs(ultimaMedicion.alto - altoM) < 0.05) {
                    contadorEstable++;
                    if (contadorEstable > 10 && !medicionEstable) {
                        medicionEstable = true;
                        medidasCapturadas.ancho = anchoM;
                        medidasCapturadas.alto = altoM;
                        mostrarToast("✅ Medición estabilizada");
                    }
                } else {
                    contadorEstable = 0;
                    medicionEstable = false;
                }
                
                ultimaMedicion = { ancho: anchoM, alto: altoM };
                
                if (medicionEstable) {
                    document.getElementById('medidaAncho').innerHTML = `${anchoM.toFixed(2).replace('.', ',')} m`;
                    document.getElementById('medidaAlto').innerHTML = `${altoM.toFixed(2).replace('.', ',')} m`;
                    document.getElementById('medidaAncho').style.color = '#4ade80';
                    document.getElementById('medidaAlto').style.color = '#4ade80';
                } else {
                    document.getElementById('medidaAncho').innerHTML = `${anchoM.toFixed(2).replace('.', ',')} m`;
                    document.getElementById('medidaAlto').innerHTML = `${altoM.toFixed(2).replace('.', ',')} m`;
                    document.getElementById('medidaAncho').style.color = '#f59e0b';
                    document.getElementById('medidaAlto').style.color = '#f59e0b';
                }
                
                dibujarOverlayPared(ctx, regionPared, anchoM, altoM, medicionEstable);
            } else {
                dibujarGuiaMedicion(ctx, canvas.width, canvas.height);
            }
        }
        animationFrameId = requestAnimationFrame(detectarBordesYMedir);
    }
    
    detectarBordesYMedir();
}

function detectarBordesSobel(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const bordes = new Array(width * height).fill(0);
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const brillo = (data[idx] + data[idx+1] + data[idx+2]) / 3;
            
            const idxIzq = (y * width + (x - 1)) * 4;
            const brilloIzq = (data[idxIzq] + data[idxIzq+1] + data[idxIzq+2]) / 3;
            const gradX = Math.abs(brillo - brilloIzq);
            
            const idxArr = ((y - 1) * width + x) * 4;
            const brilloArr = (data[idxArr] + data[idxArr+1] + data[idxArr+2]) / 3;
            const gradY = Math.abs(brillo - brilloArr);
            
            const gradiente = Math.sqrt(gradX * gradX + gradY * gradY);
            
            if (gradiente > 35) {
                bordes[y * width + x] = gradiente;
            }
        }
    }
    
    return bordes;
}

function encontrarRegionPared(bordes, width, height) {
    let mejorRegion = null;
    let maxArea = 0;
    let visitados = new Array(width * height).fill(false);
    
    for (let y = 0; y < height; y += 15) {
        for (let x = 0; x < width; x += 15) {
            const idx = y * width + x;
            if (!visitados[idx] && bordes[idx] > 0) {
                let minX = width, maxX = 0, minY = height, maxY = 0;
                let area = 0;
                let queue = [{x, y}];
                visitados[idx] = true;
                
                while (queue.length > 0) {
                    const p = queue.shift();
                    area++;
                    minX = Math.min(minX, p.x);
                    maxX = Math.max(maxX, p.x);
                    minY = Math.min(minY, p.y);
                    maxY = Math.max(maxY, p.y);
                    
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const nx = p.x + dx;
                            const ny = p.y + dy;
                            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                                const nidx = ny * width + nx;
                                if (!visitados[nidx] && bordes[nidx] > 0) {
                                    visitados[nidx] = true;
                                    queue.push({x: nx, y: ny});
                                }
                            }
                        }
                    }
                }
                
                if (area > maxArea && area > 500) {
                    maxArea = area;
                    mejorRegion = {
                        x: minX, y: minY,
                        ancho: maxX - minX,
                        alto: maxY - minY,
                        centroX: (minX + maxX) / 2,
                        centroY: (minY + maxY) / 2
                    };
                }
            }
        }
    }
    
    return mejorRegion;
}

function dibujarOverlayPared(ctx, region, anchoM, altoM, estable) {
    const color = estable ? '#10b981' : '#f59e0b';
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.strokeRect(region.x, region.y, region.ancho, region.alto);
    
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(region.x + 10, region.y + 10, 190, 65);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(`📐 Ancho: ${anchoM.toFixed(2)} m`, region.x + 20, region.y + 35);
    ctx.fillText(`📏 Alto: ${altoM.toFixed(2)} m`, region.x + 20, region.y + 60);
}

function dibujarGuiaMedicion(ctx, width, height) {
    const guiaX = width * 0.15;
    const guiaY = height * 0.2;
    const guiaW = width * 0.7;
    const guiaH = height * 0.5;
    
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 15]);
    ctx.strokeRect(guiaX, guiaY, guiaW, guiaH);
    ctx.setLineDash([]);
    
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(guiaX + 10, guiaY + 10, 280, 80);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 12px Arial';
    ctx.fillText('🎯 ALINEA LA PARED', guiaX + 20, guiaY + 35);
    ctx.fillStyle = 'white';
    ctx.font = '11px Arial';
    ctx.fillText('Mueve la cámara hasta que la', guiaX + 20, guiaY + 58);
    ctx.fillText('pared quede dentro del rectángulo', guiaX + 20, guiaY + 78);
    
    const rulerY = height - 50;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, rulerY - 15, width, 55);
    
    for (let x = 0; x < width; x += 50) {
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(x, rulerY - 5);
        ctx.lineTo(x, rulerY + 5);
        ctx.stroke();
        const metros = (x / width) * 3;
        ctx.fillStyle = 'white';
        ctx.font = '9px Arial';
        ctx.fillText(`${metros.toFixed(1)}m`, x - 10, rulerY + 22);
    }
}

function iniciarCalibracion() {
    modoCalibracion = true;
    puntosCalibracion = [];
    const canvas = document.getElementById('canvas');
    
    mostrarToast("📱 Toca el extremo IZQUIERDO del objeto de referencia");
    
    function capturarPunto(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let x, y;
        if (e.touches) {
            x = (e.touches[0].clientX - rect.left) * scaleX;
            y = (e.touches[0].clientY - rect.top) * scaleY;
            e.preventDefault();
        } else {
            x = (e.clientX - rect.left) * scaleX;
            y = (e.clientY - rect.top) * scaleY;
        }
        
        puntosCalibracion.push({ x, y });
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();
        
        if (puntosCalibracion.length === 1) {
            mostrarToast("📱 Ahora toca el extremo DERECHO del objeto");
        } else if (puntosCalibracion.length === 2) {
            const distanciaPx = Math.abs(puntosCalibracion[1].x - puntosCalibracion[0].x);
            
            const tamañoReal = prompt(
                "🔧 CALIBRACIÓN\n\n" +
                "¿Cuál es el tamaño REAL del objeto en METROS?\n\n" +
                "Ejemplos:\n• Hoja A4: 0.297m\n• Celular: 0.15m\n• Tarjeta: 0.085m\n\n" +
                "Tamaño real (metros):"
            );
            
            const tamaño = normalizarDecimal(tamañoReal);
            if (tamaño !== null && tamaño > 0) {
                factorEscala = tamaño / distanciaPx;
                mostrarToast(`✅ Calibrado! 1px = ${(factorEscala * 100).toFixed(2)} cm`);
                canvas.removeEventListener('click', capturarPunto);
                canvas.removeEventListener('touchstart', capturarPunto);
                modoCalibracion = false;
            } else {
                mostrarErrorGeneral('Calibración cancelada');
                puntosCalibracion = [];
            }
        }
    }
    
    canvas.addEventListener('click', capturarPunto);
    canvas.addEventListener('touchstart', capturarPunto);
}

function capturarMedida(tipo) {
    if (tipo === 'auto') {
        if (medidasCapturadas.ancho > 0 && medidasCapturadas.alto > 0) {
            aplicarMedidas();
        } else {
            mostrarErrorGeneral('Esperando detección automática. Mantén la cámara estable.');
        }
    } 
    else if (tipo === 'calibrar') {
        iniciarCalibracion();
    }
    else if (tipo === 'ancho') {
        const valor = prompt("📏 INGRESAR ANCHO en METROS:\nEjemplo: 5.5 o 5,5");
        const ancho = normalizarDecimal(valor);
        if (ancho !== null && ancho > 0 && ancho < 50) {
            medidasCapturadas.ancho = ancho;
            document.getElementById('medidaAncho').innerHTML = `${ancho.toFixed(2).replace('.', ',')} m`;
            mostrarToast(`✅ Ancho: ${ancho.toFixed(2)} m`);
        } else {
            mostrarErrorGeneral('Valor inválido');
        }
    }
    else if (tipo === 'alto') {
        const valor = prompt("📏 INGRESAR ALTO en METROS:\nEjemplo: 2.4 o 2,4");
        const alto = normalizarDecimal(valor);
        if (alto !== null && alto > 0 && alto < 20) {
            medidasCapturadas.alto = alto;
            document.getElementById('medidaAlto').innerHTML = `${alto.toFixed(2).replace('.', ',')} m`;
            mostrarToast(`✅ Alto: ${alto.toFixed(2)} m`);
        } else {
            mostrarErrorGeneral('Valor inválido');
        }
    }
    
    if (medidasCapturadas.ancho > 0 && medidasCapturadas.alto > 0) {
        setTimeout(() => {
            if (confirm('¿Aplicar estas medidas al cálculo?')) aplicarMedidas();
        }, 500);
    }
}

function reiniciarMedicion() {
    medidasCapturadas = { ancho: 0, alto: 0 };
    factorEscala = null;
    document.getElementById('medidaAncho').innerHTML = '-- m';
    document.getElementById('medidaAlto').innerHTML = '-- m';
    document.getElementById('medidaAncho').style.color = 'white';
    document.getElementById('medidaAlto').style.color = 'white';
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
    
    mostrarToast('✅ Medidas aplicadas');
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
    
    let numero = normalizarDecimal(valor);
    
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
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
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
                <input type="text" id="anchoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 1.0 o 1,0">
                <div class="error-message" id="errorAnchoVano${contadorVanos}"></div>
            </div>
            <div class="col-md-5">
                <label>📏 Alto del vano</label>
                <input type="text" id="altoVano${contadorVanos}" class="form-control-modern" placeholder="Ej: 2.0 o 2,0">
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

// ==================== CÁLCULO PRINCIPAL (CORREGIDO) ====================

function calcular() {
    limpiarErrores();
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.style.display = 'none';
    
    if (!validarTodosLosCampos()) { 
        mostrarErrorGeneral('Corrige los errores marcados en rojo'); 
        return; 
    }
    
    // ==================== PARED ====================
    const largoParedRaw = document.getElementById('largoPared').value;
    const altoParedRaw = document.getElementById('altoPared').value;
    const unidadPared = document.getElementById('unidadPared').value;
    
    const largoPared = normalizarDecimal(largoParedRaw);
    const altoPared = normalizarDecimal(altoParedRaw);
    
    if (largoPared === null || altoPared === null) {
        mostrarErrorGeneral('Medidas de pared inválidas');
        return;
    }
    
    const largoParedM = convertirAMetros(largoPared, unidadPared);
    const altoParedM = convertirAMetros(altoPared, unidadPared);
    const areaPared = largoParedM * altoParedM;
    
    // ==================== VANOS (CORREGIDO) ====================
    let areaVanos = 0;
    let vanosInfo = [];
    let vanosConvertidos = [];
    
    document.querySelectorAll('.vano').forEach((vano, index) => {
        const anchoInput = vano.querySelector('input[id^="anchoVano"]');
        const altoInput = vano.querySelector('input[id^="altoVano"]');
        const unidadSelect = vano.querySelector('select[id^="unidadVano"]');
        
        if (anchoInput && altoInput && anchoInput.value && altoInput.value) {
            const anchoRaw = anchoInput.value;
            const altoRaw = altoInput.value;
            const unidadVano = unidadSelect ? unidadSelect.value : 'cm';
            
            const ancho = normalizarDecimal(anchoRaw);
            const alto = normalizarDecimal(altoRaw);
            
            if (ancho !== null && alto !== null && ancho > 0 && alto > 0) {
                // CONVERSIÓN CORRECTA a metros
                const anchoM = convertirAMetros(ancho, unidadVano);
                const altoM = convertirAMetros(alto, unidadVano);
                const areaVano = anchoM * altoM;
                
                areaVanos += areaVano;
                
                vanosInfo.push({
                    ancho: ancho,
                    alto: alto,
                    unidad: unidadVano,
                    anchoM: anchoM.toFixed(4),
                    altoM: altoM.toFixed(4),
                    areaM2: areaVano.toFixed(4)
                });
                
                vanosConvertidos.push({
                    ancho: anchoM,
                    alto: altoM,
                    unidad: 'm'
                });
            }
        }
    });
    
    // ==================== LADRILLO ====================
    const largoLadrilloRaw = document.getElementById('largoLadrillo').value;
    const altoLadrilloRaw = document.getElementById('altoLadrillo').value;
    const juntaRaw = document.getElementById('junta').value;
    const unidadLadrillo = document.getElementById('unidadLadrillo').value;
    const unidadJunta = document.getElementById('unidadJunta').value;
    
    const largoLadrillo = normalizarDecimal(largoLadrilloRaw);
    const altoLadrillo = normalizarDecimal(altoLadrilloRaw);
    const junta = normalizarDecimal(juntaRaw);
    
    if (largoLadrillo === null || altoLadrillo === null) {
        mostrarErrorGeneral('Medidas de ladrillo inválidas');
        return;
    }
    
    const L = convertirAMetros(largoLadrillo, unidadLadrillo);
    const H = convertirAMetros(altoLadrillo, unidadLadrillo);
    const J = convertirJuntaAMetros(junta || 0, unidadJunta);
    
    const areaLadrilloConJunta = (L + J) * (H + J);
    
    if (areaLadrilloConJunta <= 0) {
        mostrarErrorGeneral('El área del ladrillo es demasiado pequeña');
        return;
    }
    
    // ==================== CÁLCULOS FINALES ====================
    const areaNeta = Math.max(0, areaPared - areaVanos);
    const cantidadBase = Math.ceil(areaNeta / areaLadrilloConJunta);
    const cantidad5 = Math.ceil(cantidadBase * 1.05);
    const cantidad10 = Math.ceil(cantidadBase * 1.10);
    const cantidad15 = Math.ceil(cantidadBase * 1.15);
    const volumenMortero = areaNeta * 0.02;
    const ladrillosPorM2 = (1 / areaLadrilloConJunta).toFixed(2);
    
    // Recomendación de margen
    let margenRecomendado = 5;
    if (cantidadBase < 100) margenRecomendado = 10;
    if (areaPared > 30) margenRecomendado = 8;
    if (areaVanos > 5) margenRecomendado = 8;
    
    const cantidadRecomendada = margenRecomendado === 5 ? cantidad5 : cantidad10;
    
    // ==================== MOSTRAR RESULTADOS ====================
    resultadoDiv.style.display = 'block';
    resultadoDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: #059669;"><i class="fas fa-chart-bar"></i> Resultados del Cálculo</h4>
        </div>
        
        <!-- Cantidad base -->
        <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); padding: 15px; border-radius: 16px; text-align: center; color: white;">
            <i class="fas fa-calculator" style="font-size: 1.5rem;"></i>
            <strong style="display: block; font-size: 0.9rem;">Cantidad base (sin desperdicio)</strong>
            <span style="font-size: 2rem; font-weight: 800;">${cantidadBase.toLocaleString()}</span>
            <span style="display: block; font-size: 0.8rem;">unidades</span>
        </div>
        
        <!-- Márgenes -->
        <div style="margin: 20px 0;">
            <h5 style="color: #1e293b;"><i class="fas fa-percent"></i> Opciones con margen de desperdicio</h5>
            <div class="row g-3">
                <div class="col-4"><div style="border:2px solid #3b82f6; background:#eff6ff; border-radius:16px; padding:10px; text-align:center;"><strong>5%</strong><div style="font-size:1.3rem; font-weight:800;">${cantidad5.toLocaleString()}</div><small>+${(cantidad5 - cantidadBase).toLocaleString()}</small></div></div>
                <div class="col-4"><div style="border:2px solid #10b981; background:#ecfdf5; border-radius:16px; padding:10px; text-align:center;"><strong>10%</strong><div style="font-size:1.3rem; font-weight:800;">${cantidad10.toLocaleString()}</div><small>+${(cantidad10 - cantidadBase).toLocaleString()}</small></div></div>
                <div class="col-4"><div style="border:2px solid #f59e0b; background:#fef3c7; border-radius:16px; padding:10px; text-align:center;"><strong>15%</strong><div style="font-size:1.3rem; font-weight:800;">${cantidad15.toLocaleString()}</div><small>+${(cantidad15 - cantidadBase).toLocaleString()}</small></div></div>
            </div>
        </div>
        
        <!-- Recomendación -->
        <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); border-radius: 20px; padding: 15px; margin: 15px 0; text-align: center;">
            <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <i class="fas fa-star-of-life"></i>
                <strong>RECOMENDACIÓN INTELIGENTE</strong>
                <i class="fas fa-robot"></i>
            </div>
            <div style="margin-top: 10px;">
                <span style="background: #f59e0b; color: white; padding: 5px 15px; border-radius: 50px; font-weight: 800;">${margenRecomendado}%</span>
                <strong style="font-size: 1.3rem; margin-left: 10px;">${cantidadRecomendada.toLocaleString()} ladrillos</strong>
            </div>
            <small style="display: block; margin-top: 10px; color: #78350f;">${cantidadBase < 100 ? 'Proyecto pequeño, se recomienda mayor margen' : 'Margen estándar recomendado'}</small>
        </div>
        
        <!-- Detalles del cálculo -->
        <div style="background: white; border-radius: 16px; padding: 15px; margin: 15px 0;">
            <h6 style="margin-bottom: 10px;"><i class="fas fa-info-circle"></i> Detalles del cálculo</h6>
            <p><i class="fas fa-vector-square"></i> <strong>Área total de la pared:</strong> ${areaPared.toFixed(2)} m²</p>
            <p><i class="fas fa-door-open"></i> <strong>Área de vanos:</strong> ${areaVanos.toFixed(4)} m²</p>
            ${vanosInfo.length > 0 ? `<p><i class="fas fa-door-closed"></i> <strong>Vanos restados:</strong> ${vanosInfo.length} (${vanosInfo.map(v => `${v.ancho}×${v.alto} ${v.unidad} = ${v.areaM2} m²`).join(', ')})</p>` : '<p><i class="fas fa-door-closed"></i> <strong>Vanos restados:</strong> 0</p>'}
            <p><i class="fas fa-chart-line"></i> <strong>Área neta a cubrir:</strong> ${areaNeta.toFixed(2)} m²</p>
            <p><i class="fas fa-fill-drip"></i> <strong>Volumen estimado de mortero:</strong> ${volumenMortero.toFixed(3)} m³</p>
            <p><i class="fas fa-chart-simple"></i> <strong>Ladrillos por m²:</strong> ${ladrillosPorM2}</p>
            <p><i class="fas fa-cube"></i> <strong>Tamaño ladrillo + junta:</strong> ${((L+J)*100).toFixed(1)} cm × ${((H+J)*100).toFixed(1)} cm</p>
        </div>
        
        <!-- Consejo profesional -->
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; border-radius: 12px;">
            <i class="fas fa-tools"></i>
            <strong>💡 Consejo profesional:</strong> Siempre compra un poco más de material. El desperdicio puede deberse a cortes, ladrillos rotos, esquinas, o errores de cálculo. ¡Mejor que sobre a que falte!
        </div>
    `;
    
    resultadoDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== INICIALIZACIÓN ====================

function normalizarTodosLosInputs() {
    document.querySelectorAll('input.form-control-modern, input[type="number"]').forEach(input => {
        if (input.type === 'number') input.type = 'text';
        input.addEventListener('blur', function() {
            const num = normalizarDecimal(this.value);
            if (num !== null && !isNaN(num)) {
                this.value = num.toString().replace('.', ',');
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    normalizarTodosLosInputs();
    
    document.querySelectorAll('input.form-control-modern').forEach(input => {
        input.addEventListener('input', function() {
            const val = normalizarDecimal(this.value);
            let errId = { largoPared:'errorLargoPared', altoPared:'errorAltoPared', largoLadrillo:'errorLargoLadrillo', altoLadrillo:'errorAltoLadrillo', junta:'errorJunta' }[this.id];
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
    
    setTimeout(() => { if (!document.querySelector('.vano')) agregarVano(); }, 100);
});