// Variables globales
let participantes = [];
let premios = [];
let ganadores = [];
let premioActual = null;
let participantesDisponibles = [];
let intentoActual = 1;
const totalIntentos = 3;
let ganadorTemporal = null; // Para almacenar el ganador temporal de los intentos "Al Agua"

// Elementos DOM
const excelFileInput = document.getElementById('excelFile');
const premioInput = document.getElementById('premioInput');
const agregarPremioBtn = document.getElementById('agregarPremioBtn');
const premiosList = document.getElementById('premiosList');
const participantCount = document.getElementById('participantCount');
const participantsList = document.getElementById('participantsList');
const sortearBtn = document.getElementById('sortearBtn');
const nuevoPremioBtn = document.getElementById('nuevoPremioBtn');
const resetBtn = document.getElementById('resetBtn');
const ganadoresContainer = document.getElementById('ganadoresContainer');
const errorAlert = document.getElementById('errorAlert');
const errorMessage = document.getElementById('errorMessage');
const successAlert = document.getElementById('successAlert');
const successMessage = document.getElementById('successMessage');
const infoAlert = document.getElementById('infoAlert');
const infoMessage = document.getElementById('infoMessage');
const intentoActualSpan = document.getElementById('intentoActual');
const estadoIntentoSpan = document.getElementById('estadoIntento');
const premioActualNombre = document.getElementById('premioActualNombre');
const marcadoresIntento = document.querySelectorAll('.intento-marcador');
const resultadoModal = document.getElementById('resultadoModal');
const modalTitulo = document.getElementById('modalTitulo');
const modalBody = document.getElementById('modalBody');
const closeModal = document.querySelector('.close-modal');
const fireworksCanvas = document.getElementById('fireworksCanvas');

// Configuración de canvas para fuegos artificiales
const ctx = fireworksCanvas.getContext('2d');
let fireworks = [];
let particles = [];
let animationId = null;

// Event Listeners
excelFileInput.addEventListener('change', handleFileUpload);
agregarPremioBtn.addEventListener('click', agregarPremio);
premioInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') agregarPremio();
});
sortearBtn.addEventListener('click', realizarSorteo);
nuevoPremioBtn.addEventListener('click', prepararNuevoPremio);
resetBtn.addEventListener('click', reiniciarTodo);
closeModal.addEventListener('click', cerrarModal);
window.addEventListener('click', function(event) {
    if (event.target === resultadoModal) {
        cerrarModal();
    }
});

// Manejar la carga del archivo Excel
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validar extensión del archivo
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
        showError('Por favor, sube un archivo Excel válido (.xlsx, .xls, .csv)');
        return;
    }
    
    // Leer el archivo Excel
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Obtener la primera hoja
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convertir a JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            
            // Validar estructura del archivo
            if (jsonData.length === 0) {
                showError('El archivo Excel está vacío');
                return;
            }
            
            // Verificar que tenga las columnas requeridas
            const firstRow = jsonData[0];
            if (!firstRow.hasOwnProperty('codpersona') || !firstRow.hasOwnProperty('datospersona')) {
                showError('El archivo debe contener las columnas "codpersona" y "datospersona"');
                return;
            }
            
            // Procesar participantes
            participantes = jsonData.map((row, index) => ({
                id: index + 1,
                codpersona: row.codpersona,
                datospersona: row.datospersona
            }));
            
            // Inicializar participantes disponibles
            participantesDisponibles = [...participantes];
            
            // Mostrar información de participantes
            mostrarParticipantes();
            showSuccess(`Se cargaron ${participantes.length} contribuyentes correctamente`);
            
            // Mostrar información sobre el siguiente paso
            showInfo('Ahora agregue los premios que desea sortear');
            
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            showError('Error al procesar el archivo. Asegúrese de que tenga el formato correcto.');
        }
    };
    
    reader.onerror = function() {
        showError('Error al leer el archivo');
    };
    
    reader.readAsArrayBuffer(file);
}

