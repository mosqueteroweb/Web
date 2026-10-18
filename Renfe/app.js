/**
 * INFOTREN RENFE - APLICACIÓN EN TIEMPO REAL (PWA)
 * Consulta y telemetría accesible de trenes en circulación en la red española.
 */

// ============================================================================
// CONFIGURACIÓN Y MAPEOS
// ============================================================================

const CONFIG = {
    CORS_PROXIES: [
        'https://cors-anywhere.fly.dev/',
        'https://api.allorigins.win/raw?url=',
        'https://api.codetabs.com/v1/proxy?quest=',
        ''
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
    1: { name: 'Largo Recorrido', badge: 'largo', color: '#475569' },
    2: { name: 'AVE', badge: 'ave', color: '#d32f2f' },
    3: { name: 'Avant', badge: 'avant', color: '#0284c7' },
    4: { name: 'Talgo', badge: 'talgo', color: '#16a34a' },
    5: { name: 'Altaria', badge: 'altaria', color: '#ea580c' },
    6: { name: 'Euromed', badge: 'euromed', color: '#1e3a8a' },
    7: { name: 'Diurno', badge: 'diurno', color: '#ca8a04' },
    8: { name: 'Estrella', badge: 'estrella', color: '#9333ea' },
    9: { name: 'Tren Hotel', badge: 'trenhotel', color: '#0d9488' },
    10: { name: 'Trenhotel', badge: 'trenhotel', color: '#0d9488' },
    11: { name: 'Alvia', badge: 'alvia', color: '#e67e22' },
    12: { name: 'Arco', badge: 'arco', color: '#475569' },
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
    29: { name: 'Trenhotel', badge: 'trenhotel', color: '#0d9488' }
};

// Sin paréntesis para evitar saltos de línea rotos en móvil
const ROLLING_STOCK = {
    '100': 'Alstom Serie 100 · AVE',
    '102': 'Talgo 350 Serie 102',
    '103': 'Siemens Velaro Serie 103 · AVE',
    '106': 'Talgo Avril Serie 106',
    '107': 'Talgo Avril Serie 107',
    '112': 'Talgo 350 Serie 112',
    '114': 'Alstom Serie 114 · Avant',
    '120': 'CAF Serie 120 · Alvia',
    '121': 'CAF Serie 121 · Avant y MD',
    '130': 'Talgo 250 Serie 130 · Alvia',
    '730': 'Talgo 250 Dual Serie 730',
    '449': 'CAF Serie 449 · Media Distancia',
    '599': 'CAF Serie 599 · MD Diésel',
    '598': 'CAF Nexios Serie 598',
    '448': 'Serie 448 · Regional Exprés',
    '470': 'Serie 470 · Regional Exprés'
};

// ============================================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================================

const state = {
    fleet: [],
    routes: [],
    stations: window.EMBEDDED_STATIONS || {},
    currentTrain: null,
    map: null,
    mapLayers: {
        trainMarker: null,
        routeLine: null,
        stationMarkers: []
    },
    activeTab: 'search',
    fleetFilter: 'all',
    fleetSearchQuery: '',
    pollTimer: null,
    lastUpdated: null,
    fontScaleIndex: 0, // 0 = 100%, 1 = 112%, 2 = 124%
    deferredInstallPrompt: null,
    autocompleteSelectedIndex: -1
};

const RECENT_KEY = 'infotren_recent_searches';
const FONT_SCALE_KEY = 'infotren_font_scale';
const CACHE_FLEET_KEY = 'infotren_cached_fleet';
const CACHE_ROUTES_KEY = 'infotren_cached_routes';

// ============================================================================
// FUNCIONES DE UTILIDAD, SEGURIDAD Y NORMALIZACIÓN
// ============================================================================

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeInput(str) {
    if (!str) return '';
    return String(str).trim().replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ.-]/g, '').substring(0, 20);
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

/**
 * Obtiene el objeto estación a partir de su código (con o sin ceros iniciales).
 */
function lookupStation(code) {
    if (!code) return null;
    const cleanCode = String(code).trim();
    const normCode = cleanCode.replace(/^0+/, '') || '0';
    const entry = state.stations[cleanCode] || state.stations[normCode];
    if (!entry) return null;
    if (Array.isArray(entry)) {
        return { n: entry[0], lat: entry[1], lon: entry[2] };
    }
    return entry;
}

/**
 * Resuelve el nombre limpio de una estación (acepta tanto código numérico como nombre).
 * Elimina cualquier paréntesis residual como "(apd)".
 */
function getStationName(codeOrName) {
    if (!codeOrName) return 'Estación';
    const clean = String(codeOrName).trim();
    const st = lookupStation(clean);
    if (st && st.n) {
        return String(st.n).replace(/\s*\([^)]*\)/g, '').trim();
    }
    if (/^\d+$/.test(clean)) {
        return `Estación ${clean}`;
    }
    return clean.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * Formatea y acorta nombres de estaciones para personas mayores (+80 años):
 * - Estrictamente MÁXIMO 15 caracteres.
 * - Nombres claros de ciudad sin paréntesis ni cortes bruscos.
 * - Funciona tanto si recibe un código ("60000") como un nombre ("Madrid-Puerta De Atocha").
 */
