/**
 * INFOTREN RENFE - APLICACIÓN EN TIEMPO REAL
 * Consulta y telemetría de trenes en circulación en la red española.
 */

// ============================================================================
// CONFIGURACIÓN Y MAPEOS
// ============================================================================

const CONFIG = {
    // Lista de proxies CORS con fallback en cascada
    CORS_PROXIES: [
        'https://cors-anywhere.fly.dev/',
        'https://api.allorigins.win/raw?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
        '' // Directo (por si el navegador tiene extensión de CORS o el backend lo habilita)
    ],
    CURRENT_PROXY_INDEX: 0,
    POLL_INTERVAL: 30000, // 30 segundos
    FLEET_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json',
    ROUTES_URL: 'https://tiempo-real.largorecorrido.renfe.com/renfe-visor/trenesConEstacionesLD.json',
    LOCAL_FLEET_URL: './data/flotaLD.json',
    LOCAL_ROUTES_URL: './data/trenesConEstacionesLD.json',
    STATIONS_URL: './data/stations.json'
};

const PRODUCTS = {
    1: { name: 'Largo Recorrido', badge: 'largo', color: '#64748b' },
    2: { name: 'AVE', badge: 'ave', color: '#d32f2f' },
    3: { name: 'Avant', badge: 'avant', color: '#0284c7' },
    4: { name: 'Talgo', badge: 'talgo', color: '#16a34a' },
    5: { name: 'Altaria', badge: 'altaria', color: '#ea580c' },
    6: { name: 'Euromed', badge: 'euromed', color: '#1e3a8a' },
    7: { name: 'Diurno', badge: 'diurno', color: '#eab308' },
    8: { name: 'Estrella', badge: 'estrella', color: '#9333ea' },
    9: { name: 'Tren Hotel', badge: 'trenhotel', color: '#0d9488' },
    10: { name: 'Trenhotel', badge: 'trenhotel', color: '#0d9488' },
    11: { name: 'Alvia', badge: 'alvia', color: '#e67e22' },
    12: { name: 'Arco', badge: 'arco', color: '#64748b' },
    13: { name: 'Intercity', badge: 'intercity', color: '#475569' },
    14: { name: 'Talgo 200', badge: 'talgo', color: '#16a34a' },
    15: { name: 'Media Distancia', badge: 'md', color: '#0d9488' },
    16: { name: 'Media Distancia', badge: 'md', color: '#0d9488' },
    17: { name: 'Cercanías', badge: 'cercanias', color: '#e11d48' },
    18: { name: 'Regional', badge: 'regional', color: '#16a34a' },
    19: { name: 'Regional Exprés', badge: 'regional', color: '#2563eb' },
    20: { name: 'Alaris', badge: 'alaris', color: '#e67e22' },
    25: { name: 'AVE TGV', badge: 'ave', color: '#b91c1c' },
    28: { name: 'AVLO', badge: 'avlo', color: '#8e44ad' },
    29: { name: 'Trenhotel Lusitania', badge: 'trenhotel', color: '#0d9488' }
};

const ROLLING_STOCK = {
    '100': 'Alstom Serie 100 (AVE)',
    '102': 'Talgo 350 Serie 102 ("Pato")',
    '103': 'Siemens Velaro E Serie 103 (AVE)',
    '106': 'Talgo Avril Serie 106',
    '107': 'Talgo Avril Serie 107',
    '112': 'Talgo 350 Serie 112 ("Pato")',
    '114': 'Alstom New Pendolino Serie 114 (Avant)',
    '120': 'CAF ATPRD Serie 120 (Alvia)',
    '121': 'CAF ATPRD Serie 121 (Avant / MD)',
    '130': 'Talgo 250 Serie 130 ("Patito")',
    '730': 'Talgo 250 Dual Serie 730 (Híbrido)',
    '449': 'CAF Serie 449 (Media Distancia)',
    '599': 'CAF Serie 599 (MD Diésel)',
    '598': 'CAF Nexios Serie 598 (Diésel)',
    '448': 'Serie 448 (Regional Exprés)',
    '470': 'Serie 470 (Regional Exprés)'
};

// ============================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================================

const state = {
    fleet: [],            // Trenes activos en tiempo real
    routes: [],           // Itinerarios y secuencias de paradas
    stations: {},         // Diccionario de estaciones (código -> datos)
    currentTrain: null,   // Tren actualmente seleccionado
    map: null,            // Instancia de Leaflet
    mapLayers: {
        trainMarker: null,
        routeLine: null,
        stationMarkers: []
    },
    activeTab: 'search',
    fleetFilter: 'all',
    fleetSearchQuery: '',
    pollTimer: null,
    isFirstLoad: true,
    lastUpdated: null
};

