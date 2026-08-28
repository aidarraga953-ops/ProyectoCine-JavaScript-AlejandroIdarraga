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

import {
    selectYouTubeTrailer
} from "../components/trailer.js";

import {
    initializeScrollReveals
} from "../effects/reveal-on-scroll.js";


const MOVIE_LIMIT =
    16;

const HERO_LIMIT =
    5;

const SEARCH_DEBOUNCE_MS =
    350;

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

let trailerCollection =
    [];

let activeTrailerIndex =
    0;

let isTrailerSectionVisible =
    false;

let trailerObserver =
    null;

let searchDebounceId =
    null;

let heroTransitionTimeout =
    null;

let heroContentTimeout =
    null;

let activeHeroImageId =
    "heroImage";

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


function renderPopularItem(movie, index) {

    const link =
        document.createElement("a");

    const backdropPath =
        movie.backdrop_path || "";

    link.className =
        "popular-item";

    link.href =
        `./pages/movie.html?id=${movie.id}`;

    if (backdropPath) {
        link.style.setProperty(
            "--backdrop-image",
            `url("${getImageUrl(backdropPath, "w780")}")`
        );
    }

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

    return link;

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

function prefersReducedMotion() {

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;

}


function setHeroTransitionState(hero, isTransitioning) {

    if (!hero) {
        return;
    }

    hero.classList.toggle("is-transitioning", isTransitioning);

}

function setHeroTextState(hero, state) {

    if (!hero) {
        return;
    }

    hero.classList.toggle("is-text-out", state === "out");
    hero.classList.toggle("is-text-in", state === "in");

}


function renderHero(index) {

    const movie =
        heroMovies[index];

    if (!movie) {
        return;
    }

    const hadHeroMovie =
        Boolean(currentHeroMovie);

    currentHeroMovie =
        movie;

    currentHeroIndex =
        index;

    const currentImage =
        getElement(`#${activeHeroImageId}`);

    const nextImage =
        getElement(activeHeroImageId === "heroImage"
            ? "#heroImageNext"
            : "#heroImage");

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

    const hero =
        getElement(".hero");

    const nextImageUrl =
        getImageUrl(movie.backdrop_path, "w1280");

    const updateTextContent = () => {
        if (nextImage) {
            nextImage.alt =
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
    };

    const swapHeroImage = () => {
        if (!currentImage || !nextImage) {
            return;
        }

        nextImage.src =
            nextImageUrl;

        nextImage.classList.add("is-active");
        currentImage.classList.remove("is-active");

        activeHeroImageId =
            nextImage.id;
    };

    const preloadAndSwapHeroImage = () => {
        const preloader =
            new Image();

        preloader.onload =
            swapHeroImage;

        preloader.onerror =
            swapHeroImage;

        preloader.src =
            nextImageUrl;
    };

    clearTimeout(heroTransitionTimeout);
    clearTimeout(heroContentTimeout);

    if (prefersReducedMotion() || !hero || !hadHeroMovie) {
        if (currentImage) {
            currentImage.src =
                nextImageUrl;

            currentImage.alt =
                movie.title || "";
        }

        updateTextContent();
        setHeroTransitionState(hero, false);
        setHeroTextState(hero, null);
        return;
    }

    setHeroTransitionState(hero, true);
    setHeroTextState(hero, "out");
    preloadAndSwapHeroImage();

    heroContentTimeout =
        setTimeout(() => {
            updateTextContent();
            setHeroTextState(hero, "in");
        }, 260);

    heroTransitionTimeout =
        setTimeout(() => {
            setHeroTransitionState(hero, false);
            setHeroTextState(hero, null);
        }, 980);

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


function getSearchResultTitle(item) {

    if (item.media_type === "movie") {
        return item.title || "Untitled";
    }

    if (item.media_type === "tv") {
        return item.name || "Untitled";
    }

    return item.name || "Untitled";

}


function getSearchResultDate(item) {

    if (item.media_type === "movie") {
        return item.release_date || "";
    }

    if (item.media_type === "tv") {
        return item.first_air_date || "";
    }

    return "";

}


function getSearchResultHref(item) {

    if (item.media_type === "tv") {
        return `./pages/tv-details.html?id=${item.id}`;
    }

    if (item.media_type === "person") {
        return `./pages/person.html?id=${item.id}`;
    }

    return `./pages/movie.html?id=${item.id}`;

}


function renderSearchResults(results) {

    const container =
        getElement("#searchResults");

    if (!container) {
        return;
    }

    if (!results.length) {
        container.replaceChildren();

        const state =
            document.createElement("p");

        state.className =
            "search-modal__state";

        state.textContent =
            "NO RESULTS FOUND";

        container.append(state);
        return;
    }

    container.replaceChildren();

    results.forEach((item) => {
        const link =
            document.createElement("a");

        link.className =
            "search-result";

        link.href =
            getSearchResultHref(item);

        const poster =
            document.createElement("img");

        poster.className =
            "search-result__poster";

        poster.src =
            item.poster_path || item.profile_path
                ? getImageUrl(item.poster_path || item.profile_path, "w185")
                : FALLBACK_IMAGE;

        poster.alt =
            getSearchResultTitle(item);

        const body =
            document.createElement("div");

        body.className =
            "search-result__body";

        const title =
            document.createElement("h3");

        title.className =
            "search-result__title";

        title.textContent =
            getSearchResultTitle(item);

        const meta =
            document.createElement("p");

        meta.className =
            "search-result__meta";

        const dateText =
            getSearchResultDate(item);

        meta.textContent =
            item.media_type === "person"
                ? item.known_for?.[0]?.title || item.known_for?.[0]?.name || "Person"
                : dateText ? dateText.slice(0, 4) : "TBA";

        body.append(title, meta);

        const type =
            document.createElement("span");

        type.className =
            "search-result__type";

        type.textContent =
            item.media_type || "title";

        link.append(poster, body, type);
        container.append(link);
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
            container.append(renderPopularItem(movie, index));
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

    return selectYouTubeTrailer(data);

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


function getActiveTrailerFrame() {

    return getElement("#trailerCarouselFrame");

}


function sendTrailerCommand(command) {

    const frame =
        getActiveTrailerFrame();

    if (!frame || !frame.contentWindow) {
        return;
    }

    // YouTube escucha estos mensajes cuando el iframe se carga con enablejsapi=1.
    frame.contentWindow.postMessage(
        JSON.stringify({
            event: "command",
            func: command,
            args: []
        }),
        "*"
    );

}


function playActiveTrailer() {

    sendTrailerCommand("playVideo");

}


function pauseActiveTrailer() {

    sendTrailerCommand("pauseVideo");

}


function getTrailerEmbedUrl(videoKey, shouldAutoplay = false) {

    const autoplayValue =
        shouldAutoplay
            ? "1"
            : "0";

    return `https://www.youtube.com/embed/${videoKey}?rel=0&enablejsapi=1&playsinline=1&mute=1&autoplay=${autoplayValue}`;

}


function renderTrailer() {

    const frame =
        getElement("#trailerCarouselFrame");

    const title =
        getElement("#trailerCarouselTitle");

    const meta =
        getElement("#trailerCarouselMeta");

    const counter =
        getElement("#trailerCounter");

    const total =
        getElement("#trailerTotal");

    if (!trailerCollection.length || !frame) {
        return;
    }

    const activeItem =
        trailerCollection[activeTrailerIndex];

    if (!activeItem) {
        return;
    }

    if (title) {
        title.textContent =
            activeItem.movie.title || "Untitled";
    }

    if (meta) {
        meta.textContent =
            `${formatMovieYear(activeItem.movie.release_date) || "TBA"} / Official trailer`;
    }

    if (counter) {
        counter.textContent =
            String(activeTrailerIndex + 1).padStart(2, "0");
    }

    if (total) {
        total.textContent =
            String(trailerCollection.length).padStart(2, "0");
    }

    frame.src =
        getTrailerEmbedUrl(
            activeItem.trailer.key,
            isTrailerSectionVisible
        );

}


function showNextTrailer() {

    if (!trailerCollection.length) {
        return;
    }

    pauseActiveTrailer();

    activeTrailerIndex =
        (activeTrailerIndex + 1) % trailerCollection.length;

    renderTrailer();

    if (isTrailerSectionVisible) {
        playActiveTrailer();
    }

}


function showPreviousTrailer() {

    if (!trailerCollection.length) {
        return;
    }

    pauseActiveTrailer();

    activeTrailerIndex =
        (activeTrailerIndex - 1 + trailerCollection.length) % trailerCollection.length;

    renderTrailer();

    if (isTrailerSectionVisible) {
        playActiveTrailer();
    }

}


function observeTrailerSection() {

    const section =
        getElement("#trailersSection");

    if (!section || trailerObserver) {
        return;
    }

    // IntersectionObserver evita escuchar cada scroll y solo reacciona cuando
    // cerca de la mitad de la seccion de trailers entra o sale de pantalla.
    trailerObserver =
        new IntersectionObserver((entries) => {
            const entry =
                entries[0];

            isTrailerSectionVisible =
                entry.isIntersecting && entry.intersectionRatio >= 0.5;

            if (isTrailerSectionVisible) {
                playActiveTrailer();
                return;
            }

            pauseActiveTrailer();
        }, {
            threshold: 0.5
        });

    trailerObserver.observe(section);

}


async function loadTrailerCollection() {

    const trailerFrame =
        getElement("#trailerCarouselFrame");

    const sourceMovies =
        heroMovies.slice(0, 5);

    if (!sourceMovies.length) {
        return;
    }

    try {
        const moviesWithTrailer =
            await Promise.all(
                sourceMovies.map(async (movie) => {
                    const trailer =
                        await getMovieTrailer(movie.id);

                    return trailer
                        ? {
                            movie,
                            trailer
                        }
                        : null;
                })
            );

        trailerCollection =
            moviesWithTrailer.filter(Boolean);

        activeTrailerIndex =
            0;

        if (!trailerCollection.length) {
            if (trailerFrame) {
                trailerFrame.removeAttribute("src");
            }
            return;
        }

        renderTrailer();
    } catch (error) {
        console.error("No se pudo cargar la coleccion de trailers.", error);
    }

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


function handleSearchInput(event) {

    const query =
        event.target.value.trim();

    clearTimeout(searchDebounceId);

    if (!query) {
        renderSearchResults([]);
        return;
    }

    const container =
        getElement("#searchResults");

    if (container) {
        container.replaceChildren();

        const state =
            document.createElement("p");

        state.className =
            "search-modal__state";

        state.textContent =
            "SEARCHING...";

        container.append(state);
    }

    searchDebounceId =
        setTimeout(() => {
            searchTMDB(query);
        }, SEARCH_DEBOUNCE_MS);

}


async function searchTMDB(query) {

    const container =
        getElement("#searchResults");

    if (!container) {
        return;
    }

    try {
        const data =
            await requestTMDB("/search/multi", {
                query,
                page: 1,
                include_adult: false
            });

        const validResults =
            (data.results || [])
                .filter((item) => {
                    return ["movie", "tv", "person"].includes(item.media_type);
                })
                .slice(0, 8);

        renderSearchResults(validResults);
    } catch (error) {
        console.error("Search unavailable.", error);

        container.replaceChildren();

        const state =
            document.createElement("p");

        state.className =
            "search-modal__state";

        state.textContent =
            "SEARCH UNAVAILABLE";

        container.append(state);
    }

}


function openSearchModal() {

    const modal =
        getElement("#searchModal");

    const input =
        getElement("#searchInput");

    if (!modal) {
        return;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    if (input) {
        setTimeout(() => {
            input.focus();
        }, 50);
    }

}


function closeSearchModal() {

    const modal =
        getElement("#searchModal");

    const input =
        getElement("#searchInput");

    if (!modal) {
        return;
    }

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (input) {
        input.value = "";
        renderSearchResults([]);
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


function bindSearchControls() {

    const headerSearchButton =
        document.querySelector(".header__search");

    const searchInput =
        getElement("#searchInput");

    if (headerSearchButton) {
        headerSearchButton.addEventListener("click", openSearchModal);
    }

    document
        .querySelectorAll("[data-search-close]")
        .forEach((closeControl) => {
            closeControl.addEventListener("click", closeSearchModal);
        });

    if (searchInput) {
        searchInput.addEventListener("input", handleSearchInput);
    }

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSearchModal();
            closeTrailerModal();
        }
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

    document
        .querySelectorAll("[data-trailer-next]")
        .forEach((button) => {
            button.addEventListener("click", showNextTrailer);
        });

    document
        .querySelectorAll("[data-trailer-prev]")
        .forEach((button) => {
            button.addEventListener("click", showPreviousTrailer);
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

    initializeScrollReveals();
    bindTrendingFilters();
    bindSearchControls();
    bindTrailerModal();
    bindPopularFilters();
    bindFreeFilters();
    observeTrailerSection();

    loadHero().then(() => {
        loadTrailerCollection();
    });
    loadTrending("day");
    loadPopular();
    loadNowPlaying();
    loadGenres();
    loadUpcoming();
    loadPopularByCategory("streaming");
    loadFreeToWatch("movie");

}
