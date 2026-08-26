import {
    getFavorite,
    getRating,
    saveRating,
    toggleFavorite
} from "../api/noir-data.js";

import {
    getCurrentUser
} from "../api/noir-auth.js";


function renderFavoriteState(button, isSaved) {

    button.classList.toggle("is-saved", isSaved);
    button.innerHTML =
        isSaved
            ? '<span aria-hidden="true">♥</span> SAVED'
            : '<span aria-hidden="true">♡</span> SAVE TO NOIR';

}


export async function bindFavoriteButton(button, item, mediaType = "movie") {

    const favorite =
        await getFavorite(item.id, mediaType);

    renderFavoriteState(button, Boolean(favorite));

    button.addEventListener("click", async () => {
        if (!getCurrentUser()) {
            button.textContent =
                "SIGN IN TO SAVE FILMS";

            window.setTimeout(() => {
                renderFavoriteState(button, false);
            }, 1800);
            return;
        }

        button.disabled =
            true;

        try {
            const saved =
                await toggleFavorite(item, mediaType);

            renderFavoriteState(button, saved);
        } catch (error) {
            console.error("Favorite unavailable.", error);
            button.textContent =
                "JSON Server unavailable";
        } finally {
            button.disabled =
                false;
        }
    });

}


function renderRating(container, value = 0) {

    container
        .querySelectorAll("[data-rating-value]")
        .forEach((button) => {
            const ratingValue =
                Number(button.dataset.ratingValue);

            button.textContent =
                ratingValue <= value
                    ? "★"
                    : "☆";

            button.classList.toggle("is-active", ratingValue <= value);
        });

}


async function bindRating(container, tmdbId, mediaType) {

    const storedRating =
        await getRating(tmdbId, mediaType);

    let activeRating =
        storedRating?.rating || 0;

    renderRating(container, activeRating);

    container
        .querySelectorAll("[data-rating-value]")
        .forEach((button) => {
            button.addEventListener("click", async () => {
                if (!getCurrentUser()) {
                    const label =
                        container.querySelector(".noir-rating__label");

                    if (label) {
                        label.textContent =
                            "SIGN IN TO RATE";

                        window.setTimeout(() => {
                            label.textContent =
                                "YOUR RATING";
                        }, 1800);
                    }

                    return;
                }

                activeRating =
                    Number(button.dataset.ratingValue);

                renderRating(container, activeRating);

                try {
                    await saveRating(tmdbId, mediaType, activeRating);
                } catch (error) {
                    console.error("Rating unavailable.", error);
                }
            });
        });

}


export function createRatingControl(tmdbId, mediaType = "movie") {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "noir-rating";

    const label =
        document.createElement("span");

    label.className =
        "noir-rating__label";

    label.textContent =
        "YOUR RATING";

    const stars =
        document.createElement("div");

    stars.className =
        "noir-rating__stars";

    [1, 2, 3, 4, 5].forEach((value) => {
        const button =
            document.createElement("button");

        button.type =
            "button";

        button.dataset.ratingValue =
            value;

        button.setAttribute("aria-label", `Rate ${value} of 5`);
        button.textContent =
            "☆";

        stars.append(button);
    });

    wrapper.append(label, stars);
    bindRating(wrapper, tmdbId, mediaType);

    return wrapper;

}
