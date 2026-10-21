/**
 * InfoTren Renfe - Comunicación con APIs y carga de datos
 */

import { CONFIG, CACHE_FLEET_KEY, CACHE_ROUTES_KEY } from './config.js';
import { state } from './state.js';

export async function fetchWithFallback(url, localFallbackUrl, cacheKey) {
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
    if (typeof window !== 'undefined') {
        if (cacheKey === CACHE_FLEET_KEY && window.EMBEDDED_FLEET_FALLBACK) {
            return { data: window.EMBEDDED_FLEET_FALLBACK, source: 'embedded' };
        }
        if (cacheKey === CACHE_ROUTES_KEY && window.EMBEDDED_ROUTES_FALLBACK) {
            return { data: window.EMBEDDED_ROUTES_FALLBACK, source: 'embedded' };
        }
    }

    throw new Error('No se pudo conectar a los servicios de Renfe.');
}

export async function loadStations() {
    if (Object.keys(state.stations).length > 500) {
        return; // Ya están cargadas en memoria
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