// Agregar un nuevo premio a la lista
function agregarPremio() {
    const nombrePremio = premioInput.value.trim();
    
    if (!nombrePremio) {
        showError('Por favor, ingrese un nombre para el premio');
        return;
    }
    
    // Verificar si ya existe un premio con el mismo nombre
    if (premios.some(p => p.nombre === nombrePremio)) {
        showError('Ya existe un premio con ese nombre');
        return;
    }
    
    // Crear nuevo premio
    const nuevoPremio = {
        id: premios.length + 1,
        nombre: nombrePremio,
        estado: 'pendiente', // 'pendiente' o 'sorteado'
        ganador: null
    };
    
    // Agregar a la lista de premios
    premios.push(nuevoPremio);
    
    // Limpiar el input
    premioInput.value = '';
    premioInput.focus();
    
    // Actualizar la lista de premios
    mostrarPremios();
    
    // Si es el primer premio, establecerlo como premio actual
    if (premios.length === 1) {
        seleccionarPremioActual(nuevoPremio.id);
    }
    
    showSuccess(`Premio "${nombrePremio}" agregado correctamente`);
}

// Mostrar la lista de premios
function mostrarPremios() {
    // Limpiar lista anterior
    premiosList.innerHTML = '';
    
    if (premios.length === 0) {
        premiosList.innerHTML = `
            <div class="placeholder-premios">
                <i class="fas fa-gift"></i>
                <p>No hay premios agregados. Ingrese un premio en el cuadro de texto.</p>
            </div>
        `;
        return;
    }
    
    // Mostrar cada premio
    premios.forEach(premio => {
        const premioElement = document.createElement('div');
        premioElement.className = 'premio-item';
        premioElement.dataset.id = premio.id;
        
        const estadoClass = premio.estado === 'sorteado' ? 'status-sorteado' : 'status-pendiente';
        const estadoText = premio.estado === 'sorteado' ? 'SORTEADO' : 'PENDIENTE';
        const icono = premio.estado === 'sorteado' ? 'fas fa-check-circle' : 'fas fa-gift';
        
        premioElement.innerHTML = `
            <div class="premio-item-info">
                <div class="premio-item-icon">
                    <i class="${icono}"></i>
                </div>
                <div>
                    <div class="premio-item-name">${premio.nombre}</div>
                    ${premio.ganador ? 
                        `<div class="premio-ganador-info">
                            Ganador: <strong>${premio.ganador.codpersona} - ${premio.ganador.datospersona}</strong>
                        </div>` 
                        : ''
                    }
                </div>
            </div>
            <div class="premio-item-status ${estadoClass}">${estadoText}</div>
        `;
        
        // Si el premio está pendiente, agregar evento para seleccionarlo
        if (premio.estado === 'pendiente') {
            premioElement.style.cursor = 'pointer';
            premioElement.addEventListener('click', () => seleccionarPremioActual(premio.id));
        }
        
        // Resaltar el premio actual
        if (premioActual && premio.id === premioActual.id) {
            premioElement.style.borderLeft = '5px solid #004a8f';
            premioElement.style.backgroundColor = '#f0f8ff';
        }
        
        premiosList.appendChild(premioElement);
    });
}

// Seleccionar un premio como actual para sortear
function seleccionarPremioActual(premioId) {
    const premio = premios.find(p => p.id === premioId);
    
    if (!premio) return;
    
    // Verificar que el premio no haya sido sorteado ya
    if (premio.estado === 'sorteado') {
        showError('Este premio ya ha sido sorteado. Seleccione otro premio pendiente.');
        return;
    }
    
    // Reiniciar contador de intentos
    intentoActual = 1;
    ganadorTemporal = null;
    actualizarIntentoUI();
    
    // Establecer como premio actual
    premioActual = premio;
    premioActualNombre.textContent = premioActual.nombre;
    
    // Actualizar lista de premios
    mostrarPremios();
    
    // Habilitar botón de sortear si hay participantes
    sortearBtn.disabled = participantes.length === 0;
    
    // Mostrar información
    showInfo(`Listo para sortear: <strong>${premioActual.nombre}</strong>. Presione "Realizar Intento de Sorteo"`);
}

