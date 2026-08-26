import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";

import {
    bindFavoriteButton
} from "../components/noir-actions.js";

import {
    formatMovieScore,
    formatMovieYear
} from "../components/movie-card.js";

import {
    selectYouTubeTrailer
} from "../components/trailer.js";

import {
    initializeUserNavigation
} from "../components/user-navigation.js";


const AWARDS_CATEGORIES =
    {
        popular: {
            title: "POPULAR",
            description: "Editor's selection of notable films with strong audience and critical signals."
        },
        upcoming: {
            title: "UPCOMING",
            description: "Awards season watchlist built from real upcoming releases."
        }
    };


let featuredMovie =
    null;

let featuredTrailer =
    null;


function getElement(selector) {

    return document.querySelector(selector);

}


function getAwardsCategory() {

    const parameters =
        new URLSearchParams(window.location.search);

    const category =
        parameters.get("category");

    return AWARDS_CATEGORIES[category]
        ? category
        : "popular";

}


function renderState(message) {

    const container =
        getElement("#awardsSelection");

    if (!container) {
        return;
    }

    container.replaceChildren();

    const state =
        document.createElement("p");

    state.className =
        "section__state";

    state.textContent =
        message;

    container.append(state);

}


function setAwardsHeader(category) {

    const config =
        AWARDS_CATEGORIES[category];

    const title =
        getElement("#awardsTitle");

    const description =
        getElement("#awardsDescription");

    if (title) {
        title.textContent =
            category === "upcoming"
                ? "AWARDS SEASON / WATCHLIST"
                : "THE FILMS WE'RE WATCHING";
    }

    if (description) {
        description.textContent =
            config.description;
    }

    document.title =
        `NOIR - Awards / ${config.title}`;

}


function getUniqueMovies(lists) {

    const moviesById =
        new Map();

    lists.flat().forEach((movie) => {
        if (!moviesById.has(movie.id)) {
            moviesById.set(movie.id, movie);
        }
    });

    return [...moviesById.values()];

}


async function getMovieDirector(movieId) {

    try {
        const data =
            await requestCachedTMDB(`/movie/${movieId}/credits`, {
                language: "en-US"
            });

        return data.crew?.find((person) => person.job === "Director") || null;
    } catch (error) {
        console.error("Director unavailable.", error);
        return null;
    }

}


async function getMovieTrailer(movieId) {

    try {
        const data =
            await requestCachedTMDB(`/movie/${movieId}/videos`, {
                language: "en-US"
            });

        return selectYouTubeTrailer(data);
    } catch (error) {
        console.error("Trailer unavailable.", error);
        return null;
    }

}


function openTrailerModal(video, movie) {

    const modal =
        getElement("#trailerModal");

    const frame =
        getElement("#trailerFrame");

    const title =
        getElement("#trailerModalTitle");

    if (!modal || !frame || !video) {
        return;
    }

    if (title) {
        title.textContent =
            `Trailer / ${movie.title}`;
    }

    frame.src =
        `https://www.youtube.com/embed/${video.key}?autoplay=1&rel=0&enablejsapi=1&playsinline=1`;

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

}


function closeTrailerModal() {

    const modal =
        getElement("#trailerModal");

    const frame =
        getElement("#trailerFrame");

    if (!modal || !frame) {
        return;
    }

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    frame.src =
        "";

    document.body.classList.remove("modal-open");

}


function bindTrailerModalControls() {

    document
        .querySelectorAll("[data-trailer-close]")
        .forEach((control) => {
            control.addEventListener("click", closeTrailerModal);
        });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeTrailerModal();
        }
    });

}


function createMovieLink(movie, text = "View Film") {

    const link =
        document.createElement("a");

    link.className =
        "button button--secondary";

    link.href =
        `./movie.html?id=${movie.id}`;

    link.textContent =
        text;

    return link;

}


function createAwardsFeature(movie, director, category) {

    const article =
        document.createElement("article");

    article.className =
        "awards-feature";

    article.style.setProperty(
        "--awards-backdrop",
        `url("${getImageUrl(movie.backdrop_path, "w1280")}")`
    );

    const image =
        document.createElement("img");

    image.className =
        "awards-feature__image";

    image.src =
        movie.backdrop_path
            ? getImageUrl(movie.backdrop_path, "w1280")
            : FALLBACK_IMAGE;

    image.alt =
        movie.title;

    const content =
        document.createElement("div");

    content.className =
        "awards-feature__content";

    const label =
        document.createElement("span");

    label.className =
        "section__eyebrow";

    label.textContent =
        category === "upcoming"
            ? "AWARDS WATCHLIST"
            : "EDITOR'S SELECTION";

    const title =
        document.createElement("h2");

    title.textContent =
        movie.title;

    const meta =
        document.createElement("p");

    meta.className =
        "awards-feature__meta";

    meta.textContent =
        [
            category === "upcoming"
                ? `COMING ${movie.release_date || "TBA"}`
                : formatMovieYear(movie.release_date),
            director ? `DIRECTED BY ${director.name}` : "",
            movie.vote_average ? `TMDB SCORE ${formatMovieScore(movie.vote_average)}` : ""
        ].filter(Boolean).join(" / ");

    const overview =
        document.createElement("p");

    overview.className =
        "awards-feature__overview";

    overview.textContent =
        movie.overview || "No overview available.";

    const actions =
        document.createElement("div");

    actions.className =
        "detail-actions";

    actions.append(createMovieLink(movie, "View Film"));

    if (featuredTrailer && featuredMovie?.id === movie.id) {
        const trailerButton =
            document.createElement("button");

        trailerButton.className =
            "button button--primary";

        trailerButton.type =
            "button";

        trailerButton.textContent =
            "Watch Trailer";

        trailerButton.addEventListener("click", () => {
            openTrailerModal(featuredTrailer, movie);
        });

        actions.append(trailerButton);
    }

    const saveButton =
        document.createElement("button");

    saveButton.className =
        "save-action";

    saveButton.type =
        "button";

    saveButton.textContent =
        "SAVE TO NOIR";

    actions.append(saveButton);

    content.append(label, title, meta, overview, actions);
    article.append(image, content);

    bindFavoriteButton(saveButton, movie, "movie");

    return article;

}


