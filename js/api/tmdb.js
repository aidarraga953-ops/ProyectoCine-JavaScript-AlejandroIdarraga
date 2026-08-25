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
    new URL("../../assets/img/hero-placeholder.webp", import.meta.url).href;


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


const dataCache =
    new Map();


export async function requestCachedTMDB(endpoint, parameters = {}) {

    const cacheKey =
        `${endpoint}:${JSON.stringify(parameters)}`;

    if (!dataCache.has(cacheKey)) {
        dataCache.set(
            cacheKey,
            requestTMDB(endpoint, parameters).catch((error) => {
                dataCache.delete(cacheKey);
                throw error;
            })
        );
    }

    return dataCache.get(cacheKey);

}


export const MOVIE_CATEGORIES =
    {
        popular: {
            title: "POPULAR MOVIES",
            endpoint: "/movie/popular",
            parameters: {
                sort_by: "popularity.desc"
            }
        },
        "now-playing": {
            title: "NOW PLAYING",
            endpoint: "/movie/now_playing",
            parameters: {
                sort_by: "popularity.desc"
            }
        },
        upcoming: {
            title: "UPCOMING MOVIES",
            endpoint: "/movie/upcoming",
            parameters: {
                sort_by: "primary_release_date.asc"
            }
        },
        "top-rated": {
            title: "TOP RATED MOVIES",
            endpoint: "/movie/top_rated",
            parameters: {
                sort_by: "vote_average.desc",
                "vote_count.gte": 300
            }
        }
    };


export function getMovieCategory(category) {

    return MOVIE_CATEGORIES[category] || MOVIE_CATEGORIES.popular;

}
