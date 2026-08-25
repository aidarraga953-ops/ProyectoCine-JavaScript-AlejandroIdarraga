import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";

import {
    createMovieCard,
    formatMovieScore
} from "../components/movie-card.js";

import {
    selectYouTubeTrailer
} from "../components/trailer.js";

import {
    getFavorite,
    getMovieRating,
    saveMovieRating,
    toggleFavorite
} from "../api/noir-data.js";


function getElement(selector) {

    return document.querySelector(selector);

}


function getMovieId() {

    return new URLSearchParams(window.location.search).get("id");

}


function formatRuntime(minutes) {

    if (!minutes) {
        return "Runtime TBA";
    }

    const hours =
        Math.floor(minutes / 60);

    const remainingMinutes =
        minutes % 60;

    return `${hours}h ${remainingMinutes}m`;

}


function getDirector(credits) {

    return credits.crew?.find((person) => person.job === "Director")?.name ||
        "Director TBA";

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

    // Reutiliza el mismo patrón del modal NOIR del Home: iframe YouTube dentro del overlay propio.
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


function createInfoList(items) {

    const list =
        document.createElement("dl");

    list.className =
        "detail-facts";

    items.forEach(([label, value]) => {
        const term =
            document.createElement("dt");

        term.textContent =
            label;

        const description =
            document.createElement("dd");

        description.textContent =
            value || "TBA";

        list.append(term, description);
    });

    return list;

}


function createCastCard(person) {

    const link =
        document.createElement("a");

    link.className =
        "cast-card";

    link.href =
        `./person.html?id=${person.id}`;

    const image =
        document.createElement("img");

    image.className =
        "cast-card__image";

    // TMDB entrega retratos de reparto en profile_path; si falta, usamos el fallback compartido.
    image.src =
        person.profile_path
            ? getImageUrl(person.profile_path, "w185")
            : FALLBACK_IMAGE;

    image.alt =
        person.name;

    const name =
        document.createElement("span");

    name.className =
        "cast-card__name";

    name.textContent =
        person.name;

    const character =
        document.createElement("span");

    character.className =
        "cast-card__character";

    character.textContent =
        person.character || "Cast";

    link.append(image, name, character);

    return link;

}


function renderKeywordList(container, keywords) {

    if (!keywords.length) {
        container.textContent =
            "No keywords available.";
        return;
    }

    keywords.forEach((keyword) => {
        const link =
            document.createElement("a");

        link.href =
            `./movies.html?category=popular&keyword=${keyword.id}`;

        link.textContent =
            keyword.name;

        container.append(link);
    });

}


function renderRail(container, movies) {

    if (!movies.length) {
        const state =
            document.createElement("p");

        state.className =
            "section__state";

        state.textContent =
            "No titles available.";

        container.append(state);
        return;
    }

    movies.slice(0, 12).forEach((movie) => {
        container.append(createMovieCard(movie));
    });

}


function renderFavoriteState(button, isSaved) {

    button.classList.toggle("is-saved", isSaved);
    button.innerHTML =
        isSaved
            ? '<span aria-hidden="true">♥</span> SAVED'
            : '<span aria-hidden="true">♡</span> SAVE TO NOIR';

}


async function bindFavorite(button, movie) {

    const favorite =
        await getFavorite(movie.id);

    renderFavoriteState(button, Boolean(favorite));

    button.addEventListener("click", async () => {
        button.disabled =
            true;

        try {
            const saved =
                await toggleFavorite(movie);

            renderFavoriteState(button, saved);
        } catch (error) {
            console.error("Favorite unavailable.", error);
            button.textContent =
                "JSON Server unavailable";
        } finally {
            button.disabled =
                false;
        }
    });

}


function renderRating(container, value = 0) {

    container
        .querySelectorAll("[data-rating-value]")
        .forEach((button) => {
            const ratingValue =
                Number(button.dataset.ratingValue);

            button.textContent =
                ratingValue <= value
                    ? "★"
                    : "☆";

            button.classList.toggle("is-active", ratingValue <= value);
        });

}


async function bindRating(container, movieId) {

    const storedRating =
        await getMovieRating(movieId);

    let activeRating =
        storedRating?.rating || 0;

    renderRating(container, activeRating);

    container
        .querySelectorAll("[data-rating-value]")
        .forEach((button) => {
            button.addEventListener("click", async () => {
                activeRating =
                    Number(button.dataset.ratingValue);

                renderRating(container, activeRating);

                try {
                    await saveMovieRating(movieId, activeRating);
                } catch (error) {
                    console.error("Rating unavailable.", error);
                }
            });
        });

}


function createRatingControl(movieId) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "noir-rating";

    const label =
        document.createElement("span");

    label.className =
        "noir-rating__label";

    label.textContent =
        "YOUR RATING";

    const stars =
        document.createElement("div");

    stars.className =
        "noir-rating__stars";

    [1, 2, 3, 4, 5].forEach((value) => {
        const button =
            document.createElement("button");

        button.type =
            "button";

        button.dataset.ratingValue =
            value;

        button.setAttribute("aria-label", `Rate ${value} of 5`);
        button.textContent =
            "☆";

        stars.append(button);
    });

    wrapper.append(label, stars);
    bindRating(wrapper, movieId);

    return wrapper;

}


