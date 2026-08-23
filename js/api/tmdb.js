import {
    TMDB_ACCESS_TOKEN,
    TMDB_API_BASE_URL,
    TMDB_IMAGE_BASE_URL,
    WATCH_REGION
} from "./tmdb.config.js";

export {
    WATCH_REGION
};


export const FALLBACK_IMAGE =
    "./assets/img/hero-placeholder.webp";


/**
 * Construye URLs de imagenes de TMDB para posters y backdrops.
 */
export function getImageUrl(path, size = "w780") {

    if (!path) {
        return FALLBACK_IMAGE;
    }

    return `${TMDB_IMAGE_BASE_URL}/${size}${path}`;

}


/**
 * Realiza una peticion GET sencilla a TMDB.
 */
export async function requestTMDB(endpoint, parameters = {}) {

    if (!TMDB_ACCESS_TOKEN) {
        throw new Error(
            "Falta configurar TMDB_ACCESS_TOKEN en js/api/tmdb.config.js"
        );
    }

    const url =
        new URL(`${TMDB_API_BASE_URL}${endpoint}`);

    Object.entries(parameters).forEach(([key, value]) => {

        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }

    });

    const response =
        await fetch(url, {
            headers: {
                Authorization: `Bearer ${TMDB_ACCESS_TOKEN}`,
                accept: "application/json"
            }
        });

    if (!response.ok) {
        throw new Error(
            `TMDB respondio con estado ${response.status} para ${endpoint}`
        );
    }

    // .json() transforma la respuesta HTTP en datos JavaScript utilizables.
    return response.json();

}
