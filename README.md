# NOIR

NOIR es una experiencia web cinematografica con estilo editorial, pensada como el inicio de una base de datos de cine. El Home combina imagenes grandes, tipografia limpia, lineas finas y movimiento sutil para presentar contenido de TMDB sin perder una identidad visual sobria.

## Inicio

El inicio esta construido como una portada cinematografica. Abre con una intro breve de marca y despues muestra una seleccion dinamica de peliculas, generos y contenido popular.

### Intro

La pagina comienza con una intro de NOIR sobre fondo negro. Incluye el logotipo, lineas horizontales, subtitulo y un pequeno efecto cromatico antes de revelar el Home.

### Hero

El Hero presenta una pelicula destacada con backdrop grande, titulo, metadata, descripcion, puntuacion e ID. El contenido sale de peliculas en tendencia y rota entre una seleccion corta. Tambien incluye:

- `Watch Trailer`: abre un modal interno con trailer de YouTube cuando TMDB tiene video disponible.
- `View Film`: deja preparada la navegacion futura hacia el detalle de pelicula.

### Trending

La seccion Trending muestra peliculas en tendencia y permite cambiar entre:

- Today
- This Week

El cambio se hace sin recargar la pagina.

### Popular

Popular mantiene una composicion editorial en lista. Presenta peliculas populares con numero, titulo, idioma, ano y puntuacion, evitando convertir esta parte en otra cuadricula de posters.

### Now Playing

Now Playing muestra peliculas actualmente en cartelera usando tarjetas con poster, titulo, ano y rating.

### Genres

Genres presenta los generos de peliculas como enlaces editoriales grandes. Cada genero queda preparado para navegar mas adelante a una pagina filtrada.

### Upcoming

Upcoming destaca una pelicula proxima a estrenarse con imagen grande, titulo, fecha y enlace futuro al detalle.

### What's Popular

What's Popular agrega contenido mixto con scroll horizontal y filtros funcionales:

- Streaming
- On TV
- For Rent
- In Theaters

La seccion puede mostrar peliculas o series de TV segun el filtro activo.

### Free To Watch

Free To Watch muestra contenido gratuito disponible para:

- Movies
- TV

Tambien usa scroll horizontal y tarjetas reutilizables.

## Identidad Visual

El Home conserva una estetica de archivo cinematografico: fondo casi negro, blanco calido, grises, mucho espacio negativo, fotografias protagonistas y bordes rectos. La interfaz evita el estilo de plataforma de streaming generica y prioriza una composicion editorial.

## Estado Del Proyecto

Esta rama cierra el Home dinamico. Las paginas completas de Movies, TV, People, Awards, detalles, busqueda y favoritos quedan preparadas solo mediante enlaces para fases posteriores.
