import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestTMDB,
    WATCH_REGION
} from "../api/tmdb.js";

import {
    createMediaCard,
    createMovieCard,
    getMediaTitle,
    formatMovieScore,
    formatMovieYear
} from "../components/movie-card.js";


const MOVIE_LIMIT =
    16;

const HERO_LIMIT =
    5;

const dataCache =
    new Map();

let heroMovies =
    [];

let currentHeroIndex =
    0;

let heroIntervalId =
    null;

let currentHeroMovie =
    null;

const popularCategoryConfig =
    {
        streaming: {
            endpoint: "/discover/movie",
            mediaType: "movie",
            parameters: {
                sort_by: "popularity.desc",
                watch_region: WATCH_REGION,
                with_watch_monetization_types: "flatrate"
            }
        },
        "on-tv": {
            endpoint: "/tv/on_the_air",
            mediaType: "tv",
            parameters: {}
        },
        "for-rent": {
            endpoint: "/discover/movie",
            mediaType: "movie",
            parameters: {
                sort_by: "popularity.desc",
                watch_region: WATCH_REGION,
                with_watch_monetization_types: "rent"
            }
        },
        "in-theaters": {
            endpoint: "/movie/now_playing",
            mediaType: "movie",
            parameters: {}
        }
    };


function getElement(selector) {

    return document.querySelector(selector);

}


function getResults(data, limit = MOVIE_LIMIT) {

    // TMDB entrega las listas en la propiedad results.
    return (data.results || []).slice(0, limit);

}


