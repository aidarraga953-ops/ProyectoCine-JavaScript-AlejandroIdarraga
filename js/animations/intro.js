/**
 * Oculta la introducción cinematográfica
 * después de que termina la animación.
 */
export function initializeIntro() {

    const intro =
        document.querySelector("#intro");


    if (!intro) {
        return;
    }


    setTimeout(() => {

        intro.classList.add(
            "intro--hidden"
        );

    }, 2800);

}