// ============================================================================
// FUNCIONES DE UTILIDAD, SEGURIDAD Y NORMALIZACIÓN
// ============================================================================

/**
 * Sanitiza cadenas para prevenir ataques de Cross-Site Scripting (XSS).
 */
function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Sanitiza entradas de usuario para números de tren.
 */
function sanitizeInput(str) {
    if (!str) return '';
    return String(str).trim().replace(/[^a-zA-Z0-9\s-]/g, '').substring(0, 15);
}

const RECENT_KEY = 'infotren_recent_searches';

function getRecentSearches() {
    try {
        const stored = localStorage.getItem(RECENT_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

function saveRecentSearch(trainNumber, prodName) {
    if (!trainNumber) return;
    try {
        const clean = sanitizeInput(trainNumber);
        let recents = getRecentSearches().filter(r => r.num !== clean);
        recents.unshift({ num: clean, prod: prodName || 'Tren' });
        recents = recents.slice(0, 4);
        localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
        renderRecentSearches();
    } catch (e) {}
}

function renderRecentSearches() {
    const box = document.getElementById('recentAccess');
    const container = document.getElementById('recentChips');
    if (!box || !container) return;

    const recents = getRecentSearches();
    if (!recents || recents.length === 0) {
        box.style.display = 'none';
        return;
    }

    container.innerHTML = '';
    recents.forEach(r => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip recent-chip';
        chip.innerHTML = `<span>#${escapeHTML(r.num)}</span> <small style="color:var(--text-muted);font-weight:600;">(${escapeHTML(r.prod)})</small>`;
        chip.onclick = () => {
            const input = document.getElementById('trainInput');
            input.value = r.num;
            searchTrain(r.num);
        };
        container.appendChild(chip);
    });
    box.style.display = 'flex';
}

async function shareTrain() {
    if (!state.currentTrain) return;
    const url = window.location.href;
    const btn = document.getElementById('shareBtnText');
    const trainNum = state.currentTrain.codComercial;
    const prod = getProductInfo(state.currentTrain.codProduct);
    const orig = getStationName(state.currentTrain.codOrigen);
    const dest = getStationName(state.currentTrain.codDestino);

    if (navigator.share) {
        try {
            await navigator.share({
                title: `InfoTren Renfe - ${prod.name} #${trainNum}`,
                text: `Sigue en tiempo real el tren ${prod.name} #${trainNum} (${orig} → ${dest})`,
                url: url
            });
            return;
        } catch (e) {
            // Continuar con fallback al portapapeles si cancela
        }
    }

    try {
        await navigator.clipboard.writeText(url);
        if (btn) {
            btn.textContent = '¡Copiado!';
            setTimeout(() => { btn.textContent = 'Compartir'; }, 2200);
        }
    } catch (e) {
        const temp = document.createElement('input');
        temp.value = url;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        if (btn) {
            btn.textContent = '¡Copiado!';
            setTimeout(() => { btn.textContent = 'Compartir'; }, 2200);
        }
    }
}

function normalizeTrainId(val) {
    if (!val) return '';
    const clean = String(val).trim().replace(/^0+/, '');
    return clean || '0';
}

function getProductInfo(code) {
    return PRODUCTS[code] || { name: 'Tren Renfe', badge: 'renfe', color: '#571661' };
}

function getMaterialInfo(mat) {
    if (!mat) return { name: 'Composición Renfe', code: '--' };
    const strMat = String(mat);
    const prefix = strMat.substring(0, 3);
    const series = ROLLING_STOCK[prefix] || `Serie ${prefix}`;
    return {
        name: series,
        code: strMat
    };
}

function getStationName(code) {
    if (!code) return 'Estación';
    const cleanCode = String(code).trim();
    const st = state.stations[cleanCode] || state.stations[cleanCode.replace(/^0+/, '')];
    if (st) {
        return st.n;
    }
    return `Estación (${cleanCode})`;
}

function getStationCoords(code) {
    if (!code) return null;
    const cleanCode = String(code).trim();
    const st = state.stations[cleanCode] || state.stations[cleanCode.replace(/^0+/, '')];
    if (st && st.lat && st.lon) {
        return [st.lat, st.lon];
    }
    return null;
}

function formatDelay(delayStr) {
    const min = parseInt(delayStr, 10);
    if (isNaN(min) || min === 0) {
        return { text: 'En hora (0 min)', class: 'ontime', min: 0 };
    }
    if (min < 0) {
        return { text: `Adelantado (${Math.abs(min)} min)`, class: 'ontime', min };
    }
    if (min <= 5) {
        return { text: `Retraso leve (+${min} min)`, class: 'ontime', min };
    }
    if (min <= 15) {
        return { text: `Retraso moderado (+${min} min)`, class: 'slight', min };
    }
    return { text: `Retraso significativo (+${min} min)`, class: 'heavy', min };
}

// ============================================================================
// CARGA DE DATOS (FETCHING CON FALLBACKS)
// ============================================================================

async function fetchWithFallback(url, localFallbackUrl) {
    // 1. Probar con la lista de proxies CORS
    for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
        const proxyIndex = (CONFIG.CURRENT_PROXY_INDEX + i) % CONFIG.CORS_PROXIES.length;
        const proxy = CONFIG.CORS_PROXIES[proxyIndex];
        const cacheBust = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
        const fullUrl = proxy ? (proxy.includes('?') ? proxy + encodeURIComponent(cacheBust) : proxy + cacheBust) : cacheBust;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6500);

            const res = await fetch(fullUrl, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                CONFIG.CURRENT_PROXY_INDEX = proxyIndex;
                return data;
            }
        } catch (err) {
            // Continuar con el siguiente proxy
        }
    }

    // 2. Si todos los proxies remotos fallan, usar el archivo local de respaldo
    if (localFallbackUrl) {
        try {
            const localRes = await fetch(localFallbackUrl);
            if (localRes.ok) {
                return await localRes.json();
            }
        } catch (e) {
            console.error('Error cargando snapshot local:', e);
        }
    }

    throw new Error('No se pudo conectar a los servicios de Renfe ni a los respaldos locales.');
}

