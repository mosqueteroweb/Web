/**
 * InfoTren Renfe - Estado reactivo global
 */

export const state = {
    fleet: [],
    routes: [],
    stations: (typeof window !== 'undefined' && window.EMBEDDED_STATIONS) ? window.EMBEDDED_STATIONS : {},
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
