import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestTMDB
} from "../api/tmdb.js";

import {
    getCurrentUser
} from "../api/noir-auth.js";

import {
    getCurrentUserRatings
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


function renderState(message, action = null) {

    const grid =
        getElement("#rankedGrid");

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
        action || "Rate films from Movie Detail to shape your archive.";

    state.append(title, text);
    grid.append(state);

}


async function getRatedMedia(rating) {

    const mediaType =
        rating.mediaType || "movie";

    const endpoint =
        mediaType === "tv"
            ? `/tv/${rating.tmdbId}`
            : `/movie/${rating.tmdbId}`;

    const item =
        await requestTMDB(endpoint, {
            language: "en-US"
        });

    return {
        rating,
        item,
        mediaType
    };

}


function createStars(value) {

    const rating =
        Math.max(0, Math.min(5, Number(value) || 0));

    return "★★★★★"
        .split("")
        .map((star, index) => {
            return index < rating ? star : "☆";
        })
        .join("");

}


function createRankedCard(entry) {

    const {
        rating,
        item,
        mediaType
    } = entry;

    const link =
        document.createElement("a");

    link.className =
        "member-archive-card member-archive-card--ranked";

    link.href =
        mediaType === "tv"
            ? `./tv-details.html?id=${item.id}`
            : `./movie.html?id=${item.id}`;

    const image =
        document.createElement("img");

    image.className =
        "member-archive-card__image";

    image.src =
        item.poster_path
            ? getImageUrl(item.poster_path, "w342")
            : FALLBACK_IMAGE;

    image.alt =
        item.title || item.name || "Ranked title";

    image.loading =
        "lazy";

    const body =
        document.createElement("div");

    body.className =
        "member-archive-card__body";

    const title =
        document.createElement("h2");

    title.textContent =
        item.title || item.name || "Untitled";

    const meta =
        document.createElement("p");

    const date =
        item.release_date || item.first_air_date || "";

    meta.textContent =
        `${date ? date.slice(0, 4) : "TBA"} / ${mediaType.toUpperCase()}`;

    const stars =
        document.createElement("span");

    stars.className =
        "member-archive-card__stars";

    stars.textContent =
        `${createStars(rating.rating)} ${rating.rating} / 5`;

    body.append(title, meta, stars);
    link.append(image, body);

    return link;

}


async function initializeRanked() {

    initializeUserNavigation();
    initializeScrollReveals();

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        renderState("SIGN IN TO SEE RANKED.", "Access NOIR and rate your films.");
        return;
    }

    try {
        const ratings =
            await getCurrentUserRatings();

        if (!ratings.length) {
            renderState("YOUR ARCHIVE IS UNRANKED.");
            return;
        }

        const entries =
            await Promise.allSettled(ratings.map(getRatedMedia));

        const validEntries =
            entries
                .filter((entry) => {
                    return entry.status === "fulfilled";
                })
                .map((entry) => {
                    return entry.value;
                });

        if (!validEntries.length) {
            renderState("RANKED IS UNAVAILABLE.", "TMDB details could not be loaded right now.");
            return;
        }

        const grid =
            getElement("#rankedGrid");

        grid.replaceChildren();

        validEntries.forEach((entry) => {
            grid.append(createRankedCard(entry));
        });
    } catch (error) {
        console.error("Ranked archive unavailable.", error);
        renderState("RANKED IS UNAVAILABLE.", "Check JSON Server and try again.");
    }

}


initializeRanked();