async function loadStations() {
    try {
        const res = await fetch(CONFIG.STATIONS_URL);
        if (res.ok) {
            state.stations = await res.json();
        }
    } catch (e) {
        console.warn('No se pudo cargar el catálogo de estaciones local:', e);
    }
}

async function refreshData(silent = false) {
    if (!silent) {
        updateStatusIndicator('connecting', 'Sincronizando...');
    }

    try {
        const [fleetRes, routesRes] = await Promise.all([
            fetchWithFallback(CONFIG.FLEET_URL, CONFIG.LOCAL_FLEET_URL),
            fetchWithFallback(CONFIG.ROUTES_URL, CONFIG.LOCAL_ROUTES_URL)
        ]);

        state.fleet = fleetRes?.trenes || (Array.isArray(fleetRes) ? fleetRes : []);
        state.routes = routesRes?.trenes || (Array.isArray(routesRes) ? routesRes : []);
        state.lastUpdated = new Date();

        updateStatusIndicator('online', 'En vivo (Renfe Live)');
        updateHeaderTime();
        renderQuickChips();
        updateFleetTable();
        document.getElementById('totalTrainsCount').textContent = state.fleet.length;

        // Si hay un tren visualizándose, actualizar sus datos
        if (state.currentTrain) {
            const updated = findTrain(state.currentTrain.codComercial);
            if (updated) {
                displayTrain(updated, false);
            }
        }
    } catch (error) {
        console.error('Error al actualizar datos:', error);
        updateStatusIndicator('offline', 'Modo offline / Error');
    }
}

// ============================================================================
// BÚSQUEDA Y SELECCIÓN DE TREN
// ============================================================================

function findTrain(query) {
    if (!query) return null;
    const cleanQ = String(query).trim();
    const normQ = normalizeTrainId(cleanQ);

    // 1. Buscar en la flota en circulación
    let match = state.fleet.find(t => 
        String(t.codComercial).trim() === cleanQ || 
        normalizeTrainId(t.codComercial) === normQ
    );

    if (match) return match;

    // 2. Si no está en flota activa, buscar si está en las rutas programadas
    const routeMatch = state.routes.find(r => 
        String(r.idTren).trim() === cleanQ || 
        normalizeTrainId(r.idTren) === normQ
    );

    if (routeMatch) {
        // Sintetizar objeto de tren a partir de la ruta
        const first = routeMatch.estaciones?.[0]?.p;
        const last = routeMatch.estaciones?.[routeMatch.estaciones.length - 1]?.p;
        return {
            codComercial: routeMatch.idTren,
            codProduct: 1, // Desconocido / Genérico
            codOrigen: first,
            codDestino: last,
            ultRetraso: '0',
            synthetic: true
        };
    }

    return null;
}