function formatStationMax15(codeOrName) {
    if (!codeOrName) return '--';
    const raw = getStationName(codeOrName);
    if (!raw || raw === 'Estación') return '--';

    const lower = raw.toLowerCase();

    // Reglas específicas de ciudades y grandes estaciones
    if (lower.includes('puerta de atocha') || lower.includes('atocha')) return 'Madrid Atocha';
    if (lower.includes('chamartin') || lower.includes('chamartín')) return 'M. Chamartín';
    if (lower.includes('principe pio') || lower.includes('príncipe pío')) return 'M. Príncipe Pío';
    if (lower.includes('barcelona') && lower.includes('sants')) return 'Barcelona Sants';
    if (lower.includes('barcelona') && (lower.includes('franca') || lower.includes('frança'))) return 'Barna França';
    if (lower.includes('figueres')) return 'Figueres';
    if (lower.includes('joaquín sorolla') || lower.includes('joaquin sorolla')) return 'Valencia J.S.';
    if (lower.includes('valencia') && lower.includes('nord')) return 'Valencia Nord';
    if (lower.includes('santa justa')) return 'Sevilla S.J.';
    if (lower.includes('zaragoza') && lower.includes('delicias')) return 'Zaragoza Del.';
    if (lower.includes('zaragoza') && lower.includes('miraflores')) return 'Z. Miraflores';
    if (lower.includes('zaragoza') && lower.includes('portillo')) return 'Z. Portillo';
    if (lower.includes('campo grande')) return 'Valladolid';
    if (lower.includes('zambrano')) return 'Málaga M.Z.';
    if (lower.includes('camp de tarragona')) return 'Camp Tarragona';
    if (lower.includes('lleida')) return 'Lleida';
    if (lower.includes('santiago de compostela')) return 'Santiago Comp.';
    if (lower.includes('donostia') || lower.includes('san sebastián') || lower.includes('san sebastian')) return 'San Sebastián';
    if (lower.includes('alacant') || lower.includes('alicante')) return 'Alicante';
    if (lower.includes('castelló') || lower.includes('castellon')) return 'Castellón';
    if (lower.includes('elx') || lower.includes('elche')) return 'Elche AV';
    if (lower.includes('fernando zóbel') || lower.includes('fernando zobel')) return 'Cuenca F.Z.';
    if (lower.includes('guiomar')) return 'Segovia Guiomar';
    if (lower.includes('sanabria')) return 'Sanabria AV';
    if (lower.includes('puente genil')) return 'Puente Genil';
    if (lower.includes('antequera') && lower.includes('santa ana')) return 'Antequera S.A.';
    if (lower.includes('antequera')) return 'Antequera';
    if (lower.includes('jerez de la frontera')) return 'Jerez Frontera';
    if (lower.includes('puerto de santa')) return 'El Puerto S.M.';
    if (lower.includes('san fernando')) return 'San Fernando';
    if (lower.includes('alcázar de san juan') || lower.includes('alcazar de san juan')) return 'Alcázar S.Juan';
    if (lower.includes('medina del campo')) return 'Medina Campo';
    if (lower.includes('miranda de ebro')) return 'Miranda Ebro';
    if (lower.includes('tudela de navarra')) return 'Tudela Navarra';
    if (lower.includes('villafranca de los barros')) return 'Villafranca B.';
    if (lower.includes('villanueva de córdoba') || lower.includes('villanueva de cordoba')) return 'Villanueva Cór.';

    let cleaned = raw.replace(/\s*[-–—/]\s*/g, ' ').trim();
    if (cleaned.length <= 15) return cleaned;

    const firstPart = raw.split(/[-–—/]/)[0].trim();
    if (firstPart.length >= 4 && firstPart.length <= 15) return firstPart;

    cleaned = firstPart.replace(/\b(De La|De Los|De Las|Del|De)\b/gi, '').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= 15) return cleaned;

    return cleaned.substring(0, 15).trim();
}

function cleanStationName(codeOrName) {
    return formatStationMax15(codeOrName);
}

function getStationCoords(code) {
    const st = lookupStation(code);
    if (st && st.lat && st.lon) {
        return [st.lat, st.lon];
    }
    return null;
}

function formatDelay(delayStr) {
    const min = parseInt(delayStr, 10);
    if (isNaN(min) || min === 0) {
        return { text: 'En hora · Sin retraso', class: 'ontime', min: 0 };
    }
    if (min < 0) {
        return { text: `Adelantado ${Math.abs(min)} min`, class: 'ontime', min };
    }
    if (min <= 5) {
        return { text: `Retraso leve +${min} min`, class: 'ontime', min };
    }
    if (min <= 15) {
        return { text: `Retraso +${min} min`, class: 'slight', min };
    }
    return { text: `Retraso +${min} min`, class: 'heavy', min };
}

function addMinutesToTime(hhmm, minutesToAdd) {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm) || !minutesToAdd || minutesToAdd <= 0) return null;
    const [h, m] = hhmm.split(':').map(Number);
    const total = (h * 60 + m + minutesToAdd) % (24 * 60);
    const nh = String(Math.floor(total / 60)).padStart(2, '0');
    const nm = String(total % 60).padStart(2, '0');
    return `${nh}:${nm}`;
}

// ============================================================================
// ESCALADO DE FUENTE ACCESIBLE (A+) Y BÚSQUEDAS RECIENTES
// ============================================================================

