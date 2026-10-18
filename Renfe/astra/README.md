# InfoTren · Astra

Abrir `infotren.html` mediante HTTPS. Aplicación independiente de seguimiento de trenes de Larga y Media Distancia de Renfe. HTML, CSS, JavaScript, Leaflet 1.9.4 y catálogo de estaciones integrados en el HTML. Leaflet conserva su cabecera de licencia BSD-2-Clause.

## Instalación

Chrome/Edge: «Instalar InfoTren» o menú de instalación del navegador. iPhone/iPad: Compartir → Añadir a pantalla de inicio. Se requiere una primera visita con conexión. El manifiesto y el service worker tienen alcance exclusivo a esta carpeta.

## Datos y límites

Consulta los servicios públicos flotaLD.json y trenesConEstacionesLD.json de Renfe cada 30 segundos, con pausa manual y cuando la pestaña está oculta. El acceso usa intermediarios CORS públicos y puede fallar: no existe garantía de disponibilidad. El número de tren no se envía en las solicitudes; la búsqueda se realiza en la flota descargada.

La señal se considera reciente únicamente si el timestamp individual tiene menos de 3 minutos y la consulta ha funcionado. Se distingue una respuesta vacía, un fallo de conexión, un tren desaparecido, un itinerario sin telemetría y una posición sin fecha. No se usan snapshots del repositorio como si fueran datos en vivo.

Sin conexión se puede abrir la aplicación y consultar la última flota guardada, con advertencia. Mapas y datos nuevos necesitan red. Horarios del operador en hora peninsular; el trazado une puntos publicados y no garantiza geometría ferroviaria exacta. El catálogo de estaciones incorporado puede necesitar actualizaciones. Algunos códigos comerciales no documentados se muestran como «Servicio Renfe» en lugar de asignarles un nombre dudoso.

## Correcciones y mejoras

- Datos antiguos y retrasos desconocidos ya no se anuncian como «en vivo» o «en hora».
- No se inventa la próxima parada ni se truncan nombres de estación.
- Búsqueda con y sin ceros iniciales, enlace directo, compartir y búsquedas recientes.
- Selección limpia tras una búsqueda fallida; vuelta al inicio y accesos rápidos corregidos.
- Filtros independientes del evento global, productos normalizados, retrasos desde un minuto.
- Solicitudes con timeout, validación de respuesta y sin refrescos solapados.
- Diseño móvil sin desbordamiento de pestañas, controles táctiles, foco visible, navegación por teclado y movimiento reducido.
- PWA con manifiesto, iconos locales y caché limitada a su propia carpeta; no intercepta otras aplicaciones ni guarda respuestas de telemetría en la caché del service worker.

## Verificación — 18 de octubre de 2026

19 comprobaciones automatizadas de regresión y 4 casos del service worker (precarga, limpieza acotada, enlace directo sin red, exclusión de telemetría). Revisión visual a 390 px y escritorio. Navegador real: búsqueda del 00605, actualización de registro y previsión, mapa, paradas, filtros y navegación. No constituye garantía sobre todos los dispositivos ni sobre futuras respuestas de Renfe.
