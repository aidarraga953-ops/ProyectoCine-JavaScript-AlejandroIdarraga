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


export async function getFavorite(tmdbId) {

    try {
        const favorites =
            await requestJson(`${FAVORITES_URL}?movieId=${tmdbId}`);

        return favorites[0] || null;
    } catch {
        return null;
    }

}


export async function toggleFavorite(movie) {

    const existingFavorite =
        await getFavorite(movie.id);

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
            movieId: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            savedAt: new Date().toISOString()
        })
    });

    return true;

}


export async function getMovieRating(tmdbId) {

    try {
        const ratings =
            await requestJson(`${RATINGS_URL}?tmdbId=${tmdbId}&mediaType=movie`);

        return ratings[0] || null;
    } catch {
        return null;
    }

}


export async function saveMovieRating(tmdbId, value) {

    const existingRating =
        await getMovieRating(tmdbId);

    const ratingPayload =
        {
            tmdbId,
            mediaType: "movie",
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