function searchTrain(query) {
    if (!query) return;
    const clean = sanitizeInput(query);
    if (!clean) return;

    const found = findTrain(clean);

    const detailContainer = document.getElementById('trainDetailContainer');
    const emptyPrompt = document.getElementById('emptySearchPrompt');
    const notFoundState = document.getElementById('notFoundState');

    if (found) {
        emptyPrompt.style.display = 'none';
        notFoundState.style.display = 'none';
        detailContainer.style.display = 'block';
        displayTrain(found);

        // Actualizar URL con el parámetro del tren
        const url = new URL(window.location);
        url.searchParams.set('tren', found.codComercial);
        window.history.replaceState({}, '', url);
    } else {
        emptyPrompt.style.display = 'none';
        detailContainer.style.display = 'none';
        notFoundState.style.display = 'block';
        document.getElementById('notFoundTitle').textContent = `Tren #${clean} no encontrado`;
        document.getElementById('notFoundMsg').textContent = 
            `Actualmente no hay telemetría activa para el tren con número ${clean} en la red de Renfe. Comprueba el código e inténtalo de nuevo.`;
    }
}

function displayTrain(train, resetMapView = true) {
    state.currentTrain = train;
    const prod = getProductInfo(train.codProduct);
    const delay = formatDelay(train.ultRetraso);
    const mat = getMaterialInfo(train.mat);

    // Guardar en búsquedas recientes
    saveRecentSearch(train.codComercial, prod.name);

    // 1. Cabecera
    const badge = document.getElementById('detailProductBadge');
    badge.textContent = prod.name;
    badge.className = `product-badge ${prod.badge}`;
    badge.style.backgroundColor = prod.color;

    document.getElementById('detailTrainNumber').textContent = `Tren #${train.codComercial}`;
    document.getElementById('detailServiceName').textContent = `${prod.name} · Transporte Ferroviario`;

    const statusPill = document.getElementById('detailStatusPill');
    statusPill.className = `detail-status-pill ${delay.class === 'ontime' ? 'ontime' : (delay.class === 'slight' ? 'slight-delay' : 'heavy-delay')}`;
    document.getElementById('detailStatusLabel').textContent = delay.text;

    // 2. Métricas
    const originName = getStationName(train.codOrigen);
    const destName = getStationName(train.codDestino);
    document.getElementById('detailOrigin').textContent = originName;
    document.getElementById('detailDestination').textContent = destName;

    // Buscar ruta para horarios de origen y fin
    const route = state.routes.find(r => normalizeTrainId(r.idTren) === normalizeTrainId(train.codComercial));
    if (route && route.estaciones && route.estaciones.length > 0) {
        const first = route.estaciones[0];
        const last = route.estaciones[route.estaciones.length - 1];
        document.getElementById('detailDepTime').textContent = `Salida: ${first.hs || first.h || '--:--'}`;
        document.getElementById('detailArrTime').textContent = `Llegada: ${last.h || last.hs || '--:--'}`;
    } else {
        document.getElementById('detailDepTime').textContent = 'Salida: --:--';
        document.getElementById('detailArrTime').textContent = 'Llegada: --:--';
    }

    document.getElementById('detailDelay').textContent = delay.text;
    document.getElementById('detailDelaySub').textContent = train.synthetic ? 'Horario estático' : 'Telemetría en tiempo real';

    const nextStationName = getStationName(train.codEstSig);
    document.getElementById('detailNextStation').textContent = nextStationName;

    if (train.horaLlegadaSigEst) {
        try {
            const timePart = train.horaLlegadaSigEst.split('T')[1]?.substring(0, 5) || train.horaLlegadaSigEst;
            document.getElementById('detailNextEta').textContent = `Estimada: ${timePart}`;
        } catch (e) {
            document.getElementById('detailNextEta').textContent = 'Estimada: --:--';
        }
    } else {
        document.getElementById('detailNextEta').textContent = 'En trayecto';
    }

    // 3. Detalles técnicos
    document.getElementById('detailMaterial').textContent = mat.name;
    document.getElementById('detailMatricula').textContent = mat.code !== '--' ? `#${mat.code}` : 'No disponible';
    document.getElementById('detailAccessible').textContent = train.accesible ? '♿ Servicio Atendo / PMR Habilitado' : 'Estándar';
    document.getElementById('detailLastStation').textContent = getStationName(train.codEstAnt);

    // 4. Renderizar Timeline de Estaciones
    renderTimeline(train, route);

    // 5. Renderizar Mapa
    renderMap(train, route, resetMapView);
}

// ============================================================================
// LÍNEA DE TIEMPO (TIMELINE)
// ============================================================================

