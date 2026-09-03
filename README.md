# NOIR

NOIR es una experiencia web cinematografica construida con HTML, CSS y JavaScript vanilla. Combina descubrimiento de cine y television, detalle cinematografico, programacion de funciones, seleccion de asientos, reservas, compras, tickets y coleccion personal dentro de una identidad editorial.

El proyecto no busca verse como una plataforma generica de streaming. Su direccion visual toma referencias de cinematecas, archivos filmicos, publicaciones editoriales, fotografia de cine, programacion de sala y tickets fisicos.

## Identidad

NOIR trabaja con una identidad grafica sobria:

- Negro como espacio cinematografico y profundidad.
- Papel blanco frio en el acceso editorial.
- Tipografia de alto contraste, lineas finas y composicion de archivo.
- Posters, backdrops y fotografia como material protagonista.
- Grain, transiciones suaves y movimiento controlado.
- Color contextual tomado de peliculas en detalles, reservas y tickets.
- Mobile tratado como una experiencia propia, no solo como reduccion de desktop.

Expresiones como `NOIR`, `MOTION ARCHIVE`, `CURATED CINEMA` y `EST. 2026` aparecen como parte de esa identidad visual.

## Experiencia

```text
ACCESS
  |
  v
HOME
  |
  v
DISCOVER
  |
  v
MOVIE DETAILS
  |
  v
SCREENING
  |
  v
SELECT SEATS
  |
  v
RESERVATION / PURCHASE
  |
  v
MY TICKETS
```

El usuario puede explorar contenido de TMDB, guardar titulos, calificarlos, consultar funciones disponibles, seleccionar asientos y conservar sus tickets dentro de una sesion local.

## Funcionalidades

### Home

El Home funciona como portada cinematografica. Incluye intro de marca, hero dinamico, peliculas en tendencia, lista popular editorial, secciones de posters, generos, upcoming, contenido popular por tipo de disponibilidad, contenido gratuito, trailers y busqueda global.

### Movies

La pagina Movies carga categorias reales desde TMDB:

- Popular
- Now Playing
- Upcoming
- Top Rated

Incluye filtros por orden, disponibilidad, fechas, genero, certificacion, idioma, score, votos, runtime y keywords. Tambien tiene paginacion mediante `Load More`.

### TV Shows

La pagina TV Shows usa categorias de TMDB:

- Popular
- Airing Today
- On TV
- Top Rated

Incluye filtros por orden, disponibilidad, provider, fechas de primera emision, genero, idioma, score, votos, runtime y keywords.

### People

People muestra personas populares desde TMDB. El detalle de persona incluye informacion principal y creditos de cine/TV usando tarjetas reutilizables.

### Awards

Awards no usa un endpoint oficial de premios de TMDB. El proyecto arma una seleccion editorial a partir de listas reales como peliculas top rated, populares y upcoming, mas consultas complementarias de creditos y trailers.

### Movie Details

Movie Detail muestra poster, backdrop, titulo, overview, fecha de estreno, duracion, generos, director, TMDB score, certificacion, providers, trailer, accion `Save to NOIR`, rating personal y funciones disponibles.

Tambien incluye secciones de screenings, other screenings, weekly releases, recomendaciones y peliculas similares cuando TMDB entrega datos.

### TV Details

TV Detail muestra informacion principal de la serie, temporadas, episodios, creditos, trailer, guardado, rating personal y contenido relacionado.

### Search

La busqueda global usa `/search/multi` de TMDB y muestra resultados de peliculas, series y personas dentro de un modal.

### Login / Register

El acceso usa una composicion editorial: fondo cinematografico oscuro, dos posters de papel blanco frio en desktop y un panel `ACCESS` en mobile. La autenticacion es academica: usuarios en JSON Server y sesion activa en `localStorage`.

### Saved

Saved muestra peliculas y series guardadas por el usuario. Permite quitar elementos del archivo personal.

### Ranked

Ranked muestra los titulos calificados por el usuario, ordenados desde los datos guardados en JSON Server.

## Screenings y Seats

NOIR separa la sala fisica del estado de cada asiento en una funcion.

- `rooms`: define salas, tipo, filas, asientos por fila y capacidad.
- `seats`: define los asientos fisicos de cada sala (`roomId`, fila, numero, codigo, ubicacion y tipo).
- `functions`: define una funcion para una pelicula, sala, fecha, hora y precio.
- `functionSeats`: guarda el estado de cada asiento para una funcion concreta.

Esto evita que un asiento quede ocupado permanentemente por haber sido reservado en otra funcion. Conceptualmente:

```text
Room 01 -> A1 existe fisicamente
Function 10 -> A1 available
Function 11 -> A1 sold
```