function applyFontScale(idx) {
    state.fontScaleIndex = idx % 3;
    const html = document.documentElement;
    const btn = document.getElementById('fontScaleBtn');
    html.classList.remove('font-large', 'font-xlarge');

    if (state.fontScaleIndex === 1) {
        html.classList.add('font-large');
        if (btn) {
            btn.textContent = 'A++';
            btn.classList.add('active');
        }
    } else if (state.fontScaleIndex === 2) {
        html.classList.add('font-xlarge');
        if (btn) {
            btn.textContent = 'A-';
            btn.classList.add('active');
        }
    } else {
        if (btn) {
            btn.textContent = 'A+';
            btn.classList.remove('active');
        }
    }
    try {
        localStorage.setItem(FONT_SCALE_KEY, String(state.fontScaleIndex));
    } catch (e) {}
}

function cycleFontScale() {
    applyFontScale(state.fontScaleIndex + 1);
}

function loadSavedFontScale() {
    try {
        const saved = parseInt(localStorage.getItem(FONT_SCALE_KEY), 10);
        if (!isNaN(saved) && saved >= 0 && saved <= 2) {
            applyFontScale(saved);
        }
    } catch (e) {}
}

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
        chip.innerHTML = `<span>#${escapeHTML(r.num)}</span> <small style="color:var(--text-muted);font-weight:800;">· ${escapeHTML(r.prod)}</small>`;
        chip.onclick = () => {
            const input = document.getElementById('trainInput');
            if (input) input.value = r.num;
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
    const orig = formatStationMax15(state.currentTrain.codOrigen);
    const dest = formatStationMax15(state.currentTrain.codDestino);

    if (navigator.share) {
        try {
            await navigator.share({
                title: `InfoTren - ${prod.name} #${trainNum}`,
                text: `Sigue en tiempo real el tren ${prod.name} #${trainNum} de ${orig} a ${dest}`,
                url: url
            });
            return;
        } catch (e) {}
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

// ============================================================================
// CARGA DE DATOS (FETCHING CON FALLBACKS Y CACHÉ OFFLINE)
// ============================================================================

async function fetchWithFallback(url, localFallbackUrl, cacheKey) {
    // 1. Probar con la lista de proxies CORS en tiempo real
    for (let i = 0; i < CONFIG.CORS_PROXIES.length; i++) {
        const proxyIndex = (CONFIG.CURRENT_PROXY_INDEX + i) % CONFIG.CORS_PROXIES.length;
        const proxy = CONFIG.CORS_PROXIES[proxyIndex];
        const cacheBust = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
        const fullUrl = proxy ? (proxy.includes('?') ? proxy + encodeURIComponent(cacheBust) : proxy + cacheBust) : cacheBust;

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5500);

            const res = await fetch(fullUrl, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                CONFIG.CURRENT_PROXY_INDEX = proxyIndex;
                if (cacheKey) {
                    try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
                }
                return { data, source: 'live' };
            }
        } catch (err) {
            // Continuar con el siguiente proxy
        }
    }

    // 2. Si no hay red o fallan los proxies, probar última caché guardada en el dispositivo
    if (cacheKey) {
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                return { data: JSON.parse(cached), source: 'cache' };
            }
        } catch (e) {}
    }

    // 3. Probar archivo local de respaldo en el repositorio
    if (localFallbackUrl) {
        try {
            const localRes = await fetch(localFallbackUrl);
            if (localRes.ok) {
                const data = await localRes.json();
                return { data, source: 'fallback' };
            }
        } catch (e) {}
    }

    // 4. Respaldo integrado en el propio archivo único PWA
    if (cacheKey === CACHE_FLEET_KEY && window.EMBEDDED_FLEET_FALLBACK) {
        return { data: window.EMBEDDED_FLEET_FALLBACK, source: 'embedded' };
    }
    if (cacheKey === CACHE_ROUTES_KEY && window.EMBEDDED_ROUTES_FALLBACK) {
        return { data: window.EMBEDDED_ROUTES_FALLBACK, source: 'embedded' };
    }

    throw new Error('No se pudo conectar a los servicios de Renfe.');
}

async function loadStations() {
    if (Object.keys(state.stations).length > 500) {
        return; // Ya están cargadas en memoria (ej. PWA en archivo único)
    }
    try {
        const res = await fetch(CONFIG.STATIONS_URL);
        if (res.ok) {
            state.stations = await res.json();
        }
    } catch (e) {
        console.warn('No se pudo cargar el catálogo de estaciones externo:', e);
    }
}

async function refreshData(silent = false) {
    if (!silent) {
        updateStatusIndicator('connecting', 'Actualizando...');
    }

    try {
        const [fleetResult, routesResult] = await Promise.all([
            fetchWithFallback(CONFIG.FLEET_URL, CONFIG.LOCAL_FLEET_URL, CACHE_FLEET_KEY),
            fetchWithFallback(CONFIG.ROUTES_URL, CONFIG.LOCAL_ROUTES_URL, CACHE_ROUTES_KEY)
        ]);

        const fleetRes = fleetResult.data;
        const routesRes = routesResult.data;

        state.fleet = fleetRes?.trenes || (Array.isArray(fleetRes) ? fleetRes : []);
        state.routes = routesRes?.trenes || (Array.isArray(routesRes) ? routesRes : []);
        state.lastUpdated = new Date();

        if (fleetResult.source === 'live') {
            updateStatusIndicator('online', 'Conectado');
        } else {
            updateStatusIndicator('online', 'Datos locales');
        }
        updateHeaderTime();
        renderQuickChips();
        updateFleetTable();

        const countEl = document.getElementById('totalTrainsCount');
        if (countEl) countEl.textContent = state.fleet.length;

        if (state.currentTrain) {
            const updated = findTrain(state.currentTrain.codComercial);
            if (updated) {
                displayTrain(updated, false);
            }
        }
    } catch (error) {
        console.error('Error al actualizar datos:', error);
        updateStatusIndicator('offline', 'Sin conexión');
    }
}