function renderTimeline(train, route) {
    const container = document.getElementById('stationsTimeline');
    const badge = document.getElementById('stopsSummaryBadge');
    container.innerHTML = '';

    if (!route || !route.estaciones || route.estaciones.length === 0) {
        badge.textContent = 'Sin paradas detalladas';
        container.innerHTML = `
            <div class="timeline-step">
                <div class="step-top">
                    <span class="step-station-name">${getStationName(train.codOrigen)}</span>
                    <span class="step-time-badge">Origen</span>
                </div>
            </div>
            <div class="timeline-step current">
                <div class="step-top">
                    <span class="step-station-name">${getStationName(train.codEstSig || train.codDestino)}</span>
                    <span class="step-time-badge">Próxima</span>
                </div>
            </div>
            <div class="timeline-step">
                <div class="step-top">
                    <span class="step-station-name">${getStationName(train.codDestino)}</span>
                    <span class="step-time-badge">Destino</span>
                </div>
            </div>
        `;
        return;
    }

    const stops = route.estaciones;
    badge.textContent = `${stops.length} estaciones`;

    // Identificar el índice de la próxima parada
    const nextCode = String(train.codEstSig || '').trim();
    let nextIndex = stops.findIndex(s => String(s.p).trim() === nextCode);
    if (nextIndex === -1) {
        nextIndex = Math.floor(stops.length / 2);
    }

    stops.forEach((stop, index) => {
        const step = document.createElement('div');
        const stName = getStationName(stop.p);
        const st = state.stations[String(stop.p).trim()] || state.stations[String(stop.p).replace(/^0+/, '')];
        const loc = st ? st.p : '';

        let statusClass = 'upcoming';
        let statusText = 'Pendiente';

        if (index < nextIndex) {
            statusClass = 'completed';
            statusText = '✓ Parada realizada';
        } else if (index === nextIndex) {
            statusClass = 'current';
            statusText = '🚆 Próxima parada';
        }

        step.className = `timeline-step ${statusClass}`;
        step.innerHTML = `
            <div class="step-top">
                <span class="step-station-name">${escapeHTML(stName)}</span>
                <span class="step-time-badge">${escapeHTML(stop.h || stop.hs || '--:--')}</span>
            </div>
            <div class="step-meta">
                <span>${loc ? escapeHTML(loc) + ' · ' : ''}Adif #${escapeHTML(stop.p)}</span>
                <span class="step-status-tag">${escapeHTML(statusText)}</span>
            </div>
        `;

        // Click en parada para centrar en el mapa
        step.style.cursor = 'pointer';
        step.onclick = () => {
            const coords = getStationCoords(stop.p);
            if (coords && state.map) {
                state.map.setView(coords, 12, { animate: true });
            }
        };

        container.appendChild(step);
    });
}

// ============================================================================
// MAPA INTERACTIVO (LEAFLET)
// ============================================================================

function initMapIfNeeded() {
    if (state.map) return;

    const mapEl = document.getElementById('trainMap');
    if (!mapEl) return;

    state.map = L.map('trainMap', {
        center: [40.4168, -3.7038], // Centro de la península (Madrid)
        zoom: 6,
        zoomControl: true
    });

    // CartoDB Voyager tiles (modernos, claros y limpios)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(state.map);
}

function clearMapLayers() {
    if (!state.map) return;
    if (state.mapLayers.trainMarker) {
        state.map.removeLayer(state.mapLayers.trainMarker);
        state.mapLayers.trainMarker = null;
    }
    if (state.mapLayers.routeLine) {
        state.map.removeLayer(state.mapLayers.routeLine);
        state.mapLayers.routeLine = null;
    }
    if (state.mapLayers.stationMarkers) {
        state.mapLayers.stationMarkers.forEach(m => state.map.removeLayer(m));
        state.mapLayers.stationMarkers = [];
    }
}