function createAwardsRow(movie, index, director = null) {

    const link =
        document.createElement("a");

    link.className =
        "awards-row";

    link.href =
        `./movie.html?id=${movie.id}`;

    const number =
        document.createElement("span");

    number.className =
        "awards-row__number";

    number.textContent =
        String(index + 1).padStart(2, "0");

    const image =
        document.createElement("img");

    image.className =
        "awards-row__image";

    image.src =
        movie.backdrop_path
            ? getImageUrl(movie.backdrop_path, "w500")
            : getImageUrl(movie.poster_path, "w342");

    image.alt =
        movie.title;

    const content =
        document.createElement("span");

    content.className =
        "awards-row__content";

    const title =
        document.createElement("strong");

    title.textContent =
        movie.title;

    const meta =
        document.createElement("span");

    meta.textContent =
        [
            formatMovieYear(movie.release_date),
            director ? `Directed by ${director.name}` : "",
            movie.vote_average ? `TMDB ${formatMovieScore(movie.vote_average)}` : ""
        ].filter(Boolean).join(" / ");

    const overview =
        document.createElement("span");

    overview.textContent =
        movie.overview || "";

    content.append(title, meta, overview);
    link.append(number, image, content);

    return link;

}


function createUpcomingWatchlist(movies) {

    const list =
        document.createElement("div");

    list.className =
        "awards-watchlist";

    movies.forEach((movie, index) => {
        const link =
            document.createElement("a");

        link.className =
            "awards-watchlist__item";

        link.href =
            `./movie.html?id=${movie.id}`;

        const number =
            document.createElement("span");

        number.textContent =
            String(index + 1).padStart(2, "0");

        const image =
            document.createElement("img");

        image.src =
            movie.poster_path
                ? getImageUrl(movie.poster_path, "w185")
                : FALLBACK_IMAGE;

        image.alt =
            movie.title;

        const title =
            document.createElement("strong");

        title.textContent =
            movie.title;

        const date =
            document.createElement("span");

        date.textContent =
            movie.release_date || "TBA";

        link.append(number, image, title, date);
        list.append(link);
    });

    return list;

}


async function loadPopularAwards() {

    // TMDB no tiene endpoint /awards: NOIR arma esta seleccion con listas reales de peliculas.
    const [
        topRated,
        popular
    ] =
        await Promise.all([
            requestCachedTMDB("/movie/top_rated", {
                language: "en-US",
                page: 1
            }),
            requestCachedTMDB("/movie/popular", {
                language: "en-US",
                page: 1
            })
        ]);

    const movies =
        getUniqueMovies([
            topRated.results || [],
            popular.results || []
        ])
            .filter((movie) => movie.backdrop_path)
            .sort((first, second) => {
                return (second.vote_average * second.vote_count) -
                    (first.vote_average * first.vote_count);
            })
            .slice(0, 10);

    const directors =
        await Promise.all(
            movies.slice(0, 4).map((movie) => getMovieDirector(movie.id))
        );

    featuredMovie =
        movies[0] || null;

    featuredTrailer =
        featuredMovie
            ? await getMovieTrailer(featuredMovie.id)
            : null;

    renderPopularAwards(movies, directors);

}


async function loadUpcomingAwards() {

    // Upcoming usa /movie/upcoming: proximos estrenos reales, no nominaciones ni predicciones.
    const data =
        await requestCachedTMDB("/movie/upcoming", {
            language: "en-US",
            page: 1
        });

    const movies =
        (data.results || [])
            .filter((movie) => movie.backdrop_path || movie.poster_path)
            .slice(0, 10);

    featuredMovie =
        movies[0] || null;

    featuredTrailer =
        featuredMovie
            ? await getMovieTrailer(featuredMovie.id)
            : null;

    renderUpcomingAwards(movies);

}


function renderPopularAwards(movies, directors) {

    const container =
        getElement("#awardsSelection");

    container.replaceChildren();

    if (!movies.length) {
        renderState("AWARDS SELECTION UNAVAILABLE");
        return;
    }

    container.append(
        createAwardsFeature(movies[0], directors[0], "popular")
    );

    const list =
        document.createElement("div");

    list.className =
        "awards-list";

    movies.slice(1).forEach((movie, index) => {
        list.append(createAwardsRow(movie, index + 1, directors[index + 1]));
    });

    container.append(list);

}


function renderUpcomingAwards(movies) {

    const container =
        getElement("#awardsSelection");

    container.replaceChildren();

    if (!movies.length) {
        renderState("AWARDS SELECTION UNAVAILABLE");
        return;
    }

    container.append(
        createAwardsFeature(movies[0], null, "upcoming"),
        createUpcomingWatchlist(movies.slice(1))
    );

}


async function initializeAwards() {

    const category =
        getAwardsCategory();

    setAwardsHeader(category);
    renderState("CURATING FILMS...");

    try {
        if (category === "upcoming") {
            await loadUpcomingAwards();
            return;
        }

        await loadPopularAwards();
    } catch (error) {
        console.error("Awards selection unavailable.", error);
        renderState("AWARDS SELECTION UNAVAILABLE");
    }

}


initializeUserNavigation();
bindTrailerModalControls();
initializeAwards();