// Actualizar la UI de los intentos
function actualizarIntentoUI() {
    intentoActualSpan.textContent = intentoActual;
    
    // Actualizar marcadores
    marcadoresIntento.forEach(marcador => {
        const intento = parseInt(marcador.dataset.intento);
        marcador.classList.remove('activo', 'completado');
        
        if (intento === intentoActual) {
            marcador.classList.add('activo');
        } else if (intento < intentoActual) {
            marcador.classList.add('completado');
        }
    });
    
    // Actualizar estado del intento
    if (intentoActual === 1 || intentoActual === 2) {
        estadoIntentoSpan.textContent = `Intento ${intentoActual} (Al Agua)`;
        estadoIntentoSpan.style.backgroundColor = "rgba(0, 74, 143, 0.2)";
    } else if (intentoActual === 3) {
        estadoIntentoSpan.textContent = "Tercer intento (Ganador válido)";
        estadoIntentoSpan.style.backgroundColor = "rgba(0, 168, 89, 0.2)";
    }
}

// Mostrar la lista de participantes
function mostrarParticipantes() {
    participantCount.textContent = `Total de contribuyentes: ${participantes.length}`;
    participantCount.innerHTML += `<br><small>Disponibles para sorteo: ${participantesDisponibles.length}</small>`;
    
    // Limpiar lista anterior
    participantsList.innerHTML = '';
    
    // Mostrar solo los primeros 10 participantes para no saturar la interfaz
    const mostrarParticipantes = participantes.slice(0, 10);
    
    mostrarParticipantes.forEach(participante => {
        const participantItem = document.createElement('div');
        participantItem.className = 'participant-item';
        
        // Verificar si el participante ya fue sorteado
        const yaSorteado = !participantesDisponibles.some(p => p.id === participante.id);
        const estilo = yaSorteado ? 'color: #999; text-decoration: line-through;' : '';
        
        participantItem.innerHTML = `
            <span style="${estilo}"><strong>${participante.codpersona}</strong></span>
            <span style="${estilo}">${participante.datospersona}</span>
            ${yaSorteado ? '<span class="participant-sorteado">✓ SORTEADO</span>' : ''}
        `;
        participantsList.appendChild(participantItem);
    });
    
    // Si hay más de 10 participantes, mostrar un mensaje
    if (participantes.length > 10) {
        const masParticipantes = document.createElement('div');
        masParticipantes.className = 'participant-item';
        masParticipantes.style.textAlign = 'center';
        masParticipantes.style.fontStyle = 'italic';
        masParticipantes.textContent = `... y ${participantes.length - 10} contribuyentes más`;
        participantsList.appendChild(masParticipantes);
    }
}

// Realizar el sorteo para el premio actual
function realizarSorteo() {
    // Validar que haya un premio seleccionado
    if (!premioActual) {
        showError('No hay un premio seleccionado. Agregue y seleccione un premio primero.');
        return;
    }
    
    // Validar que haya participantes disponibles
    if (participantesDisponibles.length === 0) {
        showError('No hay participantes disponibles para sortear. Reinicie el sorteo para comenzar de nuevo.');
        return;
    }
    
    let participanteSeleccionado;
    
    // Si es el tercer intento (ganador válido), usar el participante seleccionado en intentos anteriores
    if (intentoActual === 3 && ganadorTemporal) {
        participanteSeleccionado = ganadorTemporal;
    } else {
        // Seleccionar un participante aleatorio
        const indiceGanador = Math.floor(Math.random() * participantesDisponibles.length);
        participanteSeleccionado = participantesDisponibles[indiceGanador];
        
        // Guardar el participante seleccionado para el tercer intento
        if (intentoActual === 1 || intentoActual === 2) {
            ganadorTemporal = participanteSeleccionado;
        }
    }
    
    // Determinar si es un intento "Al Agua" o ganador válido
    const esAlAgua = intentoActual === 1 || intentoActual === 2;
    const esGanadorValido = intentoActual === 3;
    
    // Mostrar resultado en modal
    mostrarResultadoModal(participanteSeleccionado, esAlAgua, esGanadorValido);
    
    // Si es ganador válido (tercer intento), procesar el premio
    if (esGanadorValido) {
        // Marcar premio como sorteado
        premioActual.estado = 'sorteado';
        premioActual.ganador = participanteSeleccionado;
        
        // Agregar a la lista de ganadores
        ganadores.push({
            premio: premioActual.nombre,
            codpersona: participanteSeleccionado.codpersona,
            datospersona: participanteSeleccionado.datospersona,
            fecha: new Date().toLocaleString()
        });
        
        // Eliminar al ganador de la lista de disponibles
        const indiceEnDisponibles = participantesDisponibles.findIndex(p => p.id === participanteSeleccionado.id);
        if (indiceEnDisponibles !== -1) {
            participantesDisponibles.splice(indiceEnDisponibles, 1);
        }
        
        // Mostrar el ganador en la lista principal
        mostrarGanadorEnLista(premioActual);
        
        // Actualizar listas
        mostrarPremios();
        mostrarParticipantes();
        
        // Deshabilitar el botón de sortear para este premio
        sortearBtn.disabled = true;
        
        // Mostrar efectos de fuegos artificiales
        iniciarFuegosArtificiales();
        
        showSuccess(`¡Premio "${premioActual.nombre}" sorteado! Ganador: ${participanteSeleccionado.datospersona}`);
    } else {
        // Para intentos "Al Agua", solo mostrar el mensaje
        showInfo(`Intento ${intentoActual} completado (Al Agua). Siga con el siguiente intento.`);
    }
    
    // Incrementar el contador de intentos
    if (intentoActual < totalIntentos) {
        intentoActual++;
        actualizarIntentoUI();
    } else {
        // Si ya se completaron todos los intentos, deshabilitar el botón
        sortearBtn.disabled = true;
    }
}

