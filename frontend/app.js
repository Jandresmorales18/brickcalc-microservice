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
    
    // ==================== VANOS ====================
    let areaVanos = 0;
    let vanosInfo = [];
    
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
                const anchoM = convertirAMetros(ancho, unidadVano);
                const altoM = convertirAMetros(alto, unidadVano);
                const areaVano = anchoM * altoM;
                
                areaVanos += areaVano;
                
                vanosInfo.push({
                    ancho: ancho,
                    alto: alto,
                    unidad: unidadVano,
                    areaM2: areaVano.toFixed(6)
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
    
    // ==================== CÁLCULOS FINALES (CORREGIDOS) ====================
    const areaNeta = Math.max(0, areaPared - areaVanos);
    const cantidadBase = Math.ceil(areaNeta / areaLadrilloConJunta);
    
    // ✅ PORCENTAJES CORRECTOS (redondeo hacia arriba como es estándar)
    const cantidad5 = Math.ceil(cantidadBase * 1.05);   // 8,265 * 1.05 = 8,678.25 → 8,679
    const cantidad8 = Math.ceil(cantidadBase * 1.08);   // 8,265 * 1.08 = 8,926.2 → 8,927
    const cantidad10 = Math.ceil(cantidadBase * 1.10);  // 8,265 * 1.10 = 9,091.5 → 9,092
    const cantidad15 = Math.ceil(cantidadBase * 1.15);  // 8,265 * 1.15 = 9,504.75 → 9,505
    
    const volumenMortero = areaNeta * 0.02;
    const ladrillosPorM2 = (1 / areaLadrilloConJunta).toFixed(2);
    
    // ==================== RECOMENDACIÓN INTELIGENTE (CORREGIDA) ====================
    let margenRecomendado = 5;
    let cantidadRecomendada = cantidad5;
    let razonRecomendacion = "Margen estándar para proyectos regulares";
    
    if (cantidadBase < 100) {
        margenRecomendado = 10;
        cantidadRecomendada = cantidad10;
        razonRecomendacion = "Proyecto pequeño, se recomienda mayor margen por desperdicio";
    } else if (areaPared > 30) {
        margenRecomendado = 8;
        cantidadRecomendada = cantidad8;
        razonRecomendacion = "Área grande, se recomienda margen intermedio";
    } else if (areaVanos > 5) {
        margenRecomendado = 8;
        cantidadRecomendada = cantidad8;
        razonRecomendacion = "Múltiples vanos, se recomienda margen intermedio";
    }
    
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
                <div class="col-4"><div style="border:2px solid #8b5cf6; background:#f3e8ff; border-radius:16px; padding:10px; text-align:center;"><strong>8%</strong><div style="font-size:1.3rem; font-weight:800;">${cantidad8.toLocaleString()}</div><small>+${(cantidad8 - cantidadBase).toLocaleString()}</small></div></div>
                <div class="col-4"><div style="border:2px solid #10b981; background:#ecfdf5; border-radius:16px; padding:10px; text-align:center;"><strong>10%</strong><div style="font-size:1.3rem; font-weight:800;">${cantidad10.toLocaleString()}</div><small>+${(cantidad10 - cantidadBase).toLocaleString()}</small></div></div>
            </div>
            <div class="row g-3 mt-2">
                <div class="col-4 offset-4"><div style="border:2px solid #f59e0b; background:#fef3c7; border-radius:16px; padding:10px; text-align:center;"><strong>15%</strong><div style="font-size:1.3rem; font-weight:800;">${cantidad15.toLocaleString()}</div><small>+${(cantidad15 - cantidadBase).toLocaleString()}</small></div></div>
            </div>
        </div>
        
        <!-- Recomendación INTELIGENTE CORREGIDA -->
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
            <small style="display: block; margin-top: 10px; color: #78350f;">${razonRecomendacion}</small>
        </div>
        
        <!-- Detalles del cálculo -->
        <div style="background: white; border-radius: 16px; padding: 15px; margin: 15px 0;">
            <h6 style="margin-bottom: 10px;"><i class="fas fa-info-circle"></i> Detalles del cálculo</h6>
            <p><i class="fas fa-vector-square"></i> <strong>Área total de la pared:</strong> ${areaPared.toFixed(2)} m²</p>
            <p><i class="fas fa-door-open"></i> <strong>Área de vanos:</strong> ${areaVanos.toFixed(6)} m²</p>
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