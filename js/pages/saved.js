import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestTMDB
} from "../api/tmdb.js";

import {
    getCurrentUser
} from "../api/noir-auth.js";

import {
    getCurrentUserFavorites,
    removeFavorite
} from "../api/noir-data.js";

import {
    initializeUserNavigation
} from "../components/user-navigation.js";

import {
    initializeScrollReveals
} from "../effects/reveal-on-scroll.js";


function getElement(selector) {

    return document.querySelector(selector);

}


function getDetailHref(item, mediaType = "movie") {

    if (mediaType === "tv") {
        return `./tv-details.html?id=${item.id}`;
    }

    return `./movie.html?id=${item.id}`;

}


function renderState(message, action = null) {

    const grid =
        getElement("#savedGrid");

    if (!grid) {
        return;
    }

    grid.replaceChildren();

    const state =
        document.createElement("article");

    state.className =
        "member-archive-empty";

    const title =
        document.createElement("h2");

    title.textContent =
        message;

    const text =
        document.createElement("p");

    text.textContent =
        action || "Explore films and build your archive.";

    state.append(title, text);
    grid.append(state);

}


async function getFavoriteMedia(favorite) {

    const mediaType =
        favorite.mediaType || "movie";

    const endpoint =
        mediaType === "tv"
            ? `/tv/${favorite.tmdbId}`
            : `/movie/${favorite.tmdbId}`;

    const item =
        await requestTMDB(endpoint, {
            language: "en-US"
        });

    return {
        favorite,
        item,
        mediaType
    };

}


function createSavedCard(entry) {

    const {
        favorite,
        item,
        mediaType
    } = entry;

    const article =
        document.createElement("article");

    article.className =
        "member-archive-card";

    const link =
        document.createElement("a");

    link.className =
        "member-archive-card__image-link";

    link.href =
        getDetailHref(item, mediaType);

    const image =
        document.createElement("img");

    image.className =
        "member-archive-card__image";

    image.src =
        item.poster_path
            ? getImageUrl(item.poster_path, "w342")
            : FALLBACK_IMAGE;

    image.alt =
        item.title || item.name || favorite.title || "Saved title";

    image.loading =
        "lazy";

    const score =
        document.createElement("span");

    score.className =
        "member-archive-card__score";

    score.textContent =
        typeof item.vote_average === "number"
            ? item.vote_average.toFixed(1)
            : "-";

    link.append(image, score);

    const body =
        document.createElement("div");

    body.className =
        "member-archive-card__body";

    const title =
        document.createElement("h2");

    title.textContent =
        item.title || item.name || favorite.title || "Untitled";

    const meta =
        document.createElement("p");

    const date =
        item.release_date || item.first_air_date || "";

    meta.textContent =
        `${date ? date.slice(0, 4) : "TBA"} / ${mediaType.toUpperCase()}`;

    const remove =
        document.createElement("button");

    remove.className =
        "member-archive-card__action";

    remove.type =
        "button";

    remove.textContent =
        "UNSAVE";

    remove.addEventListener("click", async () => {
        remove.disabled =
            true;

        try {
            await removeFavorite(favorite.id);
            article.remove();

            if (!document.querySelector(".member-archive-card")) {
                renderState("NOTHING SAVED YET.");
            }
        } catch (error) {
            console.error("Saved item could not be removed.", error);
            remove.disabled =
                false;
        }
    });

    body.append(title, meta, remove);
    article.append(link, body);

    return article;

}


async function initializeSaved() {

    initializeUserNavigation();
    initializeScrollReveals();

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        renderState("SIGN IN TO SEE SAVED.", "Access NOIR and keep your films close.");
        return;
    }

    try {
        const favorites =
            await getCurrentUserFavorites();

        if (!favorites.length) {
            renderState("NOTHING SAVED YET.");
            return;
        }

        const entries =
            await Promise.allSettled(favorites.map(getFavoriteMedia));

        const validEntries =
            entries
                .filter((entry) => {
                    return entry.status === "fulfilled";
                })
                .map((entry) => {
                    return entry.value;
                });

        if (!validEntries.length) {
            renderState("SAVED IS UNAVAILABLE.", "TMDB details could not be loaded right now.");
            return;
        }

        const grid =
            getElement("#savedGrid");

        grid.replaceChildren();

        validEntries.forEach((entry) => {
            grid.append(createSavedCard(entry));
        });
    } catch (error) {
        console.error("Saved archive unavailable.", error);
        renderState("SAVED IS UNAVAILABLE.", "Check JSON Server and try again.");
    }

}


initializeSaved();