// Mostrar resultado en modal
function mostrarResultadoModal(participante, esAlAgua, esGanadorValido) {
    // Configurar el modal según el tipo de resultado
    if (esGanadorValido) {
        modalTitulo.textContent = "¡FELICIDADES AL GANADOR!";
        modalBody.innerHTML = `
            <div class="modal-resultado">
                <div class="modal-tipo modal-ganador">
                    <i class="fas fa-trophy"></i> ¡GANADOR VÁLIDO!
                </div>
                <div class="modal-participante">
                    <div class="modal-codigo">${participante.codpersona}</div>
                    <div class="modal-nombre">${participante.datospersona}</div>
                    <div class="modal-premio">
                        <i class="fas fa-gift"></i> Premio: ${premioActual.nombre}
                    </div>
                </div>
                <div class="modal-mensaje">
                    <p>Este contribuyente ha sido seleccionado como ganador válido del premio.</p>
                    <p>¡Felicidades! Se han completado los 3 intentos de sorteo.</p>
                </div>
            </div>
        `;
    } else if (esAlAgua) {
        modalTitulo.textContent = "RESULTADO DEL INTENTO";
        modalBody.innerHTML = `
            <div class="modal-resultado">
                <div class="modal-tipo modal-al-agua">
                    <i class="fas fa-water"></i> ¡AL AGUA!
                </div>
                <div class="modal-participante">
                    <div class="modal-codigo">${participante.codpersona}</div>
                    <div class="modal-nombre">${participante.datospersona}</div>
                </div>
                <div class="modal-mensaje">
                    <p>Este intento no es válido. Es el intento número ${intentoActual} de 3.</p>
                    <p>Los dos primeros intentos son "Al Agua". El tercer intento determinará al ganador válido.</p>
                </div>
            </div>
        `;
    }
    
    // Mostrar el modal
    resultadoModal.style.display = 'block';
}

// Cerrar el modal
function cerrarModal() {
    resultadoModal.style.display = 'none';
}

