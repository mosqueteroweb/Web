/**
 * InfoTren Renfe - Utilidades, seguridad y formateo
 */

import { PRODUCTS, ROLLING_STOCK, FONT_SCALE_KEY, RECENT_KEY } from './config.js';
import { state } from './state.js';

export function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function sanitizeInput(str) {
    if (!str) return '';
    return String(str).trim().replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ.-]/g, '').substring(0, 20);
}

export function normalizeTrainId(val) {
    if (!val) return '';
    const clean = String(val).trim().replace(/^0+/, '');
    return clean || '0';
}

export function getProductInfo(code) {
    return PRODUCTS[code] || { name: 'Tren Renfe', badge: 'renfe', color: '#571661' };
}

export function getMaterialInfo(mat) {
    if (!mat) return { name: 'Composición Renfe', code: '--' };
    const strMat = String(mat);
    const prefix = strMat.substring(0, 3);
    const series = ROLLING_STOCK[prefix] || `Serie ${prefix}`;
    return {
        name: series,
        code: strMat
    };
}

export function lookupStation(code) {
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

export function getStationName(codeOrName) {
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

export function formatStationMax15(codeOrName) {
    if (!codeOrName) return '--';
    const raw = getStationName(codeOrName);
    if (!raw || raw === 'Estación') return '--';

    const lower = raw.toLowerCase();

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

export function cleanStationName(codeOrName) {
    return formatStationMax15(codeOrName);
}

export function getStationCoords(code) {
    const st = lookupStation(code);
    if (st && st.lat && st.lon) {
        return [st.lat, st.lon];
    }
    return null;
}

export function formatDelay(delayStr) {
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

export function addMinutesToTime(hhmm, minutesToAdd) {
    if (!hhmm || !/^\d{2}:\d{2}$/.test(hhmm) || !minutesToAdd || minutesToAdd <= 0) return null;
    const [h, m] = hhmm.split(':').map(Number);
    const total = (h * 60 + m + minutesToAdd) % (24 * 60);
    const nh = String(Math.floor(total / 60)).padStart(2, '0');
    const nm = String(total % 60).padStart(2, '0');
    return `${nh}:${nm}`;
}

export function isIOSDevice() {
    if (typeof navigator === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function applyFontScale(idx) {
    state.fontScaleIndex = idx % 3;
    const html = document.documentElement;
    const btn = document.getElementById('fontScaleBtn');
    if (!html) return;
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

export function cycleFontScale() {
    applyFontScale(state.fontScaleIndex + 1);
}

export function loadSavedFontScale() {
    try {
        const saved = parseInt(localStorage.getItem(FONT_SCALE_KEY), 10);
        if (!isNaN(saved) && saved >= 0 && saved <= 2) {
            applyFontScale(saved);
        }
    } catch (e) {}
}

export function getRecentSearches() {
    try {
        const stored = localStorage.getItem(RECENT_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}
