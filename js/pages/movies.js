import {
    MOVIE_CATEGORIES,
    WATCH_REGION,
    getMovieCategory,
    requestCachedTMDB,
    requestTMDB
} from "../api/tmdb.js";

import {
    createMovieCard
} from "../components/movie-card.js";

import {
    initializeUserNavigation
} from "../components/user-navigation.js";


const state =
    {
        category: "popular",
        page: 1,
        totalPages: 1,
        isFiltered: false,
        activeParameters: {}
    };


const categoryDateRanges =
    {
        "now-playing": () => {
            const today =
                new Date();

            const from =
                new Date(today);

            from.setDate(today.getDate() - 45);

            return {
                "primary_release_date.gte": toDateInputValue(from),
                "primary_release_date.lte": toDateInputValue(today)
            };
        },
        upcoming: () => {
            const today =
                new Date();

            return {
                "primary_release_date.gte": toDateInputValue(today)
            };
        }
    };


function getElement(selector) {

    return document.querySelector(selector);

}


function toDateInputValue(date) {

    return date.toISOString().slice(0, 10);

}


function normalizeCategory(value) {

    return MOVIE_CATEGORIES[value]
        ? value
        : "popular";

}


function setPageTitle() {

    const category =
        getMovieCategory(state.category);

    const title =
        getElement("#moviesTitle");

    if (title) {
        title.textContent =
            category.title;
    }

    document.title =
        `NOIR - ${category.title}`;

}


function renderState(message) {

    const grid =
        getElement("#moviesGrid");

    if (!grid) {
        return;
    }

    grid.replaceChildren();

    const stateElement =
        document.createElement("p");

    stateElement.className =
        "section__state";

    stateElement.textContent =
        message;

    grid.append(stateElement);

}


function appendMovies(movies) {

    const grid =
        getElement("#moviesGrid");

    if (!grid) {
        return;
    }

    if (state.page === 1) {
        grid.replaceChildren();
    }

    if (!movies.length && state.page === 1) {
        renderState("No movies match these filters.");
        return;
    }

    movies.forEach((movie) => {
        grid.append(createMovieCard(movie));
    });

}


function updateMeta(data) {

    const meta =
        getElement("#catalogMeta");

    const loadMore =
        getElement("#loadMoreButton");

    if (meta) {
        const total =
            data.total_results || 0;

        meta.textContent =
            `${total.toLocaleString()} results / page ${state.page}`;
    }

    if (loadMore) {
        loadMore.hidden =
            state.page >= state.totalPages;

        loadMore.disabled =
            state.page >= state.totalPages;
    }

}


function getCategoryDiscoverParameters() {

    const category =
        getMovieCategory(state.category);

    const dateRangeFactory =
        categoryDateRanges[state.category];

    return {
        sort_by: category.parameters.sort_by,
        ...(dateRangeFactory ? dateRangeFactory() : {}),
        ...(state.category === "top-rated"
            ? {
                "vote_count.gte": category.parameters["vote_count.gte"]
            }
            : {})
    };

}


async function resolveKeywordIds(keywordText) {

    const keywords =
        keywordText
            .split(",")
            .map((keyword) => keyword.trim())
            .filter(Boolean);

    if (!keywords.length) {
        return "";
    }

    const results =
        await Promise.all(
            keywords.map(async (keyword) => {
                const data =
                    await requestCachedTMDB("/search/keyword", {
                        query: keyword,
                        page: 1
                    });

                return data.results?.[0]?.id;
            })
        );

    return results
        .filter(Boolean)
        .join(",");

}


