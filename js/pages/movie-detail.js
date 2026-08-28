import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestCachedTMDB,
    requestTMDB
} from "../api/tmdb.js";

import {
    ensureFunctionsForDate,
    formatCurrency,
    formatDateParts,
    getFunctionSeats,
    getRooms
} from "../api/cinema-api.js";

import {
    applyMoviePalette,
    extractMoviePalette
} from "../utils/movie-palette.js";

import {
    createMovieCard,
    formatMovieScore
} from "../components/movie-card.js";

import {
    createCastCard
} from "../components/cast-card.js";

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


function getElement(selector) {

    return document.querySelector(selector);

}


function getMovieId() {

    return new URLSearchParams(window.location.search).get("id");

}


function toDateValue(date) {

    return date.toISOString().slice(0, 10);

}


function createLocalDate(dateValue) {

    return new Date(`${dateValue}T12:00:00`);

}


function getMonthLabel(date) {

    return new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric"
    }).format(date).toUpperCase();

}


function getDaysInMonth(date) {

    const year =
        date.getFullYear();

    const month =
        date.getMonth();

    const totalDays =
        new Date(year, month + 1, 0).getDate();

    // Date genera cada dia del mes; luego lo normalizamos a YYYY-MM-DD para JSON Server.
    return Array.from({
        length: totalDays
    }, (_, index) => {
        return toDateValue(new Date(year, month, index + 1, 12));
    });

}