// Mostrar el ganador en la lista principal
function mostrarGanadorEnLista(premio) {
    const ganadorElement = document.createElement('div');
    ganadorElement.className = 'ganador-card';
    ganadorElement.innerHTML = `
        <div class="ganador-header">
            <div class="ganador-icon">
                <i class="fas fa-trophy"></i>
            </div>
            <div>
                <h3 class="ganador-title">¡CONTRIBUYENTE GANADOR!</h3>
                <div class="ganador-premio">Premio: ${premio.nombre}</div>
            </div>
        </div>
        <div class="ganador-info">
            <div class="ganador-item">
                <span class="ganador-label">Código:</span>
                <span class="ganador-value">${premio.ganador.codpersona}</span>
            </div>
            <div class="ganador-item">
                <span class="ganador-label">Contribuyente:</span>
                <span class="ganador-value">${premio.ganador.datospersona}</span>
            </div>
            <div class="ganador-item">
                <span class="ganador-label">Fecha y hora:</span>
                <span class="ganador-value">${new Date().toLocaleString()}</span>
            </div>
        </div>
    `;
    
    // Insertar al principio del contenedor
    const placeholder = document.querySelector('.placeholder-ganadores');
    if (placeholder) {
        ganadoresContainer.removeChild(placeholder);
    }
    ganadoresContainer.insertBefore(ganadorElement, ganadoresContainer.firstChild);
}

// Preparar para un nuevo premio (siguiente premio pendiente)
function prepararNuevoPremio() {
    // Buscar el siguiente premio pendiente
    const siguientePremio = premios.find(p => p.estado === 'pendiente');
    
    if (siguientePremio) {
        seleccionarPremioActual(siguientePremio.id);
        showInfo(`Listo para sortear el siguiente premio: <strong>${siguientePremio.nombre}</strong>`);
    } else {
        showInfo('No hay más premios pendientes. Agregue nuevos premios para continuar.');
    }
}

// Reiniciar todo el sistema
function reiniciarTodo() {
    // Confirmar reinicio
    if (!confirm('¿Está seguro de reiniciar todo el sistema? Se perderán todos los datos cargados y resultados.')) {
        return;
    }
    
    // Reiniciar variables
    participantes = [];
    premios = [];
    ganadores = [];
    premioActual = null;
    participantesDisponibles = [];
    intentoActual = 1;
    ganadorTemporal = null;
    
    // Limpiar interfaz
    premiosList.innerHTML = '';
    participantsList.innerHTML = '';
    ganadoresContainer.innerHTML = `
        <div class="placeholder-ganadores">
            <i class="fas fa-trophy"></i>
            <h3>Esperando resultados del sorteo</h3>
            <p>Los ganadores aparecerán aquí después de cada sorteo</p>
        </div>
    `;
    
    // Limpiar input de archivo
    excelFileInput.value = '';
    premioInput.value = '';
    
    // Actualizar contador
    participantCount.textContent = 'No se ha cargado ningún archivo aún.';
    premioActualNombre.textContent = 'Ningún premio seleccionado';
    
    // Actualizar UI de intentos
    actualizarIntentoUI();
    
    // Deshabilitar botón de sortear
    sortearBtn.disabled = true;
    
    // Limpiar alertas
    hideAlerts();
    
    // Detener fuegos artificiales si están activos
    detenerFuegosArtificiales();
    
    // Mostrar mensaje
    showSuccess('Sistema reiniciado correctamente. Puede cargar un nuevo archivo y agregar premios.');
}

// Sistema de fuegos artificiales (sin cambios)
function iniciarFuegosArtificiales() {
    fireworksCanvas.style.display = 'block';
    fireworksCanvas.width = window.innerWidth;
    fireworksCanvas.height = window.innerHeight;
    fireworks = [];
    particles = [];
    
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            createFirework();
        }, i * 300);
    }
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    animateFireworks();
    
    setTimeout(() => {
        detenerFuegosArtificiales();
    }, 5000);
}

function detenerFuegosArtificiales() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    fireworksCanvas.style.display = 'none';
    ctx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
}

function createFirework() {
    const x = Math.random() * fireworksCanvas.width;
    const y = fireworksCanvas.height;
    const targetY = Math.random() * fireworksCanvas.height * 0.5;
    
    fireworks.push({
        x,
        y,
        targetY,
        size: 5,
        speed: 2 + Math.random() * 2,
        color: `hsl(${Math.random() * 360}, 100%, 60%)`,
        exploded: false
    });
}

