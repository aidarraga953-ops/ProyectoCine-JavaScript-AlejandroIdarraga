const GRAIN_FPS =
    12;

const REDUCED_MOTION_FPS =
    1;

const MAX_GRAIN_WIDTH =
    420;

const MIN_GRAIN_WIDTH =
    300;


let canvas =
    null;

let ctx =
    null;

let grainTimer =
    null;

let reducedMotionQuery =
    null;

let resizeFrame =
    null;


function getTargetWidth() {

    return Math.round(
        Math.min(
            MAX_GRAIN_WIDTH,
            Math.max(MIN_GRAIN_WIDTH, window.innerWidth * 0.24)
        )
    );

}


export function resizeGrainCanvas() {

    if (!canvas || !ctx) {
        return;
    }

    /*
     * Canvas es una superficie de dibujo. Aqui lo renderizamos a menor
     * resolucion para no calcular millones de pixeles en cada cambio de grano.
     */
    const width =
        getTargetWidth();

    const height =
        Math.max(1, Math.round(width * (window.innerHeight / window.innerWidth)));

    canvas.width =
        width;

    canvas.height =
        height;

    ctx.imageSmoothingEnabled =
        false;

    drawFilmGrain();

}


export function drawFilmGrain() {

    if (!canvas || !ctx) {
        return;
    }

    /*
     * ctx es el contexto 2D: el "lapiz" con el que Canvas dibuja.
     * ImageData contiene los pixeles crudos en grupos RGBA.
     */
    const imageData =
        ctx.createImageData(canvas.width, canvas.height);

    const pixels =
        imageData.data;

    for (let index = 0; index < pixels.length; index += 4) {
        const shade =
            Math.floor(Math.random() * 256);

        const alpha =
            Math.floor(Math.random() * 26);

        pixels[index] =
            shade;

        pixels[index + 1] =
            shade;

        pixels[index + 2] =
            shade;

        pixels[index + 3] =
            alpha;
    }

    // putImageData copia esos pixeles al Canvas en una sola operacion.
    ctx.putImageData(imageData, 0, 0);

}


export function stopFilmGrain() {

    if (grainTimer) {
        window.clearInterval(grainTimer);
        grainTimer =
            null;
    }

}


export function startFilmGrain() {

    if (!canvas || !ctx) {
        return;
    }

    stopFilmGrain();

    /*
     * El grano de pelicula no necesita 60 FPS: 8-15 actualizaciones por
     * segundo dan vibracion sin convertirlo en estatica digital.
     */
    const prefersReducedMotion =
        reducedMotionQuery?.matches;

    const fps =
        prefersReducedMotion
            ? REDUCED_MOTION_FPS
            : GRAIN_FPS;

    drawFilmGrain();

    if (prefersReducedMotion) {
        return;
    }

    grainTimer =
        window.setInterval(drawFilmGrain, Math.round(1000 / fps));

}


function handleResize() {

    if (resizeFrame) {
        return;
    }

    resizeFrame =
        window.requestAnimationFrame(() => {
            resizeFrame =
                null;

            resizeGrainCanvas();
        });

}


export function initializeFilmGrain() {

    canvas =
        document.querySelector("[data-film-grain]");

    if (!canvas || !canvas.getContext) {
        return;
    }

    ctx =
        canvas.getContext("2d");

    if (!ctx) {
        return;
    }

    reducedMotionQuery =
        window.matchMedia("(prefers-reduced-motion: reduce)");

    resizeGrainCanvas();
    startFilmGrain();

    window.addEventListener("resize", handleResize, {
        passive: true
    });

    reducedMotionQuery.addEventListener("change", startFilmGrain);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stopFilmGrain();
            return;
        }

        startFilmGrain();
    });

}
