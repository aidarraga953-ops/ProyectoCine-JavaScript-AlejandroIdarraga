import {
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";

import {
    formatCurrency,
    formatDateParts,
    getFunction,
    getRoom,
    getUserTickets
} from "../api/cinema-api.js";

import {
    getCurrentUser
} from "../api/noir-auth.js";

import {
    initializeUserNavigation
} from "../components/user-navigation.js";

import {
    applyMoviePalette,
    extractMoviePalette
} from "../utils/movie-palette.js";


function getElement(selector) {

    return document.querySelector(selector);

}


function getHighlightKey() {

    return new URLSearchParams(window.location.search).get("highlight");

}


function formatTicketCode(kind, id) {

    const prefix =
        kind === "purchase"
            ? "ADM"
            : "RSV";

    return `NOIR-0426-${prefix}-${String(id).padStart(3, "0")}`;

}


async function createTicketElement(record, kind) {

    const [
        movie,
        movieFunction,
        room
    ] =
        await Promise.all([
            requestCachedTMDB(`/movie/${record.tmdbId}`, { language: "en-US" }),
            getFunction(record.functionId).catch(() => null),
            getRoom(record.roomId).catch(() => null)
        ]);

    const dateParts =
        formatDateParts(movieFunction?.date || "");

    const statusLabel =
        kind === "purchase"
            ? "ADMIT ONE"
            : "RESERVED";

    const code =
        formatTicketCode(kind, record.id);

    const ticket =
        document.createElement("article");

    ticket.className =
        "noir-ticket";

    ticket.id =
        `${kind}-${record.id}`;

    if (getHighlightKey() === `${kind}-${record.id}`) {
        ticket.classList.add("is-highlighted");
    }

    ticket.style.setProperty(
        "--ticket-backdrop",
        `url("${getImageUrl(movie.backdrop_path, "w780")}")`
    );

    extractMoviePalette(movie).then((palette) => {
        applyMoviePalette(ticket, palette);
    });

    ticket.innerHTML =
        `<div class="noir-ticket__image" aria-hidden="true"></div>
        <div class="noir-ticket__body">
            <span>${statusLabel} / ${String(record.id).padStart(2, "0")}</span>
            <h3>${movie.title}</h3>
            <p>${dateParts.month} ${dateParts.day} / ${movieFunction?.time || "TBA"}</p>
            <p>${room ? `${room.name} / ${room.type}` : "Room TBA"}</p>
            <p>${record.quantity} tickets / ${formatCurrency(record.total)}</p>
            <small>NOIR Cinema Admittance / Motion Archive / Est. 2026</small>
        </div>
        <aside class="noir-ticket__stub">
            <strong>NOIR</strong>
            <span>${record.seats.map((seat) => seat.seatCode).join(" ")}</span>
            <i class="ticket-barcode" aria-hidden="true"></i>
            <small>${code}</small>
        </aside>`;

    return ticket;

}


async function renderTicketList(container, records, kind) {

    container.replaceChildren();

    if (!records.length) {
        const empty =
            document.createElement("p");

        empty.className =
            "section__state";

        empty.textContent =
            "No tickets yet.";

        container.append(empty);
        return;
    }

    const tickets =
        await Promise.all(records.map((record) => {
            return createTicketElement(record, kind);
        }));

    tickets.forEach((ticket) => {
        container.append(ticket);
    });

}


async function initializeTickets() {

    initializeUserNavigation();

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        getElement(".tickets-page").innerHTML =
            '<section class="booking-empty"><h1>SIGN IN TO CONTINUE</h1><a class="button button--primary" href="./login.html">Access NOIR</a></section>';
        window.setTimeout(() => {
            window.location.href =
                "./login.html";
        }, 1200);
        return;
    }

    try {
        const tickets =
            await getUserTickets(currentUser.id);

        getElement("#reservationCount").textContent =
            String(tickets.reservations.length);

        getElement("#purchaseCount").textContent =
            String(tickets.purchases.length);

        await Promise.all([
            renderTicketList(getElement("#reservationsList"), tickets.reservations, "reservation"),
            renderTicketList(getElement("#purchasesList"), tickets.purchases, "purchase")
        ]);

        const highlighted =
            document.getElementById(getHighlightKey());

        highlighted?.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    } catch (error) {
        console.error("Tickets unavailable.", error);
        getElement("#reservationsList").innerHTML =
            '<p class="section__state">Tickets are unavailable.</p>';
        getElement("#purchasesList").innerHTML =
            '<p class="section__state">Tickets are unavailable.</p>';
    }

}


initializeTickets();