// ============================================================================
// BÚSQUEDA Y SELECCIÓN DE TREN
// ============================================================================

function findTrain(query) {
    if (!query) return null;
    const cleanQ = String(query).trim();
    const normQ = normalizeTrainId(cleanQ);

    // 1. Buscar por código comercial exacto o sin ceros a la izquierda en la flota activa
    let match = state.fleet.find(t => 
        String(t.codComercial).trim() === cleanQ || 
        normalizeTrainId(t.codComercial) === normQ
    );

    if (match) return match;

    // 2. Si no está en flota activa, buscar en las rutas programadas del día
    const routeMatch = state.routes.find(r => 
        String(r.idTren).trim() === cleanQ || 
        normalizeTrainId(r.idTren) === normQ
    );

    if (routeMatch) {
        const first = routeMatch.estaciones?.[0]?.p;
        const last = routeMatch.estaciones?.[routeMatch.estaciones.length - 1]?.p;
        return {
            codComercial: routeMatch.idTren,
            codProduct: 1,
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

    // Asegurar que estamos en la pestaña de búsqueda
    if (state.activeTab !== 'search') {
        switchTab('search');
    }

    const found = findTrain(clean);

    const detailContainer = document.getElementById('trainDetailContainer');
    const emptyPrompt = document.getElementById('emptySearchPrompt');
    const notFoundState = document.getElementById('notFoundState');
    const searchCard = document.getElementById('searchCard');

    if (found) {
        emptyPrompt.style.display = 'none';
        notFoundState.style.display = 'none';
        detailContainer.style.display = 'block';
        displayTrain(found);

        try {
            const url = new URL(window.location);
            url.searchParams.set('tren', found.codComercial);
            window.history.replaceState({}, '', url);
        } catch (e) {}
    } else {
        // Si no se encuentra el tren, mantener visible el buscador para que pueda corregir el número
        if (searchCard) searchCard.style.display = 'block';
        emptyPrompt.style.display = 'none';
        detailContainer.style.display = 'none';
        notFoundState.style.display = 'block';
        document.getElementById('notFoundTitle').textContent = `Tren #${clean} no encontrado`;
        document.getElementById('notFoundMsg').textContent = 
            `Actualmente no hay datos activos para el tren número ${clean}. Revisa el número de tu billete o consulta la lista de trenes en circulación.`;
    }
}

function showSearchForm() {
    if (state.activeTab !== 'search') {
        switchTab('search');
    }
    const searchCard = document.getElementById('searchCard');
    if (searchCard) {
        searchCard.style.display = 'block';
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const input = document.getElementById('trainInput');
    if (input) {
        setTimeout(() => {
            input.focus();
            input.select();
        }, 150);
    }
}

function displayTrain(train, resetMapView = true) {
    state.currentTrain = train;
    const prod = getProductInfo(train.codProduct);
    const delay = formatDelay(train.ultRetraso);
    const mat = getMaterialInfo(train.mat);

    // Ocultar formulario de búsqueda para dejar la tarjeta única limpia y visible arriba
    const searchCard = document.getElementById('searchCard');
    if (searchCard) searchCard.style.display = 'none';

    // Guardar en búsquedas recientes
    saveRecentSearch(train.codComercial, prod.name);

    // 1. Cabecera del tren
    const badge = document.getElementById('detailProductBadge');
    if (badge) {
        badge.textContent = prod.name;
        badge.className = `product-badge ${prod.badge}`;
        badge.style.backgroundColor = prod.color;
    }

    const numEl = document.getElementById('detailTrainNumber');
    if (numEl) numEl.textContent = `Tren #${train.codComercial}`;
    const servEl = document.getElementById('detailServiceName');
    if (servEl) {
        servEl.textContent = train.synthetic
            ? `${prod.name} · Horario programado`
            : `${prod.name} · En circulación`;
    }

    // 2. RETRASO Y ESTADO (PRIMERO EN LA TARJETA)
    const delayIconEl = document.getElementById('detailDelayIcon');
    const delayTextEl = document.getElementById('detailDelayText');
    const delayBanner = document.getElementById('detailDelayBanner');

    let delayClass = 'delay-ontime';
    let icon = '🟢';
    let text = 'EN HORA · Sin retraso';

    if (train.synthetic) {
        delayClass = 'delay-ontime';
        icon = '🕒';
        text = 'PROGRAMADO · Sin retraso registrado';
    } else if (delay.min === 0) {
        delayClass = 'delay-ontime';
        icon = '🟢';
        text = 'EN HORA · Sin retraso';
    } else if (delay.min < 0) {
        delayClass = 'delay-ontime';
        icon = '🟢';
        text = `ADELANTADO · ${Math.abs(delay.min)} min`;
    } else if (delay.min <= 5) {
        delayClass = 'delay-slight';
        icon = '🟡';
        text = `RETRASO LEVE · +${delay.min} min`;
    } else if (delay.min <= 15) {
        delayClass = 'delay-slight';
        icon = '🟡';
        text = `RETRASO · +${delay.min} min`;
    } else {
        delayClass = 'delay-heavy';
        icon = '🔴';
        text = `RETRASO IMPORTANTE · +${delay.min} min`;
    }

    if (delayIconEl) delayIconEl.textContent = icon;
    if (delayTextEl) delayTextEl.textContent = text;
    if (delayBanner) {
        delayBanner.className = `delay-highlight ${delayClass}`;
    }

    // Próxima parada (máximo 15 caracteres, sin paréntesis)
    const nextStationCode = train.codEstSig || train.codDestino;
    const nextStationShort = formatStationMax15(nextStationCode);
    const nextStEl = document.getElementById('detailNextStationShort');
    if (nextStEl) nextStEl.textContent = nextStationShort;

    const nextEtaEl = document.getElementById('detailNextEta');
    if (nextEtaEl) {
        if (train.horaLlegadaSigEst) {
            try {
                const timePart = train.horaLlegadaSigEst.split('T')[1]?.substring(0, 5) || train.horaLlegadaSigEst;
                nextEtaEl.textContent = `Llegada estimada: ${timePart}`;
            } catch (e) {
                nextEtaEl.textContent = 'En camino hacia esta parada';
            }
        } else {
            nextEtaEl.textContent = 'En camino hacia esta parada';
        }
    }

    // 3. TRAYECTO COMPACTO (SEGUNDO EN LA TARJETA, MÁXIMO 15 CARACTERES)
    const originShort = formatStationMax15(train.codOrigen);
    const destShort = formatStationMax15(train.codDestino);
    const origEl = document.getElementById('detailOriginShort');
    if (origEl) origEl.textContent = originShort;
    const destEl = document.getElementById('detailDestinationShort');
    if (destEl) destEl.textContent = destShort;

    // Buscar ruta para horarios de origen y destino
    const route = state.routes.find(r => normalizeTrainId(r.idTren) === normalizeTrainId(train.codComercial));
    const depEl = document.getElementById('detailDepTime');
    const arrEl = document.getElementById('detailArrTime');

    if (route && route.estaciones && route.estaciones.length > 0) {
        const first = route.estaciones[0];
        const last = route.estaciones[route.estaciones.length - 1];
        const depTime = first.hs || first.h || '--:--';
        const arrTime = last.h || last.hs || '--:--';
        if (depEl) depEl.textContent = `Salida: ${depTime}`;
        if (arrEl) arrEl.textContent = `Llegada: ${arrTime}`;
    } else {
        if (depEl) depEl.textContent = 'Salida: --:--';
        if (arrEl) arrEl.textContent = 'Llegada: --:--';
    }

    // 4. DETALLES TÉCNICOS (TERCER DESPLEGABLE)
    const matEl = document.getElementById('detailMaterial');
    if (matEl) matEl.textContent = mat.name;
    const matrEl = document.getElementById('detailMatricula');
    if (matrEl) matrEl.textContent = mat.code !== '--' ? `#${mat.code}` : 'No disponible';
    const accEl = document.getElementById('detailAccessible');
    if (accEl) accEl.textContent = train.accesible ? '♿ Servicio Atendo · PMR Habilitado' : 'Accesibilidad estándar';
    const lastStEl = document.getElementById('detailLastStation');
    if (lastStEl) lastStEl.textContent = train.codEstAnt ? formatStationMax15(train.codEstAnt) : 'Inicio de recorrido';

    // 5. Renderizar Timeline de Estaciones (SEGUNDO DESPLEGABLE)
    renderTimeline(train, route);

    // 6. Renderizar Mapa en Vivo (PRIMER DESPLEGABLE)
    renderMap(train, route, resetMapView);
}

// ============================================================================
// LÍNEA DE TIEMPO E ITINERARIO (TIMELINE)
// ============================================================================

function renderTimeline(train, route) {
    const container = document.getElementById('stationsTimeline');
    const badge = document.getElementById('stopsSummaryBadge');
    if (!container || !badge) return;
    container.innerHTML = '';

    if (!route || !route.estaciones || route.estaciones.length === 0) {
        badge.textContent = '3 puntos clave';
        const fallbackStops = [
            { code: train.codOrigen, statusClass: 'completed', statusText: '✓ Estación de origen', time: 'Salida' },
            { code: train.codEstSig || train.codDestino, statusClass: 'current', statusText: '🚆 Próxima parada', time: 'En ruta' },
            { code: train.codDestino, statusClass: 'upcoming', statusText: 'Destino final', time: 'Meta' }
        ];
        fallbackStops.forEach(s => {
            const step = document.createElement('div');
            step.className = `timeline-step ${s.statusClass}`;
            step.innerHTML = `
                <div class="step-row">
                    <div class="step-info">
                        <span class="step-station-name">${escapeHTML(formatStationMax15(s.code))}</span>
                        <span class="step-status-badge ${s.statusClass}">${escapeHTML(s.statusText)}</span>
                    </div>
                    <div class="step-time-badge">${escapeHTML(s.time)}</div>
                </div>
            `;
            container.appendChild(step);
        });
        return;
    }

    const stops = route.estaciones;
    badge.textContent = `${stops.length} paradas`;

    // Identificar el índice de la próxima parada con comparación normalizada
    const nextCodeNorm = normalizeTrainId(train.codEstSig || '');
    const antCodeNorm = normalizeTrainId(train.codEstAnt || '');

    let nextIndex = stops.findIndex(s => normalizeTrainId(s.p) === nextCodeNorm);
    if (nextIndex === -1 && antCodeNorm) {
        const antIdx = stops.findIndex(s => normalizeTrainId(s.p) === antCodeNorm);
        if (antIdx !== -1) nextIndex = Math.min(antIdx + 1, stops.length - 1);
    }
    if (nextIndex === -1) {
        nextIndex = 0;
    }

    const delayMin = Math.max(0, parseInt(train.ultRetraso, 10) || 0);

    stops.forEach((stop, index) => {
        const step = document.createElement('div');
        const stName = formatStationMax15(stop.p);
        const schedTime = index === 0 ? (stop.hs || stop.h || '--:--') : (stop.h || stop.hs || '--:--');

        let statusClass = 'upcoming';
        let statusText = 'Pendiente';

        if (index < nextIndex) {
            statusClass = 'completed';
            statusText = '✓ Parada superada';
        } else if (index === nextIndex) {
            statusClass = 'current';
            const est = addMinutesToTime(schedTime, delayMin);
            statusText = est ? `🚆 Próxima · Est. ${est}` : '🚆 Próxima parada';
        } else if (delayMin > 0) {
            const est = addMinutesToTime(schedTime, delayMin);
            if (est) statusText = `Pendiente · Est. ${est}`;
        }

        step.className = `timeline-step ${statusClass}`;
        step.innerHTML = `
            <div class="step-row">
                <div class="step-info">
                    <span class="step-station-name">${escapeHTML(stName)}</span>
                    <span class="step-status-badge ${statusClass}">${escapeHTML(statusText)}</span>
                </div>
                <div class="step-time-badge">${escapeHTML(schedTime)}</div>
            </div>
        `;

        // Al pulsar una parada, abrir el mapa y centrar en esa estación
        step.style.cursor = 'pointer';
        step.onclick = () => {
            const coords = getStationCoords(stop.p);
            const accMap = document.getElementById('accordionMap');
            if (accMap && !accMap.open) {
                accMap.open = true;
            }
            if (coords && state.map) {
                setTimeout(() => {
                    state.map.invalidateSize();
                    state.map.setView(coords, 12, { animate: true });
                    if (accMap) accMap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 180);
            }
        };

        container.appendChild(step);
    });
}

// ============================================================================
// MAPA INTERACTIVO (LEAFLET)
// ============================================================================

function initMapIfNeeded() {
    if (state.map || typeof L === 'undefined') return;

    const mapEl = document.getElementById('trainMap');
    if (!mapEl) return;

    state.map = L.map('trainMap', {
        center: [40.4168, -3.7038],
        zoom: 6,
        zoomControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
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

    setTimeout(() => state.map.invalidateSize(), 120);

    const prod = getProductInfo(train.codProduct);
    const bounds = L.latLngBounds();

    // 1. Trazado de la ruta
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

    // 2. Estaciones de la ruta
    if (route && route.estaciones) {
        route.estaciones.forEach(stop => {
            const coords = getStationCoords(stop.p);
            if (coords) {
                const isNext = normalizeTrainId(stop.p) === normalizeTrainId(train.codEstSig);
                const icon = L.divIcon({
                    className: 'station-pin-container',
                    html: `<div class="station-pin-marker ${isNext ? 'current' : ''}"></div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7]
                });

                const marker = L.marker(coords, { icon })
                    .bindPopup(`
                        <strong>${escapeHTML(formatStationMax15(stop.p))}</strong><br>
                        Horario: ${escapeHTML(stop.h || stop.hs || '--:--')}
                    `)
                    .addTo(state.map);

                state.mapLayers.stationMarkers.push(marker);
                bounds.extend(coords);
            }
        });
    }

    // 3. Marcador del tren en vivo
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
                    <strong style="color: ${escapeHTML(prod.color)}; font-size: 15px;">${escapeHTML(prod.name)} #${escapeHTML(train.codComercial)}</strong><br>
                    <strong>Estado:</strong> ${escapeHTML(delay.text)}<br>
                    <strong>Próxima:</strong> ${escapeHTML(formatStationMax15(train.codEstSig))}<br>
                    <strong>Destino:</strong> ${escapeHTML(formatStationMax15(train.codDestino))}
                </div>
            `)
            .addTo(state.map);

        bounds.extend(trainCoords);
    }

    if (shouldFitBounds && bounds.isValid()) {
        state.map.fitBounds(bounds, { padding: [35, 35], maxZoom: 13 });
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

function refreshMap() {
    if (state.map) {
        state.map.invalidateSize();
        if (state.currentTrain && state.currentTrain.latitud && state.currentTrain.longitud) {
            state.map.setView([state.currentTrain.latitud, state.currentTrain.longitud], state.map.getZoom());
        }
    }
}

// ============================================================================
// SUGERENCIAS RÁPIDAS Y AUTOCOMPLETADO
// ============================================================================

function renderQuickChips() {
    const container = document.getElementById('quickChips');
    if (!container) return;

    if (!state.fleet || state.fleet.length === 0) {
        container.innerHTML = '<span class="chip">Esperando datos...</span>';
        return;
    }

    container.innerHTML = '';
    const sampled = state.fleet.slice(0, 6);

    sampled.forEach(t => {
        const prod = getProductInfo(t.codProduct);
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'chip';
        chip.innerHTML = `
            <span class="chip-tag" style="background-color: ${escapeHTML(prod.color)}">${escapeHTML(prod.name)}</span>
            <span>#${escapeHTML(t.codComercial)}</span>
            <small style="color:var(--text-muted);font-weight:700;">${escapeHTML(formatStationMax15(t.codDestino))}</small>
        `;
        chip.onclick = () => {
            switchTab('search');
            const input = document.getElementById('trainInput');
            if (input) input.value = t.codComercial;
            searchTrain(t.codComercial);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        container.appendChild(chip);
    });
}

function handleInputKeydown(e) {
    const dropdown = document.getElementById('autocompleteDropdown');
    if (!dropdown) return;
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

    if (btnClear) btnClear.style.display = query ? 'flex' : 'none';
    if (!dropdown) return;

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
            <div class="item-route">${escapeHTML(formatStationMax15(t.codOrigen))} ➔ ${escapeHTML(formatStationMax15(t.codDestino))}</div>
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
    if (input) {
        input.value = '';
        input.focus();
    }
    const btnClear = document.getElementById('btnClear');
    if (btnClear) btnClear.style.display = 'none';
    const dropdown = document.getElementById('autocompleteDropdown');
    if (dropdown) dropdown.style.display = 'none';
    state.autocompleteSelectedIndex = -1;
}

function handleSearchSubmit(e) {
    e.preventDefault();
    const dropdown = document.getElementById('autocompleteDropdown');
    if (dropdown) dropdown.style.display = 'none';
    state.autocompleteSelectedIndex = -1;
    const input = document.getElementById('trainInput');
    const query = input ? input.value.trim() : '';
    if (query) {
        searchTrain(query);
    }
}

// ============================================================================
// TABLA DE TRENES EN CIRCULACIÓN (FLOTA COMPLETA)
// ============================================================================

function setFleetFilter(type, btnEl) {
    state.fleetFilter = type;
    document.querySelectorAll('.filter-pill').forEach(p => {
        const isMatch = btnEl ? p === btnEl : p.getAttribute('data-filter') === type;
        p.classList.toggle('active', isMatch);
    });
    updateFleetTable();
}

function filterFleetTable() {
    const input = document.getElementById('fleetFilterInput');
    state.fleetSearchQuery = input ? input.value.toLowerCase().trim() : '';
    updateFleetTable();
}

function updateFleetTable() {
    const tbody = document.getElementById('fleetTableBody');
    if (!tbody) return;

    if (!state.fleet || state.fleet.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="table-loading">No hay trenes registrados en circulación en este momento.</td></tr>';
        return;
    }

    let aveCount = 0, avloCount = 0, alviaCount = 0, mdCount = 0, delayCount = 0;
    state.fleet.forEach(t => {
        const p = t.codProduct;
        if (p === 2 || p === 25) aveCount++;
        if (p === 28) avloCount++;
        if (p === 11) alviaCount++;
        if (p === 15 || p === 16 || p === 18 || p === 19) mdCount++;
        if (parseInt(t.ultRetraso, 10) > 5) delayCount++;
    });

    const setElText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    setElText('countAll', state.fleet.length);
    setElText('countAve', aveCount);
    setElText('countAvlo', avloCount);
    setElText('countAlvia', alviaCount);
    setElText('countMd', mdCount);
    setElText('countDelay', delayCount);

    const filtered = state.fleet.filter(t => {
        if (state.fleetFilter === 'AVE' && t.codProduct !== 2 && t.codProduct !== 25) return false;
        if (state.fleetFilter === 'AVLO' && t.codProduct !== 28) return false;
        if (state.fleetFilter === 'Alvia' && t.codProduct !== 11) return false;
        if (state.fleetFilter === 'MD' && (t.codProduct !== 15 && t.codProduct !== 16 && t.codProduct !== 18 && t.codProduct !== 19)) return false;
        if (state.fleetFilter === 'delay' && parseInt(t.ultRetraso, 10) <= 5) return false;

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
            <td><strong>${escapeHTML(formatStationMax15(t.codOrigen))}</strong></td>
            <td><strong>${escapeHTML(formatStationMax15(t.codDestino))}</strong></td>
            <td>${escapeHTML(formatStationMax15(t.codEstSig))}</td>
            <td><span class="table-delay ${escapeHTML(delay.class)}">${escapeHTML(delay.text)}</span></td>
            <td><small>${escapeHTML(mat.name)}</small></td>
            <td><button class="btn-sm" type="button" aria-label="Ver ficha del tren #${escapeHTML(t.codComercial)}">Ver Tren</button></td>
        `;

        tr.onclick = () => {
            switchTab('search');
            const input = document.getElementById('trainInput');
            if (input) input.value = t.codComercial;
            searchTrain(t.codComercial);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        tbody.appendChild(tr);
    });
}

// ============================================================================
// NAVEGACIÓN, PESTAÑAS Y SOPORTE PWA
// ============================================================================

function switchTab(tabId) {
    state.activeTab = tabId;
    const tabSearch = document.getElementById('tabSearch');
    const tabFleet = document.getElementById('tabFleet');
    const secSearch = document.getElementById('sectionSearch');
    const secFleet = document.getElementById('sectionFleet');

    if (tabId === 'search') {
        if (tabSearch) { tabSearch.classList.add('active'); tabSearch.setAttribute('aria-selected', 'true'); }
        if (tabFleet) { tabFleet.classList.remove('active'); tabFleet.setAttribute('aria-selected', 'false'); }
        if (secSearch) secSearch.classList.add('active');
        if (secFleet) secFleet.classList.remove('active');
        if (state.map) {
            setTimeout(() => state.map.invalidateSize(), 150);
        }
    } else if (tabId === 'fleet') {
        if (tabFleet) { tabFleet.classList.add('active'); tabFleet.setAttribute('aria-selected', 'true'); }
        if (tabSearch) { tabSearch.classList.remove('active'); tabSearch.setAttribute('aria-selected', 'false'); }
        if (secFleet) secFleet.classList.add('active');
        if (secSearch) secSearch.classList.remove('active');
    }
}

function showHomeView() {
    switchTab('search');
    const searchCard = document.getElementById('searchCard');
    if (searchCard) searchCard.style.display = 'block';
    clearSearch();
    document.getElementById('trainDetailContainer').style.display = 'none';
    document.getElementById('notFoundState').style.display = 'none';
    document.getElementById('emptySearchPrompt').style.display = 'block';
    state.currentTrain = null;

    try {
        const url = new URL(window.location);
        url.searchParams.delete('tren');
        window.history.replaceState({}, '', url);
    } catch (e) {}
}

function updateStatusIndicator(status, text) {
    const el = document.getElementById('connectionStatus');
    if (!el) return;
    const dot = el.querySelector('.status-dot');
    const label = document.getElementById('statusText');

    if (dot) {
        dot.className = 'status-dot';
        if (status === 'online') {
            dot.classList.add('online');
        } else if (status === 'offline') {
            dot.classList.add('offline');
        } else {
            dot.classList.add('pulsing');
        }
    }
    if (label) label.textContent = text;
}

function updateHeaderTime() {
    if (state.lastUpdated) {
        const timeStr = state.lastUpdated.toLocaleTimeString('es-ES');
        const el = document.getElementById('lastUpdatedText');
        if (el) el.textContent = timeStr;
    }
}

function forceRefresh() {
    const btn = document.getElementById('refreshBtn');
    if (btn) btn.classList.add('spinning');
    refreshData().finally(() => {
        if (btn) setTimeout(() => btn.classList.remove('spinning'), 600);
    });
}

function setupPWA() {
    // 1. Generar Web App Manifest dinámico para que funcione en cualquier ruta (index.html o infotren_ag.html)
    try {
        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="110" fill="#571661"/><text x="256" y="345" font-size="290" text-anchor="middle">🚆</text></svg>`;
        const iconUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(iconSvg);
        const manifest = {
            name: 'InfoTren - Seguimiento de Trenes Renfe',
            short_name: 'InfoTren',
            description: 'Consulta accesible en tiempo real del retraso, próxima parada y recorrido de trenes Renfe.',
            start_url: window.location.href.split('?')[0],
            scope: window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1),
            display: 'standalone',
            orientation: 'portrait',
            background_color: '#f1f5f9',
            theme_color: '#571661',
            lang: 'es-ES',
            icons: [
                {
                    src: iconUrl,
                    sizes: '192x192 512x512',
                    type: 'image/svg+xml',
                    purpose: 'any maskable'
                }
            ]
        };
        const manifestStr = JSON.stringify(manifest);
        let link = document.querySelector('link[rel="manifest"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'manifest';
            document.head.appendChild(link);
        }
        link.href = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(manifestStr);
    } catch (e) {}

    // 2. Registrar Service Worker si está disponible en la carpeta
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')) {
        navigator.serviceWorker.register('./sw.js').catch(() => {});
    }

    // 3. Capturar evento de instalación PWA
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        state.deferredInstallPrompt = e;
        const btn = document.getElementById('installPwaBtn');
        if (btn) btn.style.display = 'inline-flex';
    });

    window.addEventListener('appinstalled', () => {
        state.deferredInstallPrompt = null;
        const btn = document.getElementById('installPwaBtn');
        if (btn) btn.style.display = 'none';
    });
}

async function installPWA() {
    if (state.deferredInstallPrompt) {
        state.deferredInstallPrompt.prompt();
        await state.deferredInstallPrompt.userChoice;
        state.deferredInstallPrompt = null;
        const btn = document.getElementById('installPwaBtn');
        if (btn) btn.style.display = 'none';
    }
}

// ============================================================================
// INICIALIZACIÓN
// ============================================================================

async function init() {
    loadSavedFontScale();
    setupPWA();

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrapper')) {
            const dropdown = document.getElementById('autocompleteDropdown');
            if (dropdown) dropdown.style.display = 'none';
        }
    });

    renderRecentSearches();
    await loadStations();
    await refreshData();

    const urlParams = new URLSearchParams(window.location.search);
    const trainParam = urlParams.get('tren');
    if (trainParam) {
        const input = document.getElementById('trainInput');
        if (input) input.value = trainParam;
        searchTrain(trainParam);
    }

    state.pollTimer = setInterval(() => {
        refreshData(true);
    }, CONFIG.POLL_INTERVAL);
}

window.app = {
    handleSearchSubmit,
    handleInputSearch,
    handleInputKeydown,
    clearSearch,
    showSearchForm,
    shareTrain,
    centerMapOnTrain,
    fitMapToRoute,
    refreshMap,
    switchTab,
    showHomeView,
    setFleetFilter,
    filterFleetTable,
    forceRefresh,
    cycleFontScale,
    installPWA
};

document.addEventListener('DOMContentLoaded', init);