async function buildFilterParameters(form) {

    const formData =
        new FormData(form);

    const parameters =
        {
            ...getCategoryDiscoverParameters()
        };

    const simpleMap =
        {
            sort_by: "sort_by",
            with_genres: "with_genres",
            with_original_language: "with_original_language"
        };

    Object.entries(simpleMap).forEach(([field, parameter]) => {
        const value =
            formData.get(field);

        if (value) {
            parameters[parameter] =
                value;
        }
    });

    const watch =
        formData.get("watch");

    if (watch) {
        parameters.watch_region =
            WATCH_REGION;

        parameters.with_watch_monetization_types =
            watch;
    }

    const releaseFrom =
        formData.get("release_from");

    const releaseTo =
        formData.get("release_to");

    if (releaseFrom) {
        parameters["primary_release_date.gte"] =
            releaseFrom;
    }

    if (releaseTo) {
        parameters["primary_release_date.lte"] =
            releaseTo;
    }

    const certification =
        formData.get("certification");

    if (certification) {
        parameters.certification_country =
            "US";

        parameters.certification =
            certification;
    }

    const numericMap =
        {
            vote_average_gte: "vote_average.gte",
            vote_count_gte: "vote_count.gte",
            runtime_gte: "with_runtime.gte",
            runtime_lte: "with_runtime.lte"
        };

    Object.entries(numericMap).forEach(([field, parameter]) => {
        const value =
            formData.get(field);

        if (value) {
            parameters[parameter] =
                value;
        }
    });

    const keywordIds =
        await resolveKeywordIds(String(formData.get("keywords") || ""));

    if (keywordIds) {
        parameters.with_keywords =
            keywordIds;
    }

    return parameters;

}


function getKeywordParameter(keywordId) {

    if (!keywordId) {
        return {};
    }

    return {
        with_keywords: keywordId
    };

}


async function loadMovies({ append = false } = {}) {

    const category =
        getMovieCategory(state.category);

    const endpoint =
        state.isFiltered
            ? "/discover/movie"
            : category.endpoint;

    const parameters =
        state.isFiltered
            ? state.activeParameters
            : {};

    if (!append) {
        state.page =
            1;

        renderState("Loading movies...");
    }

    try {
        const data =
            await requestTMDB(endpoint, {
                language: "en-US",
                include_adult: false,
                page: state.page,
                ...parameters
            });

        state.totalPages =
            Math.min(data.total_pages || 1, 500);

        appendMovies(data.results || []);
        updateMeta(data);
    } catch (error) {
        console.error("Movies unavailable.", error);
        renderState("Movies are unavailable. Check the TMDB configuration.");
    }

}


async function loadGenres() {

    const select =
        getElement("#genreFilter");

    if (!select) {
        return;
    }

    try {
        const data =
            await requestCachedTMDB("/genre/movie/list", {
                language: "en-US"
            });

        (data.genres || []).forEach((genre) => {
            const option =
                document.createElement("option");

            option.value =
                genre.id;

            option.textContent =
                genre.name;

            select.append(option);
        });
    } catch (error) {
        console.error("Genres unavailable.", error);
    }

}


function bindFilters() {

    const form =
        getElement("#movieFilters");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        state.isFiltered =
            true;

        renderState("Applying filters...");

        state.activeParameters =
            await buildFilterParameters(form);

        loadMovies();
    });

    form.addEventListener("reset", () => {
        window.setTimeout(() => {
            state.isFiltered =
                false;

            state.activeParameters =
                {};

            loadMovies();
        }, 0);
    });

}


function bindLoadMore() {

    const button =
        getElement("#loadMoreButton");

    if (!button) {
        return;
    }

    button.addEventListener("click", () => {
        if (state.page >= state.totalPages) {
            return;
        }

        state.page +=
            1;

        loadMovies({
            append: true
        });
    });

}


function readUrlState() {

    const parameters =
        new URLSearchParams(window.location.search);

    state.category =
        normalizeCategory(parameters.get("category"));

    const genre =
        parameters.get("genre");

    const keyword =
        parameters.get("keyword");

    if (genre) {
        state.isFiltered =
            true;

        state.activeParameters =
            {
                ...getCategoryDiscoverParameters(),
                with_genres: genre
            };
    }

    if (keyword) {
        state.isFiltered =
            true;

        state.activeParameters =
            {
                ...state.activeParameters,
                ...getCategoryDiscoverParameters(),
                ...getKeywordParameter(keyword)
            };
    }

}


function initializeMoviesPage() {

    readUrlState();
    setPageTitle();
    bindFilters();
    bindLoadMore();
    loadGenres();
    loadMovies();

}


initializeUserNavigation();
initializeMoviesPage();
