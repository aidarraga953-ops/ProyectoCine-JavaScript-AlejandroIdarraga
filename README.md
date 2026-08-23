# NOIR

Aplicacion web cinematografica construida con HTML, CSS y JavaScript Vanilla.

## TMDB

Para cargar datos reales en el Home, copia el archivo de ejemplo:

```text
js/api/tmdb.config.example.js
```

como:

```js
js/api/tmdb.config.js
```

Luego pega tu API Read Access Token (v4) en esta variable:

```js
export const TMDB_ACCESS_TOKEN = "";
```

`js/api/tmdb.config.js` esta incluido en `.gitignore`, asi que no debe subirse a GitHub. No dupliques la credencial en otros archivos.

La region de disponibilidad para Streaming, For Rent y Free To Watch se centraliza en:

```js
export const WATCH_REGION = "CO";
```

Puede cambiarse mas adelante si el proyecto se prueba en otro pais.
