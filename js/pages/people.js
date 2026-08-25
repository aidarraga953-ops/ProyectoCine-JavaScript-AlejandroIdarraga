import {
    FALLBACK_IMAGE,
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";


function getElement(selector) {

    return document.querySelector(selector);

}


function renderPeople(people) {

    const grid =
        getElement("#peopleGrid");

    if (!grid) {
        return;
    }

    grid.replaceChildren();

    people.forEach((person) => {
        const link =
            document.createElement("a");

        link.className =
            "person-card";

        link.href =
            `./person.html?id=${person.id}`;

        const image =
            document.createElement("img");

        image.src =
            person.profile_path
                ? getImageUrl(person.profile_path, "h632")
                : FALLBACK_IMAGE;

        image.alt =
            person.name;

        const title =
            document.createElement("h2");

        title.textContent =
            person.name;

        const meta =
            document.createElement("p");

        meta.textContent =
            person.known_for
                ?.map((item) => item.title || item.name)
                .filter(Boolean)
                .slice(0, 2)
                .join(" / ") || "Known for film";

        link.append(image, title, meta);
        grid.append(link);
    });

}


async function initializePeople() {

    try {
        const data =
            await requestCachedTMDB("/person/popular", {
                language: "en-US",
                page: 1
            });

        renderPeople(data.results || []);
    } catch (error) {
        console.error("People unavailable.", error);

        const grid =
            getElement("#peopleGrid");

        if (grid) {
            grid.innerHTML =
                '<p class="section__state">People are unavailable.</p>';
        }
    }

}


initializePeople();
