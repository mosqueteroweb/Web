# 🚆 InfoTren Renfe - Seguimiento en Tiempo Real

Aplicación web interactiva y ligera para consultar cualquier **número de tren de Renfe** y obtener en tiempo real:
- **Estado de puntualidad y retraso** (en minutos exactos).
- **Servicio y producto comercial** (AVE, Avlo, Alvia, Avant, Euromed, Media Distancia, etc.).
- **Material rodante y composición** (Talgo 350 S-102/112 "Pato", Siemens Velaro S-103, Talgo Avril S-106, S-120/130/730, S-599, etc.).
- **Posición GPS en directo** sobre mapa interactivo (Leaflet + OpenStreetMap / CartoDB).
- **Trazado completo del itinerario** y secuencia de paradas.
- **Horarios programados y estimados** para cada estación intermedia.
- **Explorador de la flota completa** en circulación en España.

Diseñada específicamente para alojarse en **GitHub Pages** sin necesidad de servidor propio (100% estático).

---

## 🚀 Despliegue en GitHub Pages (en el repositorio `mosqueteroweb/web`)

La aplicación está contenida en la carpeta `Renfe/` para convivir de forma ordenada con el resto del sitio web.

Estará accesible en:
**`https://mosqueteroweb.github.io/web/Renfe/`**

---

### Pasos para subir cambios a GitHub

```bash
git add Renfe/
git commit -m "feat: anadir aplicacion Renfe en tiempo real"
git push origin main
```

---

## 🛠️ Estructura de la Carpeta `Renfe/`

```text
├── Renfe/
│   ├── index.html                       # Buscador, mapas interactivos y paneles
│   ├── style.css                        # Estilos responsivos
│   ├── app.js                           # Lógica cliente y telemetría en vivo
│   ├── data/
│   │   ├── stations.json                # Catálogo unificado de estaciones (Adif/Renfe)
│   │   ├── flotaLD.json                 # Snapshot de respaldo de trenes activos
│   │   └── trenesConEstacionesLD.json   # Snapshot de respaldo de secuencias e itinerarios
│   └── README.md                        # Documentación específica
```

---

## 📡 Fuentes de Datos
- **Portal de Datos Abiertos de Renfe** (`data.renfe.com`) y Adif.
- **Servicios telemáticos en tiempo real de Larga y Media Distancia** (`tiempo-real.largorecorrido.renfe.com`).
- **Mapas**: OpenStreetMap y CartoDB Voyager vía Leaflet 1.9.4.