function animateFireworks() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
    
    for (let i = fireworks.length - 1; i >= 0; i--) {
        const firework = fireworks[i];
        
        if (!firework.exploded) {
            firework.y -= firework.speed;
            
            ctx.beginPath();
            ctx.arc(firework.x, firework.y, firework.size, 0, Math.PI * 2);
            ctx.fillStyle = firework.color;
            ctx.fill();
            
            if (firework.y <= firework.targetY) {
                explodeFirework(firework);
                fireworks.splice(i, 1);
            }
        }
    }
    
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.05;
        particle.alpha -= 0.01;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${particle.color}, ${particle.alpha})`;
        ctx.fill();
        
        if (particle.alpha <= 0) {
            particles.splice(i, 1);
        }
    }
    
    if (fireworks.length > 0 || particles.length > 0) {
        animationId = requestAnimationFrame(animateFireworks);
    } else {
        detenerFuegosArtificiales();
    }
}

function explodeFirework(firework) {
    const particleCount = 100 + Math.random() * 50;
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        
        const tempDiv = document.createElement('div');
        tempDiv.style.color = firework.color;
        document.body.appendChild(tempDiv);
        const rgbColor = getComputedStyle(tempDiv).color;
        document.body.removeChild(tempDiv);
        
        particles.push({
            x: firework.x,
            y: firework.y,
            vx,
            vy,
            size: 1 + Math.random() * 3,
            color: rgbColor.replace('rgb', 'rgba').replace(')', ', 1)'),
            alpha: 1
        });
    }
}

// Mostrar mensaje de error
function showError(mensaje) {
    errorMessage.innerHTML = mensaje;
    errorAlert.style.display = 'block';
    successAlert.style.display = 'none';
    infoAlert.style.display = 'none';
    setTimeout(hideAlerts, 5000);
}

// Mostrar mensaje de éxito
function showSuccess(mensaje) {
    successMessage.innerHTML = mensaje;
    successAlert.style.display = 'block';
    errorAlert.style.display = 'none';
    infoAlert.style.display = 'none';
    setTimeout(hideAlerts, 5000);
}

// Mostrar mensaje informativo
function showInfo(mensaje) {
    infoMessage.innerHTML = mensaje;
    infoAlert.style.display = 'block';
    errorAlert.style.display = 'none';
    successAlert.style.display = 'none';
    setTimeout(hideAlerts, 5000);
}

// Ocultar todas las alertas
function hideAlerts() {
    errorAlert.style.display = 'none';
    successAlert.style.display = 'none';
    infoAlert.style.display = 'none';
}

// Inicializar con datos de ejemplo para demostración
function inicializarDatosEjemplo() {
    participantes = [
        { id: 1, codpersona: "CP001", datospersona: "JUAN PEREZ RAMIREZ" },
        { id: 2, codpersona: "CP002", datospersona: "MARIA GONZALEZ LOPEZ" },
        { id: 3, codpersona: "CP003", datospersona: "CARLOS RODRIGUEZ MARTINEZ" },
        { id: 4, codpersona: "CP004", datospersona: "ANA LOPEZ SANCHEZ" },
        { id: 5, codpersona: "CP005", datospersona: "PEDRO SANCHEZ FERNANDEZ" },
        { id: 6, codpersona: "CP006", datospersona: "LAURA MARTINEZ GARCIA" },
        { id: 7, codpersona: "CP007", datospersona: "DIEGO FERNANDEZ DIAZ" },
        { id: 8, codpersona: "CP008", datospersona: "SOFIA RAMIREZ TORRES" },
        { id: 9, codpersona: "CP009", datospersona: "JORGE DIAZ RUiz" },
        { id: 10, codpersona: "CP010", datospersona: "ELENA TORRES VARGAS" }
    ];
    
    premios = [
        { id: 1, nombre: "Moto 0km", estado: "pendiente", ganador: null },
        { id: 2, nombre: "Televisor 55' 4K", estado: "pendiente", ganador: null },
        { id: 3, nombre: "Freidora de Aire Digital", estado: "pendiente", ganador: null }
    ];
    
    participantesDisponibles = [...participantes];
    mostrarParticipantes();
    mostrarPremios();
    seleccionarPremioActual(1);
    showInfo('Datos de ejemplo cargados. Puede subir su propio archivo Excel para reemplazarlos.');
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
    inicializarDatosEjemplo();
    
    window.addEventListener('resize', function() {
        fireworksCanvas.width = window.innerWidth;
        fireworksCanvas.height = window.innerHeight;
    });
});