import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";

import {
    createMovieCard
} from "../components/movie-card.js";


function getElement(selector) {

    return document.querySelector(selector);

}


function getPersonId() {

    return new URLSearchParams(window.location.search).get("id");

}


function getKnownFor(credits) {

    return (credits.cast || [])
        .filter((movie) => movie.poster_path)
        .sort((first, second) => second.popularity - first.popularity)
        .slice(0, 8);

}


function getFilmography(credits, knownForMovies = []) {

    const knownForIds =
        new Set(
            knownForMovies.map((movie) => movie.id)
        );

    return (credits.cast || [])
        .filter((movie) => !knownForIds.has(movie.id))
        .filter((movie) => movie.release_date)
        .sort((first, second) => {
            return second.release_date.localeCompare(first.release_date);
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


function renderKnownFor(container, movies) {

    container.classList.add("movies-grid", "movies-grid--rail");

    if (!movies.length) {
        container.textContent =
            "No known-for titles available.";
        return;
    }

    movies.forEach((movie) => {
        container.append(createMovieCard(movie));
    });

}


function renderFilmography(container, movies) {

    if (!movies.length) {
        container.textContent =
            "No filmography available.";
        return;
    }

    movies.forEach((movie) => {
        const link =
            document.createElement("a");

        link.className =
            "filmography-item";

        link.href =
            `./movie.html?id=${movie.id}`;

        const year =
            document.createElement("span");

        year.className =
            "filmography-item__year";

        year.textContent =
            movie.release_date.slice(0, 4);

        const poster =
            document.createElement("img");

        poster.className =
            "filmography-item__poster";

        // Los créditos de persona incluyen poster_path; aquí se usa como miniatura, no como imagen gigante.
        poster.src =
            movie.poster_path
                ? getImageUrl(movie.poster_path, "w92")
                : FALLBACK_IMAGE;

        poster.alt =
            movie.title || "Untitled";

        const title =
            document.createElement("span");

        title.className =
            "filmography-item__title";

        title.textContent =
            movie.title || "Untitled";

        const meta =
            document.createElement("span");

        meta.className =
            "filmography-item__character";

        meta.textContent =
            movie.character || "Cast";

        link.append(year, poster, title, meta);
        container.append(link);
    });

}


function createFact(labelText, valueText) {

    const item =
        document.createElement("div");

    item.className =
        "person-fact";

    const label =
        document.createElement("span");

    label.textContent =
        labelText;

    const value =
        document.createElement("strong");

    value.textContent =
        valueText || "TBA";

    item.append(label, value);

    return item;

}


function bindBiographyToggle(button, biography) {

    button.addEventListener("click", () => {
        const isExpanded =
            biography.classList.toggle("is-expanded");

        // El texto de TMDB no cambia: solo alternamos el clamp visual.
        button.textContent =
            isExpanded
                ? "SHOW LESS ↑"
                : "READ MORE ↓";
    });

}


function renderPerson(person, credits) {

    const container =
        getElement("#personDetail");

    container.replaceChildren();

    const hero =
        document.createElement("section");

    hero.className =
        "person-hero";

    const portrait =
        document.createElement("img");

    portrait.className =
        "person-hero__image";

    portrait.src =
        person.profile_path
            ? getImageUrl(person.profile_path, "h632")
            : FALLBACK_IMAGE;

    portrait.alt =
        person.name;

    const content =
        document.createElement("div");

    content.className =
        "person-hero__content";

    const eyebrow =
        document.createElement("span");

    eyebrow.className =
        "section__eyebrow";

    eyebrow.textContent =
        "NOIR / PEOPLE";

    const title =
        document.createElement("h1");

    title.textContent =
        person.name;

    const role =
        document.createElement("p");

    role.className =
        "person-role";

    role.textContent =
        person.known_for_department || "Performer";

    const facts =
        document.createElement("div");

    facts.className =
        "person-facts";

    facts.append(
        createFact("Born", person.birthday),
        createFact("Place", person.place_of_birth)
    );

    const biographyLabel =
        document.createElement("span");

    biographyLabel.className =
        "person-biography__label";

    biographyLabel.textContent =
        "Biography";

    const bio =
        document.createElement("p");

    bio.className =
        "person-biography";

    bio.textContent =
        person.biography || "No biography available.";

    const biographyButton =
        document.createElement("button");

    biographyButton.className =
        "biography-toggle";

    biographyButton.type =
        "button";

    biographyButton.textContent =
        "READ MORE ↓";

    bindBiographyToggle(biographyButton, bio);

    content.append(
        eyebrow,
        title,
        role,
        facts,
        biographyLabel,
        bio,
        biographyButton
    );
    hero.append(portrait, content);

    const knownForMovies =
        getKnownFor(credits);

    const knownForSection =
        createSection("Known For");

    renderKnownFor(knownForSection.body, knownForMovies);

    const filmographySection =
        createSection("Filmography");

    filmographySection.body.classList.add("filmography-list");

    renderFilmography(
        filmographySection.body,
        getFilmography(credits, knownForMovies)
    );

    container.append(
        hero,
        knownForSection.section,
        filmographySection.section
    );

    document.title =
        `NOIR - ${person.name}`;

}


async function initializePersonDetail() {

    const personId =
        getPersonId();

    const container =
        getElement("#personDetail");

    if (!personId) {
        container.textContent =
            "Missing person id.";
        return;
    }

    try {
        const [
            person,
            credits
        ] =
            await Promise.all([
                requestCachedTMDB(`/person/${personId}`, { language: "en-US" }),
                requestCachedTMDB(`/person/${personId}/movie_credits`, { language: "en-US" })
            ]);

        renderPerson(person, credits);
    } catch (error) {
        console.error("Person detail unavailable.", error);
        container.innerHTML =
            '<p class="section__state">Person detail is unavailable.</p>';
    }

}


initializePersonDetail();
