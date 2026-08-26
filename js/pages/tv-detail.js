import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";

import {
    createCastCard
} from "../components/cast-card.js";

import {
    createMediaCard,
    formatMovieScore
} from "../components/movie-card.js";

import {
    bindFavoriteButton,
    createRatingControl
} from "../components/noir-actions.js";

import {
    selectYouTubeTrailer
} from "../components/trailer.js";

import {
    initializeUserNavigation
} from "../components/user-navigation.js";


let activeTVId =
    null;


function getElement(selector) {

    return document.querySelector(selector);

}


function getTVId() {

    return new URLSearchParams(window.location.search).get("id");

}


function createSection(titleText, countText = "") {

    const section =
        document.createElement("section");

    section.className =
        "detail-section";

    const header =
        document.createElement("div");

    header.className =
        "detail-section__header";

    const title =
        document.createElement("h2");

    title.textContent =
        titleText;

    header.append(title);

    if (countText) {
        const count =
            document.createElement("span");

        count.textContent =
            countText;

        header.append(count);
    }

    const body =
        document.createElement("div");

    body.className =
        "detail-section__body";

    section.append(header, body);

    return {
        section,
        body
    };

}


function formatRuntime(runtimes) {

    const runtime =
        Array.isArray(runtimes)
            ? runtimes[0]
            : runtimes;

    return runtime
        ? `${runtime} min`
        : "";

}


function formatAirRange(show) {

    const first =
        show.first_air_date?.slice(0, 4);

    const last =
        show.status === "Ended"
            ? show.last_air_date?.slice(0, 4)
            : "PRESENT";

    return [first, last].filter(Boolean).join(" - ");

}


function createInfoList(items) {

    const list =
        document.createElement("dl");

    list.className =
        "detail-facts";

    items
        .filter(([, value]) => value)
        .forEach(([label, value]) => {
            const term =
                document.createElement("dt");

            term.textContent =
                label;

            const description =
                document.createElement("dd");

            description.textContent =
                value;

            list.append(term, description);
        });

    return list;

}


