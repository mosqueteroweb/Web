Act as a senior software engineer and graphics developer specialized in physics simulation and scientific visualization.

## OBJECTIVE
Create the most realistic, detailed, and advanced Solar System simulation possible, contained in a SINGLE `index.html` file with embedded HTML, CSS, and JavaScript (<style> and <script> tags). It must work by opening the file directly in the browser: no server, no build step, no dependencies, no CDNs, and no external images (fully offline). Use native Canvas 2D or WebGL; do not use libraries such as Three.js. All textures must be procedurally generated.

## 1. PHYSICS AND ASTRONOMY
- Real Keplerian orbits using J2000 epoch orbital elements: semi-major axis (a), eccentricity (e), inclination (i), longitude of the ascending node (Ω), argument of perihelion (ω), and mean anomaly (M0).
- Solve Kepler's equation with Newton-Raphson (with controlled convergence) and convert to 3D ecliptic coordinates.
- Include: the Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, and the dwarf planets Ceres, Pluto, Eris, Haumea, and Makemake.
- Major moons with their own orbits: Moon, Phobos, Deimos, Io, Europa, Ganymede, Callisto, Titan, Enceladus, Rhea, Triton, Charon.
- Asteroid belt (≥3000 bodies) and Kuiper belt (≥1500) with realistic distribution, including Kirkwood gaps and basic resonances with Jupiter.
- At least 2 comets (e.g. Halley) on highly eccentric orbits; the tail must always point away from the Sun, with its intensity and length depending on heliocentric distance.
- Axial rotation with real period and real obliquity for each body (retrograde Venus, Uranus tilted ~98°, etc.).
- Optional "N-body" mode: gravitational integration with Velocity Verlet or RK4 (fixed timestep, real G) for Sun + planets, switchable with the Keplerian mode. Display total energy drift as an accuracy indicator.
- Time control: pause, play, speed from 1 s/s up to 100 years/s, reverse time, and a visible simulated date (Julian/Gregorian calendar). Buttons to jump to "today" and to arbitrary dates.

## 2. RENDERING
- 3D view with perspective projection and a free orbital camera (rotate, zoom, pan) with smooth inertia.
- Two switchable scale modes: "realistic" (proportional sizes and distances) and "didactic" (exaggerated sizes and compressed distances using a logarithmic or square-root scale).
- Sun with corona and glow (simulated bloom), procedural sunspots and granulation.
- Planets with procedural textures (fractal Perlin/Simplex noise): continents and oceans on Earth, animated clouds, bands and the Great Red Spot on Jupiter, craters on Mercury/Moon, etc.
- Directional lighting from the Sun with a day/night terminator and city lights on Earth's night side.
- Saturn's rings (and faint rings for Jupiter, Uranus, and Neptune) with transparency, divisions (Cassini Division), and cast shadows on the planet and from the planet onto the rings.
- Atmospheres with scattering (limb halo).
- Realistic starfield with ≥5000 stars of varying brightness and color, plus a procedural Milky Way.
- Fading orbital trails, plus togglable full orbit lines.
- Name labels that do not overlap, with smart occlusion/hiding.
- Solar and lunar eclipses visible when approaching Earth.

## 3. INTERFACE (HUD)
- Collapsible side panel with a list of bodies; clicking one makes the camera smoothly follow it.
- Data sheet for the selected body: radius, mass, gravity, orbital and rotation periods, current distance to the Sun and to Earth, instantaneous orbital velocity, mean temperature, number of moons.
- Toggles: orbits, labels, trails, belts, comets, scale, N-body mode, rings, stars.
- FPS meter, body counter, and per-frame computation time.
- Distance ruler between two bodies with light travel time (e.g. "Earth–Mars: 12 light-minutes").
- Documented keyboard shortcuts (spacebar = pause, +/- = speed, 1-9 = jump to planet, F = follow, R = reset view, H = help).
- Dark, modern, responsive design with smooth CSS transitions.

## 4. PERFORMANCE AND CODE QUALITY
- Loop with requestAnimationFrame and delta time; no memory leaks; ≥60 FPS on an average laptop.
- Reusable objects, typed buffers (Float32Array), and culling/LOD for asteroids and stars.
- Procedural textures generated only once on offscreen canvases and cached.
- Code organized in clearly commented sections: physical constants, astronomical data, math (vectors, matrices, noise), orbital engine, rendering, camera, UI, main loop.
- No unnecessary stray globals (use modules/IIFE/classes), no console errors, handle window resizing and inactive tabs.
- Data and constants with units noted in comments (km, AU, kg, days, radians).

## 5. DELIVERY
1. First, a brief architecture plan (max 15 lines).
2. Then, the COMPLETE `index.html` file in a single code block, without omitting parts or using placeholders like "// rest of the code here".
3. At the end, a list of implemented features, known limitations, and how to test each feature.

## ACCEPTANCE CRITERIA (I will check them one by one)
- Opens with no console errors by double-clicking the file.
- Earth completes an orbit in ~365.25 simulated days and Mercury in ~88.
- Eccentricity is visibly noticeable for Mercury, Mars, Pluto, and the comet.
- Comet tails always point away from the Sun.
- Venus rotates retrograde and Uranus rolls "on its side".
- N-body mode keeps energy drift below 0.01% over one simulated year.
- Selecting a body shows data consistent with real values.
- Runs smoothly with ≥5000 objects on screen.