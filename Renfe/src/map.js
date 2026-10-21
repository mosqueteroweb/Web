/**
 * InfoTren Renfe - Gestión del Mapa Interactivo (Leaflet)
 */

import { state } from './state.js';
import { getProductInfo, formatStationMax15, escapeHTML, formatDelay, normalizeTrainId, getStationCoords } from './utils.js';

export function initMapIfNeeded() {
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

export function clearMapLayers() {
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

export function renderMap(train, route, shouldFitBounds = true) {
    initMapIfNeeded();
    clearMapLayers();
    if (!state.map || typeof L === 'undefined') return;

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

export function centerMapOnTrain() {
    if (state.currentTrain && state.currentTrain.latitud && state.currentTrain.longitud && state.map) {
        state.map.setView([state.currentTrain.latitud, state.currentTrain.longitud], 11, { animate: true });
        if (state.mapLayers.trainMarker) {
            state.mapLayers.trainMarker.openPopup();
        }
    }
}

export function fitMapToRoute() {
    if (state.mapLayers.routeLine && state.map) {
        state.map.fitBounds(state.mapLayers.routeLine.getBounds(), { padding: [30, 30] });
    }
}

export function refreshMap() {
    if (state.map) {
        state.map.invalidateSize();
        if (state.currentTrain && state.currentTrain.latitud && state.currentTrain.longitud) {
            state.map.setView([state.currentTrain.latitud, state.currentTrain.longitud], state.map.getZoom());
        }
    }
}