function renderMovieDetail(payload) {

    const {
        movie,
        credits,
        videos,
        images,
        keywords,
        similar,
        recommendations,
        watchProviders,
        releaseDates
    } = payload;

    const container =
        getElement("#movieDetail");

    const trailer =
        selectYouTubeTrailer(videos);

    const releaseInfo =
        releaseDates.results?.find((item) => item.iso_3166_1 === "US");

    const certifications =
        releaseInfo?.release_dates
            ?.map((item) => item.certification)
            .filter(Boolean)
            .join(", ") || "TBA";

    const watchRegion =
        watchProviders.results?.US || watchProviders.results?.CO;

    const watchNames =
        watchRegion?.flatrate
            ?.map((provider) => provider.provider_name)
            .join(", ") || "Not listed";

    container.replaceChildren();

    const hero =
        document.createElement("section");

    hero.className =
        "detail-hero";

    hero.style.setProperty(
        "--detail-backdrop",
        `url("${getImageUrl(movie.backdrop_path, "w1280")}")`
    );

    const poster =
        document.createElement("img");

    poster.className =
        "detail-hero__poster";

    poster.src =
        movie.poster_path
            ? getImageUrl(movie.poster_path, "w500")
            : FALLBACK_IMAGE;

    poster.alt =
        movie.title;

    const content =
        document.createElement("div");

    content.className =
        "detail-hero__content";

    const eyebrow =
        document.createElement("span");

    eyebrow.className =
        "section__eyebrow";

    eyebrow.textContent =
        "NOIR / MOVIE";

    const title =
        document.createElement("h1");

    title.textContent =
        movie.title;

    const overview =
        document.createElement("p");

    overview.className =
        "detail-overview";

    overview.textContent =
        movie.overview || "No synopsis available.";

    const actions =
        document.createElement("div");

    actions.className =
        "detail-actions";

    const saveButton =
        document.createElement("button");

    saveButton.className =
        "save-action";

    saveButton.type =
        "button";

    saveButton.textContent =
        "♡ SAVE TO NOIR";

    actions.append(saveButton);

    if (trailer) {
        const trailerButton =
            document.createElement("button");

        trailerButton.className =
            "button button--secondary";

        trailerButton.type =
            "button";

        trailerButton.textContent =
            "Watch Trailer";

        trailerButton.addEventListener("click", () => {
            openTrailerModal(trailer, movie);
        });

        actions.append(trailerButton);
    }

    const ratingControl =
        createRatingControl(movie.id);

    const facts =
        createInfoList([
            ["Release", movie.release_date],
            ["Runtime", formatRuntime(movie.runtime)],
            ["Genres", movie.genres?.map((genre) => genre.name).join(", ")],
            ["Director", getDirector(credits)],
            ["TMDB Score", formatMovieScore(movie.vote_average)],
            ["Certification", certifications],
            ["Where To Watch", watchNames]
        ]);

    content.append(eyebrow, title, overview, actions, ratingControl, facts);
    hero.append(poster, content);

    const castSection =
        createSection("Cast");

    castSection.body.classList.add("cast-grid");

    credits.cast?.slice(0, 12).forEach((person) => {
        castSection.body.append(createCastCard(person));
    });

    const mediaSection =
        createSection("Media");

    images.backdrops?.slice(0, 6).forEach((image) => {
        const item =
            document.createElement("img");

        item.src =
            getImageUrl(image.file_path, "w780");

        item.alt =
            movie.title;

        mediaSection.body.append(item);
    });

    const keywordsSection =
        createSection("Keywords");

    renderKeywordList(keywordsSection.body, keywords.keywords || []);

    const similarSection =
        createSection("Similar");

    similarSection.body.classList.add("movies-grid", "movies-grid--rail");
    renderRail(similarSection.body, similar.results || []);

    const recommendationsSection =
        createSection("Recommendations");

    recommendationsSection.body.classList.add("movies-grid", "movies-grid--rail");
    renderRail(recommendationsSection.body, recommendations.results || []);

    container.append(
        hero,
        castSection.section,
        mediaSection.section,
        keywordsSection.section,
        similarSection.section,
        recommendationsSection.section
    );

    document.title =
        `NOIR - ${movie.title}`;

    bindFavorite(saveButton, movie);

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


function createSection(titleText) {

    const section =
        document.createElement("section");

    section.className =
        "detail-section";

    const title =
        document.createElement("h2");

    title.textContent =
        titleText;

    const body =
        document.createElement("div");

    body.className =
        "detail-section__body";

    section.append(title, body);

    return {
        section,
        body
    };

}


async function initializeMovieDetail() {

    const movieId =
        getMovieId();

    const container =
        getElement("#movieDetail");

    if (!movieId) {
        container.textContent =
            "Missing movie id.";
        return;
    }

    try {
        const [
            movie,
            credits,
            videos,
            images,
            keywords,
            similar,
            recommendations,
            watchProviders,
            releaseDates
        ] =
            await Promise.all([
                requestCachedTMDB(`/movie/${movieId}`, { language: "en-US" }),
                requestCachedTMDB(`/movie/${movieId}/credits`, { language: "en-US" }),
                requestCachedTMDB(`/movie/${movieId}/videos`, { language: "en-US" }),
                requestCachedTMDB(`/movie/${movieId}/images`, {}),
                requestCachedTMDB(`/movie/${movieId}/keywords`, {}),
                requestCachedTMDB(`/movie/${movieId}/similar`, { language: "en-US", page: 1 }),
                requestCachedTMDB(`/movie/${movieId}/recommendations`, { language: "en-US", page: 1 }),
                requestCachedTMDB(`/movie/${movieId}/watch/providers`, {}),
                requestCachedTMDB(`/movie/${movieId}/release_dates`, {})
            ]);

        renderMovieDetail({
            movie,
            credits,
            videos,
            images,
            keywords,
            similar,
            recommendations,
            watchProviders,
            releaseDates
        });
    } catch (error) {
        console.error("Movie detail unavailable.", error);
        container.innerHTML =
            '<p class="section__state">Movie detail is unavailable.</p>';
    }

}

bindTrailerModalControls();
initializeMovieDetail();
