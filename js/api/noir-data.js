const JSON_SERVER_BASE_URL =
    "http://localhost:3000";


const FAVORITES_URL =
    `${JSON_SERVER_BASE_URL}/favorites`;


const RATINGS_URL =
    `${JSON_SERVER_BASE_URL}/ratings`;


async function requestJson(url, options = {}) {

    const response =
        await fetch(url, options);

    if (!response.ok) {
        throw new Error(`JSON Server responded with ${response.status}`);
    }

    return response.json();

}


export async function getFavorite(tmdbId, mediaType = "movie") {

    try {
        const favorites =
            await requestJson(`${FAVORITES_URL}?tmdbId=${tmdbId}&mediaType=${mediaType}`);

        if (favorites[0]) {
            return favorites[0];
        }

        if (mediaType === "movie") {
            const legacyFavorites =
                await requestJson(`${FAVORITES_URL}?movieId=${tmdbId}`);

            return legacyFavorites[0] || null;
        }

        return null;
    } catch {
        return null;
    }

}


export async function toggleFavorite(item, mediaType = "movie") {

    const existingFavorite =
        await getFavorite(item.id, mediaType);

    if (existingFavorite) {
        await fetch(`${FAVORITES_URL}/${existingFavorite.id}`, {
            method: "DELETE"
        });

        return false;
    }

    await requestJson(FAVORITES_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            tmdbId: item.id,
            mediaType,
            title: item.title || item.name,
            poster_path: item.poster_path,
            savedAt: new Date().toISOString()
        })
    });

    return true;

}


export async function getRating(tmdbId, mediaType = "movie") {

    try {
        const ratings =
            await requestJson(`${RATINGS_URL}?tmdbId=${tmdbId}&mediaType=${mediaType}`);

        return ratings[0] || null;
    } catch {
        return null;
    }

}


export async function saveRating(tmdbId, mediaType, value) {

    const existingRating =
        await getRating(tmdbId, mediaType);

    const ratingPayload =
        {
            tmdbId,
            mediaType,
            rating: value
        };

    // El rating NOIR vive separado de Favorites para no mezclarlo con vote_average de TMDB.
    if (existingRating) {
        return requestJson(`${RATINGS_URL}/${existingRating.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(ratingPayload)
        });
    }

    return requestJson(RATINGS_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(ratingPayload)
    });

}


export function getMovieRating(tmdbId) {

    return getRating(tmdbId, "movie");

}


export function saveMovieRating(tmdbId, value) {

    return saveRating(tmdbId, "movie", value);

}
