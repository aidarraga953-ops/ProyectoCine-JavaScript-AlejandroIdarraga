import {
    getImageUrl
} from "../api/tmdb.js";


const FALLBACK_PALETTE =
    {
        primary: "#8a7a68",
        secondary: "#35302b"
    };


const paletteCache =
    new Map();


function rgbToHex(red, green, blue) {

    return `#${[red, green, blue].map((value) => {
        return value.toString(16).padStart(2, "0");
    }).join("")}`;

}


function hexToRgb(hex) {

    const value =
        hex.replace("#", "");

    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16)
    ];

}


function isUsefulColor(red, green, blue) {

    const brightness =
        (red + green + blue) / 3;

    const saturation =
        Math.max(red, green, blue) - Math.min(red, green, blue);

    return brightness > 34 &&
        brightness < 226 &&
        saturation > 22;

}


function averageColor(samples) {

    if (!samples.length) {
        return FALLBACK_PALETTE.primary;
    }

    const totals =
        samples.reduce((sum, color) => {
            return {
                red: sum.red + color.red,
                green: sum.green + color.green,
                blue: sum.blue + color.blue
            };
        }, {
            red: 0,
            green: 0,
            blue: 0
        });

    return rgbToHex(
        Math.round(totals.red / samples.length),
        Math.round(totals.green / samples.length),
        Math.round(totals.blue / samples.length)
    );

}


function createPaletteFromPixels(imageData) {

    const warmSamples =
        [];

    const coolSamples =
        [];

    const allSamples =
        [];

    // getImageData entrega los pixeles RGBA del canvas. Ignoramos negros, blancos y grises planos
    // para quedarnos con luz de la pelicula, no con fondos neutros.
    for (let index = 0; index < imageData.data.length; index += 16) {
        const red =
            imageData.data[index];

        const green =
            imageData.data[index + 1];

        const blue =
            imageData.data[index + 2];

        if (!isUsefulColor(red, green, blue)) {
            continue;
        }

        const sample =
            {
                red,
                green,
                blue
            };

        allSamples.push(sample);

        if (red >= blue) {
            warmSamples.push(sample);
        } else {
            coolSamples.push(sample);
        }
    }

    return {
        primary: averageColor(allSamples.slice(0, 360)),
        secondary: averageColor((coolSamples.length ? coolSamples : warmSamples).slice(0, 240))
    };

}


function loadImage(src) {

    return new Promise((resolve, reject) => {
        const image =
            new Image();

        image.crossOrigin =
            "anonymous";

        image.onload =
            () => resolve(image);

        image.onerror =
            reject;

        image.src =
            src;
    });

}


export async function extractMoviePalette(movie) {

    const cacheKey =
        movie?.id || movie?.tmdbId || movie?.backdrop_path || movie?.poster_path;

    if (paletteCache.has(cacheKey)) {
        return paletteCache.get(cacheKey);
    }

    try {
        const image =
            await loadImage(getImageUrl(movie.backdrop_path || movie.poster_path, "w342"));

        const canvas =
            document.createElement("canvas");

        canvas.width =
            48;

        canvas.height =
            32;

        const context =
            canvas.getContext("2d", {
                willReadFrequently: true
            });

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const palette =
            createPaletteFromPixels(
                context.getImageData(0, 0, canvas.width, canvas.height)
            );

        paletteCache.set(cacheKey, palette);

        return palette;
    } catch (error) {
        console.warn("Movie palette unavailable; using NOIR fallback colors.", error);
        paletteCache.set(cacheKey, FALLBACK_PALETTE);

        return FALLBACK_PALETTE;
    }

}


export function applyMoviePalette(element, palette) {

    if (!element || !palette) {
        return;
    }

    const primaryRgb =
        hexToRgb(palette.primary).join(", ");

    const secondaryRgb =
        hexToRgb(palette.secondary).join(", ");

    // Las custom properties viven en el contenedor de la vista, no en :root,
    // para que una pelicula no contamine visualmente a otra.
    element.style.setProperty("--movie-color-primary", palette.primary);
    element.style.setProperty("--movie-color-secondary", palette.secondary);
    element.style.setProperty("--movie-color-primary-rgb", primaryRgb);
    element.style.setProperty("--movie-color-secondary-rgb", secondaryRgb);

}
