/**
 * InfoTren Renfe - Configuración y constantes del sistema
 */

export const customProxy = (typeof localStorage !== 'undefined' && localStorage.getItem('infotren_custom_proxy')) || 
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('proxy'));

export const CONFIG = {
    CORS_PROXIES: [
        ...(customProxy ? [customProxy] : []),
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

export const PRODUCTS = {
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

export const ROLLING_STOCK = {
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

export const RECENT_KEY = 'infotren_recent_searches';
export const FONT_SCALE_KEY = 'infotren_font_scale';
export const CACHE_FLEET_KEY = 'infotren_cached_fleet';
export const CACHE_ROUTES_KEY = 'infotren_cached_routes';
