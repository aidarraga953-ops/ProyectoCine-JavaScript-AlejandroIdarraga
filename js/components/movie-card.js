import {
    getImageUrl
} from "../api/tmdb.js";


function getYear(date) {

    if (!date) {
        return "TBA";
    }

    return date.slice(0, 4);

}


export function getMediaTitle(item) {

    return item.title || item.name || "Untitled";

}


export function getMediaDate(item) {

    return item.release_date || item.first_air_date || "";

}


function getScore(score) {

    if (typeof score !== "number") {
        return "-";
    }

    return score.toFixed(1);

}


function getMediaHref(item, mediaType = "movie") {

    const type =
        mediaType || item.media_type || "movie";

    const prefix =
        window.location.pathname.includes("/pages/")
            ? "."
            : "./pages";

    if (type === "tv") {
        return `${prefix}/tv-details.html?id=${item.id}`;
    }

    if (type === "person") {
        return `${prefix}/person.html?id=${item.id}`;
    }

    return `${prefix}/movie.html?id=${item.id}`;

}


function renderMediaCardContent(container, item, mediaType = "movie") {

    container.replaceChildren();

    if (!item) {
        return;
    }

    const imageLink =
        document.createElement("a");

    imageLink.className =
        "movie-card__image-link";

    imageLink.href =
        getMediaHref(item, mediaType);

    const image =
        document.createElement("img");

    image.className =
        "movie-card__image";

    image.src =
        getImageUrl(item.poster_path, "w342");

    image.alt =
        getMediaTitle(item);

    image.loading =
        "lazy";

    const rating =
        document.createElement("span");

    rating.className =
        "movie-card__rating";

    rating.textContent =
        getScore(item.vote_average);

    imageLink.append(image, rating);

    const info =
        document.createElement("div");

    info.className =
        "movie-card__info";

    const title =
        document.createElement("h3");

    title.className =
        "movie-card__title";

    title.textContent =
        getMediaTitle(item);

    const year =
        document.createElement("span");

    year.className =
        "movie-card__year";

    year.textContent =
        getYear(getMediaDate(item));

    info.append(title, year);

    container.append(imageLink, info);

}


export class MovieCardElement extends HTMLElement {

    constructor() {

        super();

        this._media =
            null;

        this._mediaType =
            "movie";

    }


    connectedCallback() {

        this.classList.add("movie-card");

        if (!this.hasAttribute("role")) {
            this.setAttribute("role", "article");
        }

        if (this._media && !this.hasChildNodes()) {
            this.render();
        }

    }


    set media(value) {

        this._media =
            value;

        this.render();

    }


    get media() {

        return this._media;

    }


    set movie(value) {

        this._mediaType =
            "movie";

        this.media =
            value;

    }


    get movie() {

        return this._media;

    }


    set mediaType(value) {

        this._mediaType =
            value || "movie";

        this.render();

    }


    get mediaType() {

        return this._mediaType;

    }


    render() {

        this.classList.add("movie-card");
        renderMediaCardContent(this, this._media, this._mediaType);

    }

}


if (!customElements.get("movie-card")) {
    customElements.define("movie-card", MovieCardElement);
}


/**
 * Crea una tarjeta compatible con el diseno existente para peliculas o TV.
 */
export function createMediaCard(item, mediaType = "movie") {

    const card =
        document.createElement("movie-card");

    card.mediaType =
        mediaType;

    card.media =
        item;

    return card;

}


export function createMovieCard(movie) {

    return createMediaCard(movie, "movie");

}


export function formatMovieYear(date) {

    return getYear(date);

}


export function formatMovieScore(score) {

    return getScore(score);

}
