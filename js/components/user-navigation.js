import {
    getCurrentUser,
    logoutUser
} from "../api/noir-auth.js";


function getAccessHref() {

    return window.location.pathname.includes("/pages/")
        ? "./login.html"
        : "./pages/login.html";

}


function getPageHref(pageName) {

    return window.location.pathname.includes("/pages/")
        ? `./${pageName}`
        : `./pages/${pageName}`;

}


function createAccessLink() {

    const link =
        document.createElement("a");

    link.className =
        "header__access";

    link.href =
        getAccessHref();

    link.textContent =
        "ACCESS ->";

    return link;

}


function createUserMenu(user) {

    const wrapper =
        document.createElement("div");

    wrapper.className =
        "user-nav";

    const button =
        document.createElement("button");

    button.className =
        "user-nav__button";

    button.type =
        "button";

    button.textContent =
        (user.name || user.email || "N").charAt(0).toUpperCase();

    const menu =
        document.createElement("div");

    menu.className =
        "user-nav__menu";

    menu.hidden =
        true;

    const eyebrow =
        document.createElement("span");

    eyebrow.textContent =
        "MEMBER / 026";

    const name =
        document.createElement("strong");

    name.textContent =
        user.name || user.email;

    const saved =
        document.createElement("a");

    saved.href =
        "#";

    saved.textContent =
        "SAVED";

    const ratings =
        document.createElement("a");

    ratings.href =
        "#";

    ratings.textContent =
        "MY RATINGS";

    const tickets =
        document.createElement("a");

    tickets.href =
        getPageHref("tickets.html");

    tickets.textContent =
        "MY TICKETS";

    const logout =
        document.createElement("button");

    logout.type =
        "button";

    logout.textContent =
        "LOG OUT";

    logout.addEventListener("click", () => {
        logoutUser();
        window.location.href =
            window.location.pathname.includes("/pages/")
                ? "../index.html"
                : "./index.html";
    });

    button.addEventListener("click", () => {
        menu.hidden =
            !menu.hidden;
    });

    document.addEventListener("click", (event) => {
        if (!wrapper.contains(event.target)) {
            menu.hidden =
                true;
        }
    });

    menu.append(eyebrow, name, saved, ratings, tickets, logout);
    wrapper.append(button, menu);

    return wrapper;

}


export function initializeUserNavigation() {

    const header =
        document.querySelector(".header__container");

    if (!header || header.querySelector(".header__member")) {
        return;
    }

    const member =
        document.createElement("div");

    member.className =
        "header__member";

    const currentUser =
        getCurrentUser();

    member.append(
        currentUser
            ? createUserMenu(currentUser)
            : createAccessLink()
    );

    header.append(member);

}
