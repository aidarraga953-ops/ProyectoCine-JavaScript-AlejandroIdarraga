import {
    TV_CATEGORIES,
    WATCH_REGION,
    getTVCategory,
    requestCachedTMDB,
    requestTMDB
} from "../api/tmdb.js";

import {
    createMediaCard
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


function getElement(selector) {

    return document.querySelector(selector);

}


function getTVCategoryFromUrl() {

    const parameters =
        new URLSearchParams(window.location.search);

    const category =
        parameters.get("category");

    return TV_CATEGORIES[category]
        ? category
        : "popular";

}


function setTitle() {

    const category =
        getTVCategory(state.category);

    const title =
        getElement("#tvTitle");

    if (title) {
        title.textContent =
            category.title;
    }

    document.title =
        `NOIR - ${category.title}`;

}


function renderState(message) {

    const grid =
        getElement("#tvGrid");

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


function appendTVShows(shows) {

    const grid =
        getElement("#tvGrid");

    if (!grid) {
        return;
    }

    if (state.page === 1) {
        grid.replaceChildren();
    }

    if (!shows.length && state.page === 1) {
        renderState("NO SERIES FOUND");
        return;
    }

    shows.forEach((show) => {
        grid.append(createMediaCard(show, "tv"));
    });

}


function updateMeta(data) {

    const meta =
        getElement("#tvCatalogMeta");

    const button =
        getElement("#tvLoadMoreButton");

    if (meta) {
        meta.textContent =
            `${(data.total_results || 0).toLocaleString()} results / page ${state.page}`;
    }

    if (button) {
        button.hidden =
            state.page >= state.totalPages;

        button.disabled =
            state.page >= state.totalPages;
    }

}


function getTVDiscoverParameters() {

    const category =
        getTVCategory(state.category);

    return {
        sort_by: category.parameters.sort_by,
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
            ...getTVDiscoverParameters()
        };

    ["sort_by", "with_genres", "with_original_language", "with_watch_providers"].forEach((field) => {
        const value =
            formData.get(field);

        if (value) {
            parameters[field] =
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

    if (parameters.with_watch_providers) {
        parameters.watch_region =
            WATCH_REGION;
    }

    const firstAirFrom =
        formData.get("first_air_from");

    const firstAirTo =
        formData.get("first_air_to");

    if (firstAirFrom) {
        parameters["first_air_date.gte"] =
            firstAirFrom;
    }

    if (firstAirTo) {
        parameters["first_air_date.lte"] =
            firstAirTo;
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


async function loadTVShows({ append = false } = {}) {

    const category =
        getTVCategory(state.category);

    const endpoint =
        state.isFiltered
            ? "/discover/tv"
            : category.endpoint;

    const parameters =
        state.isFiltered
            ? state.activeParameters
            : {};

    if (!append) {
        state.page =
            1;

        renderState("LOADING TELEVISION...");
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

        appendTVShows(data.results || []);
        updateMeta(data);
    } catch (error) {
        console.error("TV catalog unavailable.", error);
        renderState("TELEVISION IS UNAVAILABLE");
    }

}


async function loadGenres() {

    const select =
        getElement("#tvGenreFilter");

    if (!select) {
        return;
    }

    try {
        const data =
            await requestCachedTMDB("/genre/tv/list", {
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
        console.error("TV genres unavailable.", error);
    }

}


async function loadProviders() {

    const select =
        getElement("#tvProviderFilter");

    if (!select) {
        return;
    }

    try {
        const data =
            await requestCachedTMDB("/watch/providers/tv", {
                language: "en-US",
                watch_region: WATCH_REGION
            });

        (data.results || [])
            .slice()
            .sort((first, second) => {
                return first.provider_name.localeCompare(second.provider_name);
            })
            .forEach((provider) => {
                const option =
                    document.createElement("option");

                option.value =
                    provider.provider_id;

                option.textContent =
                    provider.provider_name;

                select.append(option);
            });
    } catch (error) {
        console.error("TV providers unavailable.", error);
    }

}


function bindFilters() {

    const form =
        getElement("#tvFilters");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        state.isFiltered =
            true;

        renderState("APPLYING FILTERS...");
        state.activeParameters =
            await buildFilterParameters(form);

        loadTVShows();
    });

    form.addEventListener("reset", () => {
        window.setTimeout(() => {
            state.isFiltered =
                false;

            state.activeParameters =
                {};

            loadTVShows();
        }, 0);
    });

}


function bindLoadMore() {

    const button =
        getElement("#tvLoadMoreButton");

    if (!button) {
        return;
    }

    button.addEventListener("click", () => {
        if (state.page >= state.totalPages) {
            return;
        }

        state.page +=
            1;

        loadTVShows({
            append: true
        });
    });

}


function initializeTVPage() {

    state.category =
        getTVCategoryFromUrl();

    setTitle();
    bindFilters();
    bindLoadMore();
    loadGenres();
    loadProviders();
    loadTVShows();

}


initializeUserNavigation();
initializeTVPage();
