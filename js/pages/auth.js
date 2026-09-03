import {
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";

import {
    AUTH_ERROR_CODES,
    loginUser,
    registerUser,
    saveCurrentUser
} from "../api/noir-auth.js";

import {
    initializeFilmGrain
} from "../effects/film-grain.js";


const EMAIL_PATTERN =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSAGE_MESSAGES =
    [
        "TAKE YOUR SEAT.",
        "ENTER NOIR.",
        "THE FILM IS ABOUT TO BEGIN.",
        "FOLLOW THE LIGHT.",
        "THE SCREEN IS WAITING."
    ];


function getElement(selector) {

    return document.querySelector(selector);

}


function getAuthMode() {

    return document.body.dataset.authMode || "login";

}


function getHomeHref() {

    return window.location.pathname.includes("/pages/")
        ? "../index.html"
        : "./index.html";

}


function getRedirectHref() {

    const redirect =
        new URLSearchParams(window.location.search).get("redirect");

    if (!redirect) {
        return getHomeHref();
    }

    try {
        const url =
            new URL(redirect, window.location.origin);

        if (url.origin !== window.location.origin) {
            return getHomeHref();
        }

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return getHomeHref();
    }

}


async function loadEditorialMovies() {

    const frames =
        document.querySelectorAll("[data-editorial-frame]");

    if (!frames.length) {
        return;
    }

    try {
        // TMDB funciona aqui como ventana editorial: solo usamos pocos backdrops horizontales.
        const data =
            await requestCachedTMDB("/discover/movie", {
                language: "en-US",
                sort_by: "popularity.desc",
                with_genres: "18,53,80",
                "vote_count.gte": 250
            });

        const movies =
            (data.results || [])
                .filter((movie) => movie.backdrop_path)
                .slice(0, frames.length);

        frames.forEach((frame, index) => {
            const movie =
                movies[index];

            if (!movie) {
                return;
            }

            const image =
                frame.querySelector("img");

            const caption =
                frame.querySelector("[data-frame-caption]");

            if (image) {
                image.src =
                    getImageUrl(movie.backdrop_path, "w780");

                image.alt =
                    movie.title || "";
            }

            if (caption) {
                caption.textContent =
                    `${movie.title} / ${(movie.release_date || "").slice(0, 4) || "NOIR"}`;
            }
        });
    } catch (error) {
        console.error("Editorial frames unavailable.", error);
    }

}


function observeEditorialVideos() {

    const videos =
        document.querySelectorAll(".archive-cell video");

    if (!videos.length) {
        return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        videos.forEach((video) => {
            video.pause();
        });
        return;
    }

    // IntersectionObserver detecta cuando cada video entra o sale del viewport para reproducirlo o pausarlo.
    const observer =
        new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const video =
                    entry.target;

                if (entry.isIntersecting) {
                    video.play().catch(() => {});
                    return;
                }

                video.pause();
            });
        }, {
            threshold: 0.35
        });

    videos.forEach((video) => {
        observer.observe(video);
    });

}


function initializePassageMessage() {

    if (getAuthMode() !== "login") {
        return;
    }

    const message =
        getElement("[data-passage-message]");

    if (!message) {
        return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        message.textContent =
            PASSAGE_MESSAGES[0];
        return;
    }

    let messageIndex =
        0;

    window.setInterval(() => {
        message.classList.add("is-fading");

        window.setTimeout(() => {
            messageIndex =
                (messageIndex + 1) % PASSAGE_MESSAGES.length;

            message.textContent =
                PASSAGE_MESSAGES[messageIndex];

            message.classList.remove("is-fading");
        }, 900);
    }, 5200);

}


function clearErrors(form) {

    form
        .querySelectorAll("[data-error-for]")
        .forEach((error) => {
            error.textContent =
                "";
        });

}


function setFieldError(form, fieldName, message) {

    const error =
        form.querySelector(`[data-error-for="${fieldName}"]`);

    if (error) {
        error.textContent =
            message;
    }

}


function validateForm(form, mode) {

    const formData =
        new FormData(form);

    const values =
        {
            name: String(formData.get("fullName") || "").trim(),
            email: String(formData.get("email") || "").trim().toLowerCase(),
            password: String(formData.get("password") || "")
        };

    const errors =
        {};

    if (mode === "register" && !values.name) {
        errors.fullName =
            "Full name is required.";
    }

    if (!values.email) {
        errors.email =
            "Email is required.";
    } else if (!EMAIL_PATTERN.test(values.email)) {
        errors.email =
            "Enter a valid email.";
    }

    if (!values.password) {
        errors.password =
            "Password is required.";
    }

    return {
        values,
        errors,
        isValid: !Object.keys(errors).length
    };

}


function renderErrors(form, errors) {

    clearErrors(form);

    Object.entries(errors).forEach(([field, message]) => {
        setFieldError(form, field, message);
    });

}


function setFormState(message) {

    const state =
        getElement("#authState");

    if (state) {
        state.textContent =
            message;
    }

}


function getAuthErrorMessage(error, mode) {

    if (error.code === AUTH_ERROR_CODES.DUPLICATE_EMAIL) {
        return "This email already has access.";
    }

    if (error.code === AUTH_ERROR_CODES.INVALID_CREDENTIALS) {
        return "Email or password is incorrect.";
    }

    if (
        error.code === AUTH_ERROR_CODES.DATABASE_UNAVAILABLE ||
        error.code === AUTH_ERROR_CODES.INVALID_USERS_RESPONSE
    ) {
        return "Unable to connect to NOIR database.";
    }

    return mode === "register"
        ? "Access could not be created."
        : "Access could not be verified.";

}


async function handleAuthSubmit(event) {

    event.preventDefault();

    const form =
        event.currentTarget;

    const mode =
        getAuthMode();

    const result =
        validateForm(form, mode);

    renderErrors(form, result.errors);

    if (!result.isValid) {
        setFormState("");
        return;
    }

    const button =
        form.querySelector("button[type='submit']");

    if (button) {
        button.disabled =
            true;
    }

    try {
        if (mode === "register") {
            // El usuario se guarda en JSON Server dentro de users; no se crea backend extra.
            const user =
                await registerUser(result.values);

            saveCurrentUser(user);
            setFormState("Access created. Entering NOIR.");
            window.location.href =
                getRedirectHref();
            return;
        }

        await loginUser(result.values);
        setFormState("Access granted.");
        window.location.href =
            getRedirectHref();
    } catch (error) {
        console.error("Authentication unavailable.", error);
        setFormState(getAuthErrorMessage(error, mode));
    } finally {
        if (button) {
            button.disabled =
                false;
        }
    }

}


function initializeAuthForm() {

    const form =
        getElement("#authForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", handleAuthSubmit);

}


loadEditorialMovies();
observeEditorialVideos();
initializePassageMessage();
initializeFilmGrain();
initializeAuthForm();
