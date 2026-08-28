const REVEAL_SELECTOR =
    [
        ".section__header",
        ".movies-grid",
        ".movies-grid--rail",
        ".popular-item",
        ".upcoming-card",
        ".trailer-carousel",
        ".member-archive-grid",
        ".member-archive-card",
        ".member-archive-empty"
    ].join(",");

let observer =
    null;

let mutationObserver =
    null;


function prefersReducedMotion() {

    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;

}


function prepareElement(element) {

    if (element.dataset.revealReady === "true") {
        return;
    }

    element.dataset.revealReady =
        "true";

    element.classList.add("reveal-on-scroll");

    if (element.classList.contains("popular-item") ||
        element.classList.contains("member-archive-card")) {
        const siblings =
            [...element.parentElement.children].filter((child) => {
                return child.matches(".popular-item, .member-archive-card");
            });

        const index =
            siblings.indexOf(element);

        element.style.setProperty(
            "--reveal-delay",
            `${Math.min(index, 8) * 55}ms`
        );
    }

    observer?.observe(element);

}


function prepareScope(scope = document) {

    scope.querySelectorAll(REVEAL_SELECTOR).forEach(prepareElement);

}


export function initializeScrollReveals() {

    if (prefersReducedMotion()) {
        document.documentElement.classList.add("reduced-motion");
        return;
    }

    if (!("IntersectionObserver" in window)) {
        document.documentElement.classList.add("reduced-motion");
        return;
    }

    if (!observer) {
        observer =
            new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                });
            }, {
                rootMargin: "0px 0px -12% 0px",
                threshold: 0.12
            });
    }

    prepareScope();

    if (!mutationObserver) {
        mutationObserver =
            new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (!(node instanceof HTMLElement)) {
                            return;
                        }

                        if (node.matches(REVEAL_SELECTOR)) {
                            prepareElement(node);
                        }

                        prepareScope(node);
                    });
                });
            });

        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

}
