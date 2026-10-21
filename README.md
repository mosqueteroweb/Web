# InfoTren Renfe & Web Projects

[![Autor](https://img.shields.io/badge/Autor-Mosqueteroweb-FF6F00?style=flat&logo=github)](https://github.com/mosqueteroweb)
[![Licencia](https://img.shields.io/badge/Licencia-GPLv3-blue.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-Ready-success.svg)](Renfe/)

Repositorio oficial de **InfoTren Renfe** y proyectos web de Pedro Mosqueteroweb.

---

## 📁 Estructura del Repositorio

- **`Renfe/`**: Aplicación web progresiva (PWA) de telemetría y seguimiento en tiempo real de trenes Renfe (Larga Distancia, AVE, Avlo, Alvia, Media Distancia).
  - `index.html`: Pantalla principal responsiva y accesible (+80 años).
  - `src/`: Arquitectura modular ES6 (`config.js`, `state.js`, `utils.js`, `api.js`, `map.js`, `main.js`).
  - `data/`: Datos estáticos y respaldo local de telemetría (`flotaLD.json`, `trenesConEstacionesLD.json`, `stations.json`).
  - `sw.js`: Service Worker PWA optimizado (v6).
  - `logo_mosqueteroweb.png`: Imagen de marca y autoría oficial.
- **`proxy-worker/`**: Cloudflare Worker privado y seguro para resolver restricciones CORS hacia las APIs de Renfe con Edge Caching de 30 segundos.
- **`solar/`**: Prototipos y herramientas de cálculo de radiación y ahorro solar.
- **`.github/workflows/`**: 
  - `ci.yml`: Validación continua de sintaxis JS, HTML y coherencia de JSON.
  - `update-trains.yml`: Sincronización programada de telemetría Renfe.

---

## 👤 Autor

Desarrollado con dedicación por **Pedro Mosqueteroweb**.
- **GitHub**: [@mosqueteroweb](https://github.com/mosqueteroweb)
- **Contacto**: `mosqueteroweb@gmail.com`
- **Licencia**: GNU General Public License v3.0 ([GPL-3.0](LICENSE))
