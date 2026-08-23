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

    if (type === "tv") {
        return `./pages/tv-details.html?id=${item.id}`;
    }

    return `./pages/movie.html?id=${item.id}`;

}


/**
 * Crea una tarjeta compatible con el diseno existente para peliculas o TV.
 */
export function createMediaCard(item, mediaType = "movie") {

    const article =
        document.createElement("article");

    article.className =
        "movie-card";

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

    article.append(imageLink, info);

    return article;

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
