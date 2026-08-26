import {
    FALLBACK_IMAGE,
    getImageUrl
} from "../api/tmdb.js";


export function createCastCard(person) {

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

    // profile_path es el retrato de una persona en TMDB; si falta, usamos el fallback compartido.
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