`booking.js` carga una funcion, obtiene su sala, trae los asientos fisicos y combina esos datos con `functionSeats` mediante `mergeSeatStatus()`. El mapa de sala se renderiza con JavaScript, no esta escrito manualmente en HTML.

Al reservar o comprar, el sistema revalida que los asientos sigan disponibles, crea la reserva o compra, y actualiza los `functionSeats` correspondientes como `reserved` o `sold`.

## Tickets

My Tickets presenta reservas y compras como tickets fisicos digitales. Cada ticket incluye poster, estado, fecha, hora, sala, asientos, codigo, barcode visual y acciones segun su estado.

El modal de Ticket Details reutiliza el poster/backdrop de la pelicula y aplica una paleta dinamica con `extractMoviePalette()` y `applyMoviePalette()`. Esa paleta vive en variables CSS del contenedor para que una pelicula no contamine visualmente otra.

Estados documentados desde el codigo:

- Reservas visibles: `reserved`, `confirmed`.
- Compras visibles: todos los estados excepto `cancelled`.
- Asientos por funcion: `available`, `reserved`, `sold`.

## Web Components

NOIR usa Web Components nativos de forma puntual, sin frameworks.

### `<movie-card>`

`<movie-card>` es un Custom Element definido en `js/components/movie-card.js`. Extiende `HTMLElement`, se registra con `customElements.define()` y no usa Shadow DOM para conservar intacto el CSS existente.

La tarjeta mantiene las mismas clases visuales:

- `movie-card`
- `movie-card__image-link`
- `movie-card__image`
- `movie-card__rating`
- `movie-card__info`
- `movie-card__title`
- `movie-card__year`

Ejemplo real de uso desde JavaScript:

```js
const card = document.createElement("movie-card");
card.mediaType = "movie";
card.media = movie;
container.append(card);
```

Las funciones `createMovieCard()` y `createMediaCard()` siguen existiendo como wrappers compatibles, por lo que Home, Movies, TV, Person Detail y Movie Detail pueden renderizar la misma tarjeta sin cambiar su diseno ni sus estilos.

No se convirtieron navbar, tickets ni rating a Web Components en este cierre porque tienen mas estado, persistencia o interaccion. Mantenerlos como modulos fue la opcion de menor riesgo.

## Arquitectura

```text
NOIR/
|-- assets/
|   |-- icons/
|   |-- img/
|-- css/
|   |-- animations.css
|   |-- main.css
|   |-- reset.css
|   |-- variables.css
|-- js/
|   |-- animations/
|   |-- api/
|   |-- components/
|   |-- effects/
|   |-- pages/
|   |-- utils/
|-- pages/
|-- db.example.json
|-- index.html
|-- package.json
|-- package-lock.json
|-- README.md
```

### Modulos principales

| Archivo | Responsabilidad |
| --- | --- |
| `js/api/tmdb.js` | Cliente TMDB, imagenes, categorias y cache en memoria. |
| `js/api/cinema-api.js` | Funciones, salas, asientos, reservas, compras y tickets. |
| `js/api/noir-auth.js` | Registro, login y sesion local. |
| `js/api/noir-data.js` | Favorites y ratings del usuario. |
| `js/components/movie-card.js` | Web Component y wrappers para tarjetas de pelicula/TV. |
| `js/components/noir-actions.js` | Save to NOIR y rating personal. |
| `js/components/user-navigation.js` | Navegacion de usuario, links personales y logout. |
| `js/utils/movie-palette.js` | Extraccion y aplicacion de paleta desde imagenes TMDB. |

## TMDB API

El proyecto usa TMDB como fuente de informacion cinematografica. Endpoints usados en el codigo:

- `/trending/movie/{period}`
- `/movie/popular`
- `/movie/now_playing`
- `/movie/upcoming`
- `/movie/top_rated`
- `/discover/movie`
- `/genre/movie/list`
- `/search/multi`
- `/search/keyword`
- `/movie/{id}`
- `/movie/{id}/credits`
- `/movie/{id}/videos`
- `/movie/{id}/images`
- `/movie/{id}/keywords`
- `/movie/{id}/similar`
- `/movie/{id}/recommendations`
- `/movie/{id}/watch/providers`
- `/movie/{id}/release_dates`
- `/tv/popular`
- `/tv/airing_today`
- `/tv/on_the_air`
- `/tv/top_rated`
- `/discover/tv`
- `/genre/tv/list`
- `/watch/providers/tv`
- `/tv/{id}`
- `/tv/{id}/credits`
- `/tv/{id}/videos`
- `/tv/{id}/keywords`
- `/tv/{id}/similar`
- `/tv/{id}/recommendations`
- `/tv/{id}/season/{seasonNumber}`
- `/person/popular`
- `/person/{id}`
- `/person/{id}/movie_credits`
- `/person/{id}/tv_credits`