async function requestCached(endpoint, parameters = {}) {

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


function renderState(container, message) {

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


function renderMovieGrid(container, movies) {

    if (!container) {
        return;
    }

    if (!movies.length) {
        renderState(container, "No films available.");
        return;
    }

    container.replaceChildren();

    movies.forEach((movie) => {
        container.append(createMovieCard(movie));
    });

}


function setActiveTrendingButton(period) {

    document
        .querySelectorAll("[data-trending-period]")
        .forEach((button) => {
            button.classList.toggle(
                "is-active",
                button.dataset.trendingPeriod === period
            );
        });

}


function renderHero(index) {

    const movie =
        heroMovies[index];

    if (!movie) {
        return;
    }

    currentHeroMovie =
        movie;

    currentHeroIndex =
        index;

    const image =
        getElement("#heroImage");

    const eyebrow =
        getElement("#heroEyebrow");

    const title =
        getElement("#heroTitle");

    const metadata =
        getElement("#heroMetadata");

    const description =
        getElement("#heroDescription");

    const link =
        getElement("#heroViewFilm");

    const current =
        getElement("#heroCurrent");

    const total =
        getElement("#heroTotal");

    const displayIndex =
        String(index + 1).padStart(2, "0");

    if (image) {
        image.src =
            getImageUrl(movie.backdrop_path, "w1280");

        image.alt =
            movie.title || "";
    }

    if (eyebrow) {
        eyebrow.textContent =
            `Featured Film / ${displayIndex}`;
    }

    if (title) {
        title.textContent =
            movie.title || "Untitled";
    }

    if (metadata) {
        metadata.textContent =
            `${formatMovieYear(movie.release_date)} / ID ${movie.id} / Score ${formatMovieScore(movie.vote_average)}`;
    }

    if (description) {
        description.textContent =
            movie.overview || "No synopsis available yet.";
    }

    if (link) {
        link.href =
            `./pages/movie.html?id=${movie.id}`;
    }

    if (current) {
        current.textContent =
            displayIndex;
    }

    if (total) {
        total.textContent =
            String(heroMovies.length).padStart(2, "0");
    }

}


function renderMediaRail(container, items, mediaType) {

    if (!container) {
        return;
    }

    if (!items.length) {
        renderState(container, "No titles available.");
        return;
    }

    container.replaceChildren();

    items.forEach((item) => {
        container.append(
            createMediaCard(
                {
                    ...item,
                    media_type: mediaType || item.media_type
                },
                mediaType || item.media_type
            )
        );
    });

}


function setActiveButton(selector, activeValue, dataKey) {

    document
        .querySelectorAll(selector)
        .forEach((button) => {
            button.classList.toggle(
                "is-active",
                button.dataset[dataKey] === activeValue
            );
        });

}


function startHeroRotation() {

    if (heroIntervalId || heroMovies.length < 2) {
        return;
    }

    heroIntervalId =
        setInterval(() => {
            const nextIndex =
                (currentHeroIndex + 1) % heroMovies.length;

            renderHero(nextIndex);
        }, 7000);

}


export async function loadHero() {

    try {
        const data =
            await requestCached("/trending/movie/day", {
                language: "en-US"
            });

        heroMovies =
            getResults(data, HERO_LIMIT).filter((movie) => {
                return movie.backdrop_path;
            });

        renderHero(0);
        startHeroRotation();
    } catch (error) {
        console.error("No se pudo cargar el hero.", error);

        const description =
            getElement("#heroDescription");

        if (description) {
            description.textContent =
                "Configure TMDB to load the featured films.";
        }
    }

}


export async function loadTrending(period = "day") {

    const container =
        getElement("#trendingMovies");

    renderState(container, "Loading films...");
    setActiveTrendingButton(period);

    try {
        const data =
            await requestCached(`/trending/movie/${period}`, {
                language: "en-US"
            });

        renderMovieGrid(
            container,
            getResults(data)
        );
    } catch (error) {
        console.error("No se pudo cargar Trending.", error);
        renderState(container, "Trending films are unavailable.");
    }

}


export async function loadPopular() {

    const container =
        getElement("#popularMovies");

    renderState(container, "Loading films...");

    try {
        const data =
            await requestCached("/movie/popular", {
                language: "en-US",
                page: 1
            });

        const movies =
            getResults(data, 10);

        container.replaceChildren();

        movies.forEach((movie, index) => {
            const link =
                document.createElement("a");

            link.className =
                "popular-item";

            link.href =
                `./pages/movie.html?id=${movie.id}`;

            const number =
                document.createElement("span");

            number.className =
                "popular-item__number";

            number.textContent =
                String(index + 1).padStart(2, "0");

            const main =
                document.createElement("div");

            main.className =
                "popular-item__main";

            const title =
                document.createElement("h3");

            title.textContent =
                movie.title || "Untitled";

            const meta =
                document.createElement("span");

            meta.textContent =
                movie.original_language
                    ? movie.original_language.toUpperCase()
                    : "FILM";

            main.append(title, meta);

            const year =
                document.createElement("span");

            year.className =
                "popular-item__year";

            year.textContent =
                formatMovieYear(movie.release_date);

            const rating =
                document.createElement("span");

            rating.className =
                "popular-item__rating";

            rating.textContent =
                formatMovieScore(movie.vote_average);

            link.append(number, main, year, rating);
            container.append(link);
        });
    } catch (error) {
        console.error("No se pudo cargar Popular.", error);
        renderState(container, "Popular films are unavailable.");
    }

}


async function getMovieTrailer(movieId) {

    const data =
        await requestCached(`/movie/${movieId}/videos`, {
            language: "en-US"
        });

    const youtubeVideos =
        (data.results || []).filter((video) => {
            return video.site === "YouTube";
        });

    return youtubeVideos.find((video) => {
        return video.type === "Trailer" && video.official;
    }) ||
        youtubeVideos.find((video) => {
            return video.type === "Trailer";
        }) ||
        youtubeVideos[0] ||
        null;

}


function openTrailerModal(video, movie) {

    const modal =
        getElement("#trailerModal");

    const frame =
        getElement("#trailerFrame");

    const title =
        getElement("#trailerModalTitle");

    if (!modal || !frame) {
        return;
    }

    if (title) {
        title.textContent =
            `Trailer / ${getMediaTitle(movie)}`;
    }

    frame.src =
        `https://www.youtube.com/embed/${video.key}?autoplay=1`;

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


function showTrailerMessage(message) {

    const button =
        getElement("#heroTrailerButton");

    if (!button) {
        return;
    }

    const previousText =
        button.dataset.defaultText ||
        button.textContent.trim();

    button.dataset.defaultText =
        previousText;

    button.textContent =
        message;

    setTimeout(() => {
        button.textContent =
            previousText;
    }, 2200);

}


async function handleTrailerClick() {

    if (!currentHeroMovie) {
        showTrailerMessage("Trailer not available");
        return;
    }

    const button =
        getElement("#heroTrailerButton");

    if (button) {
        button.disabled =
            true;
    }

    try {
        const trailer =
            await getMovieTrailer(currentHeroMovie.id);

        if (!trailer) {
            showTrailerMessage("Trailer not available");
            return;
        }

        openTrailerModal(trailer, currentHeroMovie);
    } catch (error) {
        console.error("No se pudo cargar el trailer.", error);
        showTrailerMessage("Trailer not available");
    } finally {
        if (button) {
            button.disabled =
                false;
        }
    }

}


export async function loadNowPlaying() {

    const container =
        getElement("#nowPlayingMovies");

    renderState(container, "Loading films...");

    try {
        const data =
            await requestCached("/movie/now_playing", {
                language: "en-US",
                page: 1
            });

        renderMovieGrid(
            container,
            getResults(data)
        );
    } catch (error) {
        console.error("No se pudo cargar Now Playing.", error);
        renderState(container, "Now playing films are unavailable.");
    }

}


export async function loadPopularByCategory(category = "streaming") {

    const container =
        getElement("#whatsPopularList");

    const config =
        popularCategoryConfig[category] ||
        popularCategoryConfig.streaming;

    renderState(container, "Loading...");
    setActiveButton(
        "[data-popular-category]",
        category,
        "popularCategory"
    );

    try {
        const data =
            await requestCached(config.endpoint, {
                language: "en-US",
                page: 1,
                ...config.parameters
            });

        renderMediaRail(
            container,
            getResults(data, 18),
            config.mediaType
        );
    } catch (error) {
        console.error("No se pudo cargar What's Popular.", error);
        renderState(container, "Popular titles are unavailable.");
    }

}


export async function loadFreeToWatch(mediaType = "movie") {

    const container =
        getElement("#freeToWatchList");

    const endpoint =
        mediaType === "tv"
            ? "/discover/tv"
            : "/discover/movie";

    renderState(container, "Loading...");
    setActiveButton(
        "[data-free-category]",
        mediaType,
        "freeCategory"
    );

    try {
        const data =
            await requestCached(endpoint, {
                language: "en-US",
                page: 1,
                sort_by: "popularity.desc",
                watch_region: WATCH_REGION,
                with_watch_monetization_types: "free|ads"
            });

        renderMediaRail(
            container,
            getResults(data, 18),
            mediaType
        );
    } catch (error) {
        console.error("No se pudo cargar Free To Watch.", error);
        renderState(container, "Free titles are unavailable.");
    }

}


export async function loadGenres() {

    const container =
        getElement("#genresList");

    renderState(container, "Loading genres...");

    try {
        const data =
            await requestCached("/genre/movie/list", {
                language: "en-US"
            });

        const genres =
            (data.genres || []).slice(0, 8);

        container.replaceChildren();

        genres.forEach((genre, index) => {
            const link =
                document.createElement("a");

            link.className =
                "genre-item";

            link.href =
                `./pages/movies.html?genre=${genre.id}`;

            const name =
                document.createElement("span");

            name.className =
                "genre-item__name";

            name.textContent =
                genre.name;

            const number =
                document.createElement("span");

            number.className =
                "genre-item__number";

            number.textContent =
                String(index + 1).padStart(2, "0");

            link.append(name, number);
            container.append(link);
        });
    } catch (error) {
        console.error("No se pudo cargar Genres.", error);
        renderState(container, "Genres are unavailable.");
    }

}


export async function loadUpcoming() {

    const container =
        getElement("#upcomingMovie");

    try {
        const data =
            await requestCached("/movie/upcoming", {
                language: "en-US",
                page: 1
            });

        const movie =
            getResults(data, 1)[0];

        if (!movie) {
            renderState(container, "Upcoming films are unavailable.");
            return;
        }

        const image =
            getElement("#upcomingImage");

        const title =
            getElement("#upcomingTitle");

        const date =
            getElement("#upcomingDate");

        const link =
            getElement("#upcomingLink");

        if (image) {
            image.src =
                movie.backdrop_path
                    ? getImageUrl(movie.backdrop_path, "w1280")
                    : FALLBACK_IMAGE;

            image.alt =
                movie.title || "";
        }

        if (title) {
            title.textContent =
                movie.title || "Upcoming Film";
        }

        if (date) {
            date.textContent =
                movie.release_date || "Release date TBA";
        }

        if (link) {
            link.href =
                `./pages/movie.html?id=${movie.id}`;
        }
    } catch (error) {
        console.error("No se pudo cargar Upcoming.", error);
        renderState(container, "Upcoming films are unavailable.");
    }

}


function bindTrendingFilters() {

    document
        .querySelectorAll("[data-trending-period]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                loadTrending(button.dataset.trendingPeriod);
            });
        });

}


function bindTrailerModal() {

    const button =
        getElement("#heroTrailerButton");

    if (button) {
        button.addEventListener("click", handleTrailerClick);
    }

    document
        .querySelectorAll("[data-trailer-close]")
        .forEach((closeControl) => {
            closeControl.addEventListener("click", closeTrailerModal);
        });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeTrailerModal();
        }
    });

}


function bindPopularFilters() {

    document
        .querySelectorAll("[data-popular-category]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                loadPopularByCategory(button.dataset.popularCategory);
            });
        });

}


function bindFreeFilters() {

    document
        .querySelectorAll("[data-free-category]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                loadFreeToWatch(button.dataset.freeCategory);
            });
        });

}


export function initializeHome() {

    bindTrendingFilters();
    bindTrailerModal();
    bindPopularFilters();
    bindFreeFilters();

    loadHero();
    loadTrending("day");
    loadPopular();
    loadNowPlaying();
    loadGenres();
    loadUpcoming();
    loadPopularByCategory("streaming");
    loadFreeToWatch("movie");

}