function renderMap(train, route, shouldFitBounds = true) {
    initMapIfNeeded();
    clearMapLayers();
    if (!state.map) return;

    // Asegurar tamaño del mapa tras mostrar el contenedor
    setTimeout(() => state.map.invalidateSize(), 100);

    const prod = getProductInfo(train.codProduct);
    const bounds = L.latLngBounds();

    // 1. Trazado de ruta (Polilínea a partir de la secuencia)
    if (route && route.secuencia && route.secuencia.length > 0) {
        const polyCoords = route.secuencia
            .filter(pt => pt.lat && pt.lon)
            .map(pt => [pt.lat, pt.lon]);

        if (polyCoords.length > 0) {
            state.mapLayers.routeLine = L.polyline(polyCoords, {
                color: prod.color || '#571661',
                weight: 5,
                opacity: 0.85,
                lineJoin: 'round'
            }).addTo(state.map);

            polyCoords.forEach(c => bounds.extend(c));
        }
    }

    // 2. Estaciones en la ruta
    if (route && route.estaciones) {
        route.estaciones.forEach(stop => {
            const coords = getStationCoords(stop.p);
            if (coords) {
                const isNext = String(stop.p).trim() === String(train.codEstSig).trim();
                const icon = L.divIcon({
                    className: 'station-pin-container',
                    html: `<div class="station-pin-marker ${isNext ? 'current' : ''}"></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });

                const marker = L.marker(coords, { icon })
                    .bindPopup(`
                        <strong>${escapeHTML(getStationName(stop.p))}</strong><br>
                        Hora: ${escapeHTML(stop.h || stop.hs || '--:--')}<br>
                        Código: ${escapeHTML(stop.p)}
                    `)
                    .addTo(state.map);

                state.mapLayers.stationMarkers.push(marker);
                bounds.extend(coords);
            }
        });
    }

    // 3. Marcador animado del tren en tiempo real
    if (train.latitud && train.longitud) {
        const trainCoords = [train.latitud, train.longitud];
        const trainIcon = L.divIcon({
            className: 'leaflet-train-icon',
            html: `<div class="train-pulsing-marker" style="background-color: ${prod.color}">🚆</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18]
        });

        const delay = formatDelay(train.ultRetraso);

        state.mapLayers.trainMarker = L.marker(trainCoords, { icon: trainIcon, zIndexOffset: 1000 })
            .bindPopup(`
                <div style="font-family: var(--font-sans); padding: 4px;">
                    <strong style="color: ${escapeHTML(prod.color)}; font-size: 14px;">${escapeHTML(prod.name)} #${escapeHTML(train.codComercial)}</strong><br>
                    <strong>Estado:</strong> ${escapeHTML(delay.text)}<br>
                    <strong>Próxima parada:</strong> ${escapeHTML(getStationName(train.codEstSig))}<br>
                    <strong>Destino:</strong> ${escapeHTML(getStationName(train.codDestino))}
                </div>
            `)
            .addTo(state.map);

        bounds.extend(trainCoords);
    }

    // Ajustar vista
    if (shouldFitBounds && bounds.isValid()) {
        state.map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
}

function centerMapOnTrain() {
    if (state.currentTrain && state.currentTrain.latitud && state.currentTrain.longitud && state.map) {
        state.map.setView([state.currentTrain.latitud, state.currentTrain.longitud], 11, { animate: true });
        if (state.mapLayers.trainMarker) {
            state.mapLayers.trainMarker.openPopup();
        }
    }
}

function fitMapToRoute() {
    if (state.mapLayers.routeLine && state.map) {
        state.map.fitBounds(state.mapLayers.routeLine.getBounds(), { padding: [30, 30] });
    }
}

// ============================================================================
// SUGERENCIAS RÁPIDAS Y AUTOCOMPLETADO
// ============================================================================

function renderQuickChips() {
    const container = document.getElementById('quickChips');
    if (!container) return;

    if (!state.fleet || state.fleet.length === 0) {
        container.innerHTML = '<span class="chip">Esperando telemetría...</span>';
        return;
    }

    container.innerHTML = '';
    // Tomar 5 trenes variados (AVE, Alvia, AVLO, MD...)
    const sampled = state.fleet.slice(0, 5);

    sampled.forEach(t => {
        const prod = getProductInfo(t.codProduct);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.innerHTML = `
            <span class="chip-tag" style="background-color: ${escapeHTML(prod.color)}">${escapeHTML(prod.name)}</span>
            <span>#${escapeHTML(t.codComercial)}</span>
        `;
        chip.onclick = () => {
            document.getElementById('trainInput').value = t.codComercial;
            searchTrain(t.codComercial);
        };
        container.appendChild(chip);
    });
}

state.autocompleteSelectedIndex = -1;

function handleInputKeydown(e) {
    const dropdown = document.getElementById('autocompleteDropdown');
    const items = dropdown.querySelectorAll('.autocomplete-item');

    if (e.key === 'Escape') {
        dropdown.style.display = 'none';
        state.autocompleteSelectedIndex = -1;
        return;
    }

    if (dropdown.style.display !== 'none' && items.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            state.autocompleteSelectedIndex = (state.autocompleteSelectedIndex + 1) % items.length;
            highlightAutocompleteItem(items);
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            state.autocompleteSelectedIndex = (state.autocompleteSelectedIndex - 1 + items.length) % items.length;
            highlightAutocompleteItem(items);
            return;
        }
        if (e.key === 'Enter' && state.autocompleteSelectedIndex >= 0) {
            e.preventDefault();
            items[state.autocompleteSelectedIndex].click();
            return;
        }
    }
}

function highlightAutocompleteItem(items) {
    items.forEach((it, idx) => {
        if (idx === state.autocompleteSelectedIndex) {
            it.classList.add('selected');
            it.scrollIntoView({ block: 'nearest' });
        } else {
            it.classList.remove('selected');
        }
    });
}

function handleInputSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    const btnClear = document.getElementById('btnClear');
    const dropdown = document.getElementById('autocompleteDropdown');
    state.autocompleteSelectedIndex = -1;

    btnClear.style.display = query ? 'flex' : 'none';

    if (!query || query.length < 2) {
        dropdown.style.display = 'none';
        return;
    }

    const matches = state.fleet.filter(t => {
        const num = String(t.codComercial).toLowerCase();
        const orig = getStationName(t.codOrigen).toLowerCase();
        const dest = getStationName(t.codDestino).toLowerCase();
        const prod = getProductInfo(t.codProduct).name.toLowerCase();
        return num.includes(query) || orig.includes(query) || dest.includes(query) || prod.includes(query);
    }).slice(0, 8);

    if (matches.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.innerHTML = '';
    matches.forEach(t => {
        const prod = getProductInfo(t.codProduct);
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.setAttribute('role', 'option');
        item.innerHTML = `
            <div class="item-main">
                <span class="table-badge" style="background-color: ${escapeHTML(prod.color)}">${escapeHTML(prod.name)}</span>
                <span class="item-train-num">#${escapeHTML(t.codComercial)}</span>
            </div>
            <div class="item-route">${escapeHTML(getStationName(t.codOrigen))} → ${escapeHTML(getStationName(t.codDestino))}</div>
        `;
        item.onclick = () => {
            document.getElementById('trainInput').value = t.codComercial;
            dropdown.style.display = 'none';
            searchTrain(t.codComercial);
        };
        dropdown.appendChild(item);
    });

    dropdown.style.display = 'block';
}

function clearSearch() {
    const input = document.getElementById('trainInput');
    input.value = '';
    document.getElementById('btnClear').style.display = 'none';
    document.getElementById('autocompleteDropdown').style.display = 'none';
    state.autocompleteSelectedIndex = -1;
    input.focus();
}

function handleSearchSubmit(e) {
    e.preventDefault();
    document.getElementById('autocompleteDropdown').style.display = 'none';
    state.autocompleteSelectedIndex = -1;
    const query = document.getElementById('trainInput').value.trim();
    if (query) {
        searchTrain(query);
    }
}

// ============================================================================
// TABLA DE TRENES EN CIRCULACIÓN (FLOTA COMPLETA)
// ============================================================================

function setFleetFilter(type) {
    state.fleetFilter = type;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateFleetTable();
}

function filterFleetTable() {
    state.fleetSearchQuery = document.getElementById('fleetFilterInput').value.toLowerCase().trim();
    updateFleetTable();
}

function updateFleetTable() {
    const tbody = document.getElementById('fleetTableBody');
    if (!tbody) return;

    if (!state.fleet || state.fleet.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="table-loading">No hay trenes registrados en circulación.</td></tr>';
        return;
    }

    // Actualizar contadores
    let aveCount = 0, avloCount = 0, alviaCount = 0, mdCount = 0, delayCount = 0;
    state.fleet.forEach(t => {
        const p = t.codProduct;
        if (p === 2 || p === 25) aveCount++;
        if (p === 28) avloCount++;
        if (p === 11) alviaCount++;
        if (p === 15 || p === 16 || p === 18 || p === 19) mdCount++;
        if (parseInt(t.ultRetraso, 10) > 5) delayCount++;
    });

    document.getElementById('countAll').textContent = state.fleet.length;
    document.getElementById('countAve').textContent = aveCount;
    document.getElementById('countAvlo').textContent = avloCount;
    document.getElementById('countAlvia').textContent = alviaCount;
    document.getElementById('countMd').textContent = mdCount;
    document.getElementById('countDelay').textContent = delayCount;

    // Filtrar
    const filtered = state.fleet.filter(t => {
        // Filtro por píldora
        if (state.fleetFilter === 'AVE' && t.codProduct !== 2 && t.codProduct !== 25) return false;
        if (state.fleetFilter === 'AVLO' && t.codProduct !== 28) return false;
        if (state.fleetFilter === 'Alvia' && t.codProduct !== 11) return false;
        if (state.fleetFilter === 'MD' && (t.codProduct !== 15 && t.codProduct !== 16 && t.codProduct !== 18 && t.codProduct !== 19)) return false;
        if (state.fleetFilter === 'delay' && parseInt(t.ultRetraso, 10) <= 5) return false;

        // Filtro por texto
        if (state.fleetSearchQuery) {
            const num = String(t.codComercial).toLowerCase();
            const orig = getStationName(t.codOrigen).toLowerCase();
            const dest = getStationName(t.codDestino).toLowerCase();
            const prod = getProductInfo(t.codProduct).name.toLowerCase();
            return num.includes(state.fleetSearchQuery) || 
                   orig.includes(state.fleetSearchQuery) || 
                   dest.includes(state.fleetSearchQuery) || 
                   prod.includes(state.fleetSearchQuery);
        }

        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="table-loading">No se encontraron trenes con los filtros seleccionados.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(t => {
        const prod = getProductInfo(t.codProduct);
        const delay = formatDelay(t.ultRetraso);
        const mat = getMaterialInfo(t.mat);
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><span class="table-train-tag">#${escapeHTML(t.codComercial)}</span></td>
            <td><span class="table-badge" style="background-color: ${escapeHTML(prod.color)}">${escapeHTML(prod.name)}</span></td>
            <td><strong>${escapeHTML(getStationName(t.codOrigen))}</strong></td>
            <td><strong>${escapeHTML(getStationName(t.codDestino))}</strong></td>
            <td>${escapeHTML(getStationName(t.codEstSig))}</td>
            <td><span class="table-delay ${escapeHTML(delay.class)}">${escapeHTML(delay.text)}</span></td>
            <td><small>${escapeHTML(mat.name)}</small></td>
            <td><button class="btn-sm" type="button" aria-label="Ver ficha del tren #${escapeHTML(t.codComercial)}">Ver Ficha</button></td>
        `;

        tr.onclick = () => {
            switchTab('search');
            document.getElementById('trainInput').value = t.codComercial;
            searchTrain(t.codComercial);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        tbody.appendChild(tr);
    });
}

// ============================================================================
// NAVEGACIÓN Y PESTAÑAS
// ============================================================================

function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    if (tabId === 'search') {
        document.getElementById('tabSearch').classList.add('active');
        document.getElementById('sectionSearch').classList.add('active');
        if (state.map) {
            setTimeout(() => state.map.invalidateSize(), 150);
        }
    } else if (tabId === 'fleet') {
        document.getElementById('tabFleet').classList.add('active');
        document.getElementById('sectionFleet').classList.add('active');
    }
}

function showHomeView() {
    switchTab('search');
    clearSearch();
    document.getElementById('trainDetailContainer').style.display = 'none';
    document.getElementById('notFoundState').style.display = 'none';
    document.getElementById('emptySearchPrompt').style.display = 'block';
    state.currentTrain = null;

    const url = new URL(window.location);
    url.searchParams.delete('tren');
    window.history.replaceState({}, '', url);
}

function updateStatusIndicator(status, text) {
    const el = document.getElementById('connectionStatus');
    const dot = el.querySelector('.status-dot');
    const label = document.getElementById('statusText');

    dot.className = 'status-dot';
    if (status === 'online') {
        dot.classList.add('online');
    } else if (status === 'offline') {
        dot.classList.add('offline');
    } else {
        dot.classList.add('pulsing');
    }
    label.textContent = text;
}

function updateHeaderTime() {
    if (state.lastUpdated) {
        const timeStr = state.lastUpdated.toLocaleTimeString('es-ES');
        document.getElementById('lastUpdatedText').textContent = timeStr;
    }
}

function forceRefresh() {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    refreshData().finally(() => {
        setTimeout(() => btn.classList.remove('spinning'), 600);
    });
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

async function init() {
    // Cerrar autocomplete al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            document.getElementById('autocompleteDropdown').style.display = 'none';
        }
    });

    // 1. Mostrar búsquedas recientes previas
    renderRecentSearches();

    // 2. Cargar catálogo de estaciones
    await loadStations();

    // 3. Cargar telemetría en tiempo real
    await refreshData();

    // 4. Revisar si hay parámetro en la URL (?tren=XXXX)
    const urlParams = new URLSearchParams(window.location.search);
    const trainParam = urlParams.get('tren');
    if (trainParam) {
        document.getElementById('trainInput').value = trainParam;
        searchTrain(trainParam);
    }

    // 5. Iniciar refresco automático periódico (cada 30 segs)
    state.pollTimer = setInterval(() => {
        refreshData(true);
    }, CONFIG.POLL_INTERVAL);
}

// Exponer funciones al objeto global para los eventos HTML
window.app = {
    handleSearchSubmit,
    handleInputSearch,
    handleInputKeydown,
    clearSearch,
    shareTrain,
    centerMapOnTrain,
    fitMapToRoute,
    switchTab,
    showHomeView,
    setFleetFilter,
    filterFleetTable,
    forceRefresh
};

// Iniciar al cargar el DOM
document.addEventListener('DOMContentLoaded', init);