Este producto utiliza la API de TMDB, pero no esta respaldado, certificado ni aprobado por TMDB.

## JSON Server

JSON Server persiste los datos propios de NOIR. La base inicial esta en `db.example.json`.

Colecciones reales:

| Coleccion | Uso |
| --- | --- |
| `users` | Usuarios registrados. |
| `favorites` | Titulos guardados por usuario. |
| `ratings` | Calificaciones personales. |
| `billboard` | Espacio preparado para cartelera. |
| `rooms` | Salas fisicas. |
| `seats` | Asientos fisicos por sala. |
| `functions` | Funciones por pelicula, sala, fecha y hora. |
| `functionSeats` | Estado de cada asiento en cada funcion. |
| `reservations` | Reservas creadas por usuarios. |
| `purchases` | Compras de tickets. |

## Persistencia

| Capa | Responsabilidad |
| --- | --- |
| TMDB | Peliculas, series, personas, posters, backdrops, trailers, providers y metadata. |
| JSON Server | Usuarios, favoritos, ratings, funciones, asientos por funcion, reservas y compras. |
| `localStorage` | Usuario actual de la sesion academica. |
| Cache en memoria | Respuestas TMDB durante la sesion del navegador. |

No se usa `sessionStorage` en el codigo actual.

## Instalacion

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar TMDB

Copiar el archivo seguro de ejemplo:

```bash
cp js/api/tmdb.config.example.js js/api/tmdb.config.js
```

En Windows PowerShell:

```powershell
Copy-Item js/api/tmdb.config.example.js js/api/tmdb.config.js
```

Luego reemplazar `YOUR_TMDB_READ_ACCESS_TOKEN` por un API Read Access Token v4 de TMDB.

`js/api/tmdb.config.js` esta ignorado por Git y no debe subirse.

### 3. Crear base local

```bash
cp db.example.json db.json
```

En Windows PowerShell:

```powershell
Copy-Item db.example.json db.json
```

### 4. Iniciar JSON Server

```bash
npm run server
```

Este comando levanta JSON Server en:

```text
http://localhost:3000
```

### 5. Abrir el frontend

El proyecto no define un script de frontend en `package.json`. Debe servirse como sitio estatico desde la raiz del repositorio, por ejemplo con Live Server de VS Code, y abrir:

```text
index.html
```

## Responsive

El proyecto incluye reglas responsive para:

- Navegacion y menus.
- Grids de peliculas y series.
- Rating visible en mobile sin depender solo de hover.
- Movie Detail y TV Detail.
- Screenings y Other Screenings.
- Seat map con viewport horizontal controlado.
- Tickets y Ticket Details.
- Login/Register: dos posters en desktop; solo ACCESS en mobile.

## Stack

- HTML5
- CSS3
- JavaScript vanilla
- ES Modules
- Web Components nativos
- TMDB API
- JSON Server
- LocalStorage
- Git / GitHub

No usa React, Vue, Angular, Lit, Stencil ni bundler.

## Git Flow

El historial muestra trabajo con ramas `develop` y `feature/*`, integradas mediante merges. Ejemplos visibles:

- `feature/login`
- `feature/awards`
- `feature/funciones`
- `feature/tv`
- `feature/home`

## Git & Gitmoji

El historial usa commits descriptivos con Gitmoji y, en varios casos, estructura tipo Conventional Commits.

| Gitmoji | Tipo | Uso |
| --- | --- | --- |
| `✨` | feat | Nueva funcionalidad o cierre de experiencia. |
| `🎨` | style | Cambios visuales y refinamiento de UI. |
| `🎟️` | feat/style | Tickets, boleteria y sala. |
| `🎞️` | style | Atmosfera cinematografica. |
| `🔧` | chore | Configuracion tecnica. |
| `📝` | docs | Documentacion. |

Ejemplos reales del historial:

```text
🎞️ Crear atmósfera cinematográfica para el acceso
✨ feat: mejora fondos, distribución y diseño de funciones
🎨 style: mejora la composición visual del detalle y las funciones
🎟️ mejora el diseño de los tickets y la experiencia móvil de la sala
📝 docs: explicar contenido del home
```

## Limitaciones

- La autenticacion es academica: JSON Server y `localStorage` no son seguridad de produccion.
- JSON Server es una persistencia local para desarrollo/portfolio.
- TMDB requiere configuracion manual del token.
- No hay suite automatizada de tests configurada en `package.json`.
- El frontend no tiene script propio de servidor estatico en `package.json`.

## Creditos

NOIR utiliza TMDB como fuente de informacion cinematografica, imagenes, trailers y metadata. Este proyecto no esta afiliado, certificado ni respaldado por TMDB.