function getWeekRange(dateValue) {

    const date =
        createLocalDate(dateValue);

    const day =
        date.getDay();

    const mondayOffset =
        day === 0
            ? -6
            : 1 - day;

    const start =
        new Date(date);

    start.setDate(date.getDate() + mondayOffset);

    const end =
        new Date(start);

    end.setDate(start.getDate() + 6);

    return {
        start: toDateValue(start),
        end: toDateValue(end)
    };

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


function groupBy(items, keyFactory) {

    return items.reduce((groups, item) => {
        const key =
            keyFactory(item);

        if (!groups.has(key)) {
            groups.set(key, []);
        }

        groups.get(key).push(item);

        return groups;
    }, new Map());

}


function createScreeningsSection() {

    const section =
        document.createElement("section");

    section.className =
        "detail-section screenings-section";

    section.style.setProperty(
        "--screening-backdrop",
        "none"
    );

    const header =
        document.createElement("header");

    header.className =
        "detail-section__header";

    const titleGroup =
        document.createElement("div");

    const eyebrow =
        document.createElement("span");

    eyebrow.textContent =
        "NOIR / SCREENINGS";

    const title =
        document.createElement("h2");

    title.textContent =
        "Functions";

    titleGroup.append(eyebrow, title);

    const meta =
        document.createElement("span");

    meta.textContent =
        "Loading cinema data";

    header.append(titleGroup, meta);

    const body =
        document.createElement("div");

    body.className =
        "screenings";

    body.innerHTML =
        '<p class="section__state">Loading screenings...</p>';

    const other =
        document.createElement("div");

    other.className =
        "other-screenings";

    const weekly =
        document.createElement("section");

    weekly.className =
        "weekly-releases";

    section.append(header, body, other, weekly);

    return {
        section,
        body,
        other,
        weekly,
        meta
    };

}


function getRoomLabel(room) {

    if (!room) {
        return "Room TBA";
    }

    return `${room.name} / ${room.type}`;

}


async function getAvailabilityByFunction(functions) {

    const entries =
        await Promise.all(functions.map(async (movieFunction) => {
            const functionSeats =
                await getFunctionSeats(movieFunction.id);

            const available =
                functionSeats.filter((seat) => {
                    return seat.status === "available";
                }).length;

            return [movieFunction.id, available];
        }));

    return new Map(entries);

}


function renderDateTickets(container, dates, selectedDate, onSelect) {

    container.replaceChildren();

    dates.forEach((date) => {
        const parts =
            formatDateParts(date);

        const button =
            document.createElement("button");

        button.className =
            "screening-date";

        button.type =
            "button";

        button.classList.toggle("is-active", date === selectedDate);
        button.setAttribute("aria-pressed", String(date === selectedDate));
        button.innerHTML =
            `<span>${parts.weekday}</span><strong>${parts.day}</strong><small>${parts.month}</small>`;

        button.addEventListener("click", () => {
            onSelect(date);
        });

        container.append(button);
    });

}


function renderMonthSelector(container, currentMonth, onMonthChange) {

    container.replaceChildren();

    const previous =
        document.createElement("button");

    previous.type =
        "button";

    previous.setAttribute("aria-label", "Previous month");
    previous.textContent =
        "<-";

    const label =
        document.createElement("strong");

    label.textContent =
        getMonthLabel(currentMonth);

    const next =
        document.createElement("button");

    next.type =
        "button";

    next.setAttribute("aria-label", "Next month");
    next.textContent =
        "->";

    previous.addEventListener("click", () => {
        onMonthChange(-1);
    });

    next.addEventListener("click", () => {
        onMonthChange(1);
    });

    container.append(previous, label, next);

}


function renderFunctionTimes(container, functions, roomsById, availabilityByFunction, selectedFunctionId, onSelect) {

    container.replaceChildren();

    const byType =
        groupBy(functions, (movieFunction) => {
            return roomsById.get(Number(movieFunction.roomId))?.type || "STANDARD";
        });

    byType.forEach((items, type) => {
        const group =
            document.createElement("div");

        group.className =
            "screening-time-group";

        const title =
            document.createElement("h3");

        title.textContent =
            type;

        const times =
            document.createElement("div");

        times.className =
            "screening-times";

        items.forEach((movieFunction) => {
            const room =
                roomsById.get(Number(movieFunction.roomId));

            const button =
                document.createElement("button");

            button.className =
                "screening-time";

            button.type =
                "button";

            button.classList.toggle("is-active", Number(movieFunction.id) === Number(selectedFunctionId));
            button.setAttribute("aria-pressed", String(Number(movieFunction.id) === Number(selectedFunctionId)));
            button.dataset.functionId =
                movieFunction.id;

            button.innerHTML =
                `<strong>${movieFunction.time}</strong><span>${getRoomLabel(room)}</span>`;

            button.addEventListener("click", () => {
                onSelect(movieFunction.id);
            });

            times.append(button);
        });

        group.append(title, times);
        container.append(group);
    });

}


async function loadWeeklyReleases(selectedDate, container) {

    const week =
        getWeekRange(selectedDate);

    container.innerHTML =
        '<p class="section__state">Loading openings...</p>';

    try {
        // Weekly Releases es descubrimiento TMDB: no crea functions ni toca JSON Server.
        let movies =
            [];

        const data =
            await requestTMDB("/discover/movie", {
                language: "en-US",
                include_adult: false,
                sort_by: "popularity.desc",
                "primary_release_date.gte": week.start,
                "primary_release_date.lte": week.end,
                page: 1
            });

        movies =
            data.results || [];

        if (!movies.length) {
            const upcoming =
                await requestTMDB("/movie/upcoming", {
                    language: "en-US",
                    page: 1
                });

            movies =
                (upcoming.results || []).filter((movie) => {
                    return movie.release_date >= week.start &&
                        movie.release_date <= week.end;
                });
        }

        renderWeeklyReleaseTickets(container, movies.slice(0, 5), week);
    } catch (error) {
        console.warn("Weekly releases unavailable.", error);
        container.innerHTML =
            '<p class="section__state">NO FILMS OPENING THIS WEEK</p>';
    }

}


function renderWeeklyReleaseTickets(container, movies, week) {

    container.replaceChildren();

    const header =
        document.createElement("header");

    header.className =
        "detail-section__header";

    header.innerHTML =
        `<div>
            <span>NOIR / THIS WEEK</span>
            <h2>Opening This Week</h2>
        </div>
        <span>${formatDateParts(week.start).month} ${formatDateParts(week.start).day} - ${formatDateParts(week.end).month} ${formatDateParts(week.end).day}</span>`;

    const list =
        document.createElement("div");

    list.className =
        "weekly-ticket-list";

    if (!movies.length) {
        list.innerHTML =
            '<p class="section__state">NO FILMS OPENING THIS WEEK</p>';
        container.append(header, list);
        return;
    }

    movies.forEach((movie, index) => {
        const parts =
            formatDateParts(movie.release_date);

        const link =
            document.createElement("a");

        link.className =
            "weekly-ticket";

        link.href =
            `./movie.html?id=${movie.id}`;

        link.style.setProperty(
            "--ticket-backdrop",
            `url("${getImageUrl(movie.backdrop_path || movie.poster_path, "w780")}")`
        );

        link.style.setProperty(
            "--ticket-poster",
            `url("${getImageUrl(movie.poster_path || movie.backdrop_path, "w500")}")`
        );

        link.innerHTML =
            `<span class="weekly-ticket__number">${String(index + 1).padStart(2, "0")}</span>
            <span class="weekly-ticket__image" aria-hidden="true"></span>
            <span class="weekly-ticket__main">
                <strong>${movie.title}</strong>
                <small>Opening This Week</small>
            </span>
            <span class="weekly-ticket__stub">
                <small>${parts.month}</small>
                <strong>${parts.day}</strong>
                <small>${parts.weekday}</small>
                <em>View -></em>
            </span>`;

        list.append(link);
    });

    container.append(header, list);

}


function renderOtherScreenings(container, functions, roomsById, availabilityByFunction, movie) {

    container.replaceChildren();

    if (!functions.length) {
        return;
    }

    const title =
        document.createElement("h3");

    title.textContent =
        "Other Screenings";

    const list =
        document.createElement("div");

    list.className =
        "ticket-list";

    functions.slice(0, 5).forEach((movieFunction) => {
        const room =
            roomsById.get(Number(movieFunction.roomId));

        const parts =
            formatDateParts(movieFunction.date);

        const ticket =
            document.createElement("a");

        ticket.className =
            "screening-ticket";

        ticket.href =
            `./booking.html?functionId=${movieFunction.id}`;

        ticket.style.setProperty(
            "--ticket-backdrop",
            `url("${getImageUrl(movie.backdrop_path, "w780")}")`
        );

        ticket.style.setProperty(
            "--ticket-poster",
            `url("${getImageUrl(movie.poster_path || movie.backdrop_path, "w500")}")`
        );

        ticket.innerHTML =
            `<span class="screening-ticket__image" aria-hidden="true"></span>
            <span class="screening-ticket__main">
                <strong>${movie.title}</strong>
                <small>${getRoomLabel(room)}</small>
                <small>${availabilityByFunction.get(movieFunction.id) || 0} seats available</small>
            </span>
            <span class="screening-ticket__stub">
                <small>${parts.month}</small>
                <strong>${parts.day}</strong>
                <small>${movieFunction.time}</small>
            </span>`;

        list.append(ticket);
    });

    container.append(title, list);

}


async function loadMovieFunctions(movie, target) {

    try {
        const tmdbId =
            Number(movie.id);

        target.section.style.setProperty(
            "--screening-backdrop",
            `url("${getImageUrl(movie.backdrop_path || movie.poster_path, "w1280")}")`
        );

        const rooms =
            await getRooms();

        target.meta.textContent =
            "FILM / 0426";

        if (!rooms.length) {
            target.body.innerHTML =
                '<p class="section__state">NO SCREENINGS AVAILABLE</p>';
            return;
        }

        const roomsById =
            new Map(rooms.map((room) => {
                return [Number(room.id), room];
            }));

        const today =
            toDateValue(new Date());

        let selectedDate =
            today;

        let selectedFunctionId =
            null;

        let selectedMonth =
            createLocalDate(selectedDate);

        const location =
            document.createElement("div");

        location.className =
            "screenings__location";

        const monthSelector =
            document.createElement("div");

        monthSelector.className =
            "screening-month";

        const dates =
            document.createElement("div");

        dates.className =
            "screening-dates";

        const times =
            document.createElement("div");

        times.className =
            "screening-time-board";

        const summary =
            document.createElement("div");

        summary.className =
            "screening-summary";

        const functionLayout =
            document.createElement("div");

        functionLayout.className =
            "screening-function-layout";

        functionLayout.append(summary, target.other);

        let functions =
            [];

        let availabilityByFunction =
            new Map();

        const updateSummary =
            () => {
                const selectedFunction =
                    functions.find((movieFunction) => {
                        return Number(movieFunction.id) === Number(selectedFunctionId);
                    });

                if (!selectedFunction) {
                    summary.innerHTML =
                        '<p class="section__state">NO SCREENINGS AVAILABLE</p>';
                    return;
                }

                const room =
                    roomsById.get(Number(selectedFunction.roomId));

                summary.innerHTML =
                    `<div class="screening-summary__details">
                        <span>Selected Function</span>
                        <strong>${formatDateParts(selectedFunction.date).full} / ${selectedFunction.time}</strong>
                        <div class="screening-summary__meta">
                            <small>${getRoomLabel(room)}</small>
                            <small>${formatCurrency(selectedFunction.price)}</small>
                            <small>${availabilityByFunction.get(selectedFunction.id) || 0} seats available</small>
                        </div>
                    </div>
                    <a class="button button--primary" href="./booking.html?functionId=${selectedFunction.id}">
                        Select Seats
                    </a>`;
            };

        const updateBoard =
            () => {
                if (!functions.some((movieFunction) => {
                    return Number(movieFunction.id) === Number(selectedFunctionId);
                })) {
                    selectedFunctionId =
                        functions[0]?.id || null;
                }

                renderFunctionTimes(
                    times,
                    functions,
                    roomsById,
                    availabilityByFunction,
                    selectedFunctionId,
                    (functionId) => {
                        selectedFunctionId =
                            functionId;

                        updateBoard();
                    }
                );

                updateSummary();

                renderOtherScreenings(
                    target.other,
                    functions.filter((movieFunction) => {
                        return Number(movieFunction.id) !== Number(selectedFunctionId);
                    }),
                    roomsById,
                    availabilityByFunction,
                    movie
                );
            };

        const reloadForSelectedDate =
            async () => {
                target.meta.textContent =
                    "Loading cinema data";

                summary.innerHTML =
                    '<p class="section__state">Loading screenings...</p>';

                try {
                    functions =
                        await ensureFunctionsForDate(tmdbId, selectedDate);

                    availabilityByFunction =
                        await getAvailabilityByFunction(functions);

                    selectedFunctionId =
                        functions[0]?.id || null;

                    if (!functions.length) {
                        target.meta.textContent =
                            "FILM / 0426";

                        summary.innerHTML =
                            '<p class="section__state">NO SCREENINGS AVAILABLE</p>';
                        return;
                    }

                    updateBoard();
                    loadWeeklyReleases(selectedDate, target.weekly);

                    target.meta.textContent =
                        "FILM / 0426";
                } catch (error) {
                    console.error("Screenings unavailable.", error);
                    target.meta.textContent =
                        "Cinema data unavailable";

                    times.replaceChildren();
                    target.other.replaceChildren();
                    summary.innerHTML =
                        '<p class="section__state">CINEMA DATA UNAVAILABLE</p>';
                }
            };

        const renderDateInterface =
            () => {
                renderMonthSelector(monthSelector, selectedMonth, (direction) => {
                    selectedMonth =
                        new Date(
                            selectedMonth.getFullYear(),
                            selectedMonth.getMonth() + direction,
                            1,
                            12
                        );

                    selectedDate =
                        toDateValue(selectedMonth);

                    renderDateInterface();
                    reloadForSelectedDate();
                });

                renderDateTickets(
                    dates,
                    getDaysInMonth(selectedMonth),
                    selectedDate,
                    handleDateSelect
                );
            };

        const handleDateSelect =
            (date) => {
                selectedDate =
                    date;

                selectedMonth =
                    createLocalDate(date);

                renderDateInterface();
                reloadForSelectedDate();
            };

        renderDateInterface();

        location.innerHTML =
            `<div>
                <span>Location</span>
                <strong>NOIR Cinema / Central</strong>
            </div>
            <div>
                <span>Screen</span>
                <strong>${rooms.map(getRoomLabel).join(" / ")}</strong>
            </div>`;

        target.body.replaceChildren(location, monthSelector, dates, times, functionLayout);
        await reloadForSelectedDate();

    } catch (error) {
        console.error("Screenings unavailable.", error);
        target.meta.textContent =
            "Cinema data unavailable";

        target.body.innerHTML =
            '<p class="section__state">CINEMA DATA UNAVAILABLE</p>';
    }

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
        createRatingControl(movie.id, "movie");

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

    const screeningsSection =
        createScreeningsSection();

    const paletteTarget =
        container;

    container.append(
        hero,
        screeningsSection.section,
        castSection.section,
        mediaSection.section,
        keywordsSection.section,
        similarSection.section,
        recommendationsSection.section
    );

    document.title =
        `NOIR - ${movie.title}`;

    bindFavoriteButton(saveButton, movie, "movie");
    loadMovieFunctions(movie, screeningsSection);
    extractMoviePalette(movie).then((palette) => {
        applyMoviePalette(paletteTarget, palette);
        applyMoviePalette(screeningsSection.section, palette);
    });

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

initializeUserNavigation();
bindTrailerModalControls();
initializeMovieDetail();