function openTrailerModal(video, show) {

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
            `Trailer / ${show.name}`;
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


function renderCreatorLinks(container, creators) {

    creators.forEach((creator) => {
        const link =
            document.createElement("a");

        link.className =
            "credit-link";

        link.href =
            `./person.html?id=${creator.id}`;

        link.textContent =
            creator.name;

        container.append(link);
    });

}


function renderKeywords(container, keywords) {

    const items =
        keywords.results || [];

    if (!items.length) {
        container.textContent =
            "No keywords available.";
        return;
    }

    items.slice(0, 16).forEach((keyword) => {
        const item =
            document.createElement("span");

        item.className =
            "keyword-chip";

        item.textContent =
            keyword.name;

        container.append(item);
    });

}


function renderRail(container, shows) {

    if (!shows.length) {
        const state =
            document.createElement("p");

        state.className =
            "section__state";

        state.textContent =
            "NO SERIES FOUND";

        container.append(state);
        return;
    }

    shows.slice(0, 12).forEach((show) => {
        container.append(createMediaCard(show, "tv"));
    });

}


function createSeasonButton(season, index) {

    const button =
        document.createElement("button");

    button.className =
        "season-item";

    button.type =
        "button";

    button.dataset.seasonNumber =
        season.season_number;

    const number =
        document.createElement("span");

    number.className =
        "season-item__number";

    number.textContent =
        String(index + 1).padStart(2, "0");

    const poster =
        document.createElement("img");

    poster.className =
        "season-item__poster";

    poster.src =
        season.poster_path
            ? getImageUrl(season.poster_path, "w185")
            : FALLBACK_IMAGE;

    poster.alt =
        season.name;

    const info =
        document.createElement("span");

    info.className =
        "season-item__info";

    const name =
        document.createElement("strong");

    name.textContent =
        season.name;

    const meta =
        document.createElement("span");

    meta.textContent =
        [
            season.air_date?.slice(0, 4),
            `${season.episode_count || 0} episodes`
        ].filter(Boolean).join(" / ");

    const overview =
        document.createElement("span");

    overview.textContent =
        season.overview || "";

    info.append(name, meta, overview);
    button.append(number, poster, info);

    return button;

}


async function loadSeasonEpisodes(seasonNumber) {

    const container =
        getElement("#episodesList");

    const title =
        getElement("#episodesTitle");

    if (!container || !activeTVId) {
        return;
    }

    container.replaceChildren();

    const state =
        document.createElement("p");

    state.className =
        "section__state";

    state.textContent =
        "LOADING EPISODES...";

    container.append(state);

    try {
        const data =
            await requestCachedTMDB(`/tv/${activeTVId}/season/${seasonNumber}`, {
                language: "en-US"
            });

        if (title) {
            title.textContent =
                `EPISODES / ${data.name}`;
        }

        renderEpisodes(container, data.episodes || []);
    } catch (error) {
        console.error("Episodes unavailable.", error);
        container.innerHTML =
            '<p class="section__state">NO EPISODES AVAILABLE</p>';
    }

}


function renderEpisodes(container, episodes) {

    container.replaceChildren();

    if (!episodes.length) {
        container.innerHTML =
            '<p class="section__state">NO EPISODES AVAILABLE</p>';
        return;
    }

    episodes.forEach((episode) => {
        const item =
            document.createElement("article");

        item.className =
            "episode-item";

        const number =
            document.createElement("span");

        number.className =
            "episode-item__number";

        number.textContent =
            String(episode.episode_number).padStart(2, "0");

        const still =
            document.createElement("img");

        still.className =
            "episode-item__still";

        // still_path es la imagen propia del episodio; si no existe, se mantiene la estética con fallback.
        still.src =
            episode.still_path
                ? getImageUrl(episode.still_path, "w500")
                : FALLBACK_IMAGE;

        still.alt =
            episode.name;

        const content =
            document.createElement("div");

        const title =
            document.createElement("h3");

        title.textContent =
            episode.name;

        const meta =
            document.createElement("p");

        meta.textContent =
            [
                episode.runtime ? `${episode.runtime} min` : "",
                episode.air_date,
                episode.vote_average ? `TMDB ${formatMovieScore(episode.vote_average)}` : ""
            ].filter(Boolean).join(" / ");

        const overview =
            document.createElement("p");

        overview.textContent =
            episode.overview || "No overview available.";

        content.append(title, meta, overview);
        item.append(number, still, content);
        container.append(item);
    });

}


function renderSeasons(show) {

    const seasons =
        (show.seasons || []).filter((season) => {
            return season.season_number !== 0 || season.episode_count > 0;
        });

    const seasonsSection =
        createSection("Seasons", String(seasons.length).padStart(2, "0"));

    seasonsSection.body.classList.add("seasons-list");

    seasons.forEach((season, index) => {
        const button =
            createSeasonButton(season, index);

        button.addEventListener("click", () => {
            seasonsSection.body
                .querySelectorAll(".season-item")
                .forEach((item) => {
                    item.classList.toggle(
                        "is-active",
                        item === button
                    );
                });

            loadSeasonEpisodes(season.season_number);
        });

        seasonsSection.body.append(button);
    });

    const episodesSection =
        createSection("Episodes");

    episodesSection.section.id =
        "episodesSection";

    episodesSection.section.querySelector("h2").id =
        "episodesTitle";

    episodesSection.body.id =
        "episodesList";

    if (seasons[0]) {
        window.setTimeout(() => {
            const firstSeason =
                seasonsSection.body.querySelector(".season-item");

            if (firstSeason) {
                firstSeason.classList.add("is-active");
            }

            loadSeasonEpisodes(seasons[0].season_number);
        }, 0);
    }

    return [
        seasonsSection.section,
        episodesSection.section
    ];

}


function renderTVDetail(payload) {

    const {
        show,
        credits,
        videos,
        keywords,
        similar,
        recommendations
    } = payload;

    const container =
        getElement("#tvDetail");

    const trailer =
        selectYouTubeTrailer(videos);

    container.replaceChildren();

    const hero =
        document.createElement("section");

    hero.className =
        "detail-hero tv-detail-hero";

    hero.style.setProperty(
        "--detail-backdrop",
        `url("${getImageUrl(show.backdrop_path, "w1280")}")`
    );

    const poster =
        document.createElement("img");

    poster.className =
        "detail-hero__poster";

    poster.src =
        show.poster_path
            ? getImageUrl(show.poster_path, "w500")
            : FALLBACK_IMAGE;

    poster.alt =
        show.name;

    const content =
        document.createElement("div");

    content.className =
        "detail-hero__content";

    const eyebrow =
        document.createElement("span");

    eyebrow.className =
        "section__eyebrow";

    eyebrow.textContent =
        "NOIR / TELEVISION";

    const title =
        document.createElement("h1");

    title.textContent =
        show.name;

    const tagline =
        document.createElement("p");

    tagline.className =
        "tv-tagline";

    tagline.textContent =
        show.tagline || show.original_name || "";

    const overview =
        document.createElement("p");

    overview.className =
        "detail-overview";

    overview.textContent =
        show.overview || "No overview available.";

    const actions =
        document.createElement("div");

    actions.className =
        "detail-actions";

    if (trailer) {
        const trailerButton =
            document.createElement("button");

        trailerButton.className =
            "button button--primary";

        trailerButton.type =
            "button";

        trailerButton.textContent =
            "Watch Trailer";

        trailerButton.addEventListener("click", () => {
            openTrailerModal(trailer, show);
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
        "♡ SAVE TO NOIR";

    actions.append(saveButton);

    const ratingControl =
        createRatingControl(show.id, "tv");

    const facts =
        createInfoList([
            ["Air Dates", formatAirRange(show)],
            ["Genres", show.genres?.map((genre) => genre.name).join(", ")],
            ["TMDB Score", formatMovieScore(show.vote_average)],
            ["Vote Count", String(show.vote_count || "")],
            ["Status", show.status],
            ["Network", show.networks?.map((network) => network.name).join(", ")],
            ["Original Language", show.original_language?.toUpperCase()],
            ["Episode Runtime", formatRuntime(show.episode_run_time)],
            ["Seasons", String(show.number_of_seasons || "")],
            ["Episodes", String(show.number_of_episodes || "")]
        ]);

    content.append(eyebrow, title, tagline, overview, actions, ratingControl, facts);
    hero.append(poster, content);

    const detailSections =
        [];

    if (show.created_by?.length) {
        const creatorsSection =
            createSection("Created By");

        renderCreatorLinks(creatorsSection.body, show.created_by);
        detailSections.push(creatorsSection.section);
    }

    const castSection =
        createSection("Cast");

    castSection.body.classList.add("cast-grid");
    (credits.cast || []).slice(0, 12).forEach((person) => {
        castSection.body.append(createCastCard(person));
    });

    const keywordsSection =
        createSection("Keywords");

    renderKeywords(keywordsSection.body, keywords);

    const similarSection =
        createSection("Similar Series");

    similarSection.body.classList.add("movies-grid", "movies-grid--rail");
    renderRail(similarSection.body, similar.results || []);

    const recommendationsSection =
        createSection("Recommended");

    recommendationsSection.body.classList.add("movies-grid", "movies-grid--rail");
    renderRail(recommendationsSection.body, recommendations.results || []);

    container.append(
        hero,
        ...detailSections,
        castSection.section,
        ...renderSeasons(show),
        keywordsSection.section,
        similarSection.section,
        recommendationsSection.section
    );

    bindFavoriteButton(saveButton, show, "tv");

    document.title =
        `NOIR - ${show.name}`;

}


async function initializeTVDetail() {

    activeTVId =
        getTVId();

    const container =
        getElement("#tvDetail");

    if (!activeTVId) {
        container.textContent =
            "Missing TV id.";
        return;
    }

    try {
        const [
            show,
            credits,
            videos,
            keywords,
            similar,
            recommendations
        ] =
            await Promise.all([
                requestCachedTMDB(`/tv/${activeTVId}`, { language: "en-US" }),
                requestCachedTMDB(`/tv/${activeTVId}/credits`, { language: "en-US" }),
                requestCachedTMDB(`/tv/${activeTVId}/videos`, { language: "en-US" }),
                requestCachedTMDB(`/tv/${activeTVId}/keywords`, {}),
                requestCachedTMDB(`/tv/${activeTVId}/similar`, { language: "en-US", page: 1 }),
                requestCachedTMDB(`/tv/${activeTVId}/recommendations`, { language: "en-US", page: 1 })
            ]);

        renderTVDetail({
            show,
            credits,
            videos,
            keywords,
            similar,
            recommendations
        });
    } catch (error) {
        console.error("TV detail unavailable.", error);
        container.innerHTML =
            '<p class="section__state">SERIES DETAIL IS UNAVAILABLE</p>';
    }

}


initializeUserNavigation();
bindTrailerModalControls();
initializeTVDetail();
