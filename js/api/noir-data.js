import {
    getCurrentUser
} from "./noir-auth.js";

import {
    JSON_SERVER_URL
} from "./json-server.js";


const FAVORITES_URL =
    `${JSON_SERVER_URL}/favorites`;


const RATINGS_URL =
    `${JSON_SERVER_URL}/ratings`;


async function requestJson(url, options = {}) {

    const response =
        await fetch(url, options);

    if (!response.ok) {
        throw new Error(`JSON Server responded with ${response.status}`);
    }

    return response.json();

}


export async function getFavorite(tmdbId, mediaType = "movie") {

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        return null;
    }

    try {
        const favorites =
            await requestJson(`${FAVORITES_URL}?userId=${currentUser.id}&tmdbId=${tmdbId}&mediaType=${mediaType}`);

        if (favorites[0]) {
            return favorites[0];
        }

        return null;
    } catch {
        return null;
    }

}

export async function getCurrentUserFavorites() {

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        return [];
    }

    const favorites =
        await requestJson(`${FAVORITES_URL}?userId=${currentUser.id}`);

    return favorites.sort((a, b) => {
        return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
    });

}


export async function removeFavorite(favoriteId) {

    const response =
        await fetch(`${FAVORITES_URL}/${favoriteId}`, {
            method: "DELETE"
        });

    if (!response.ok) {
        throw new Error(`JSON Server responded with ${response.status}`);
    }

}


export async function toggleFavorite(item, mediaType = "movie") {

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        throw new Error("Sign in required.");
    }

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
            userId: currentUser.id,
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

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        return null;
    }

    try {
        const ratings =
            await requestJson(`${RATINGS_URL}?userId=${currentUser.id}&tmdbId=${tmdbId}&mediaType=${mediaType}`);

        return ratings[0] || null;
    } catch {
        return null;
    }

}

export async function getCurrentUserRatings() {

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        return [];
    }

    const ratings =
        await requestJson(`${RATINGS_URL}?userId=${currentUser.id}`);

    return ratings.sort((a, b) => {
        return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });

}


export async function saveRating(tmdbId, mediaType, value) {

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        throw new Error("Sign in required.");
    }

    const existingRating =
        await getRating(tmdbId, mediaType);

    const ratingPayload =
        {
            tmdbId,
            userId: currentUser.id,
            mediaType,
            rating: value,
            updatedAt: new Date().toISOString()
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
