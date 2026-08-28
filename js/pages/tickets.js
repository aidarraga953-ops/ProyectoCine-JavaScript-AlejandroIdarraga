import {
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";

import {
    createPurchase,
    formatCurrency,
    formatDateParts,
    getFunction,
    getPurchase,
    getPurchaseByReservation,
    getReservation,
    getRoom,
    getUserTickets,
    revalidateReservedSeatsForReservation,
    revalidateTicketSeatStatus,
    updateFunctionSeatStatus,
    updatePurchaseStatus,
    updateReservationStatus
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


const ticketCache =
    new Map();


let currentTickets =
    {
        reservations: [],
        purchases: []
    };


function getElement(selector) {

    return document.querySelector(selector);

}


function getHighlightKey() {

    return new URLSearchParams(window.location.search).get("highlight");

}


function escapeHtml(value) {

    return String(value ?? "").replace(/[&<>"']/g, (character) => {
        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "\"": "&quot;",
            "'": "&#039;"
        }[character];
    });

}


function formatTicketCode(kind, id) {

    const prefix =
        kind === "purchase"
            ? "PUR"
            : "RSV";

    return `NOIR-0426-${prefix}-${String(id).padStart(3, "0")}`;

}


function getSeatsLabel(record) {

    return (record.seats || []).map((seat) => {
        return seat.seatCode;
    }).join(" &middot; ");

}


function formatRuntime(minutes) {

    const runtime =
        Number(minutes || 0);

    if (!runtime) {
        return "NOIR";
    }

    const hours =
        Math.floor(runtime / 60);

    const remainingMinutes =
        runtime % 60;

    if (!hours) {
        return `${remainingMinutes}m`;
    }

    return `${hours}h ${String(remainingMinutes).padStart(2, "0")}m`;

}


function getTicketCacheKey(record, kind) {

    return `${kind}-${record.id}`;

}


function setTicketMessage(message, isError = false) {

    const messageElement =
        getElement("#ticketMessage");

    if (!messageElement) {
        return;
    }

    messageElement.textContent =
        message;

    messageElement.classList.toggle("is-error", isError);

    if (!isError && message) {
        window.setTimeout(() => {
            if (messageElement.textContent === message) {
                messageElement.textContent =
                    "";
            }
        }, 2600);
    }

}


async function getTicketViewModel(record, kind) {

    const cacheKey =
        getTicketCacheKey(record, kind);

    if (ticketCache.has(cacheKey)) {
        return ticketCache.get(cacheKey);
    }

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

    const model =
        {
            record,
            kind,
            movie,
            movieFunction,
            room,
            dateParts,
            code: formatTicketCode(kind, record.id),
            seatsLabel: getSeatsLabel(record),
            runtimeLabel: formatRuntime(movie.runtime),
            statusLabel: kind === "purchase" ? "CONFIRMED" : "RESERVED",
            posterUrl: getImageUrl(movie.poster_path, "w500"),
            backdropUrl: getImageUrl(movie.backdrop_path || movie.poster_path, "w780")
        };

    ticketCache.set(cacheKey, model);

    return model;

}


function applyTicketPalette(element, model) {

    element.style.setProperty(
        "--ticket-poster",
        `url("${model.posterUrl}")`
    );

    element.style.setProperty(
        "--ticket-backdrop",
        `url("${model.backdropUrl}")`
    );

    extractMoviePalette(model.movie).then((palette) => {
        applyMoviePalette(element, palette);
    });

}


function createTicketAction(model) {

    if (model.kind === "purchase") {
        return "";
    }

    return `<button class="cinema-ticket__pay" type="button" data-ticket-pay="${model.record.id}">PAY <span aria-hidden="true">-&gt;</span></button>`;

}


async function createTicketElement(record, kind) {

    const model =
        await getTicketViewModel(record, kind);

    const ticket =
        document.createElement("article");

    ticket.className =
        `cinema-ticket cinema-ticket--${kind}`;

    ticket.id =
        `${kind}-${record.id}`;

    if (getHighlightKey() === `${kind}-${record.id}`) {
        ticket.classList.add("is-highlighted");
    }

    applyTicketPalette(ticket, model);

    ticket.innerHTML =
        `<section class="cinema-ticket__poster">
            <img src="${model.posterUrl}" alt="${escapeHtml(model.movie.title)} poster">
        </section>
        <section class="cinema-ticket__info">
            <span class="cinema-ticket__runtime">${model.runtimeLabel}</span>
            <div class="cinema-ticket__status-row">
                <span class="cinema-ticket__status">${model.statusLabel}</span>
                <span class="cinema-ticket__sequence">${String(record.id).padStart(3, "0")}</span>
            </div>
            <h3>${escapeHtml(model.movie.title)}</h3>
            <p>${model.dateParts.day} ${model.dateParts.month} &middot; ${escapeHtml(model.movieFunction?.time || "TBA")}</p>
            <p>${model.room ? `${escapeHtml(model.room.name)} / ${escapeHtml(model.room.type)}` : "ROOM TBA"}</p>
            <strong>SEATS / ${model.seatsLabel}</strong>
            ${createTicketAction(model)}
            <i class="ticket-barcode" aria-hidden="true"></i>
            <code>${model.code}</code>
        </section>
        <button class="cinema-ticket__open" type="button" aria-label="Open ${model.statusLabel.toLowerCase()} ticket for ${escapeHtml(model.movie.title)}"></button>`;

    ticket.querySelector(".cinema-ticket__open")?.addEventListener("click", () => {
        openTicketModal(model);
    });

    ticket.querySelector("[data-ticket-pay]")?.addEventListener("click", (event) => {
        event.stopPropagation();
        openTicketModal(model);
    });

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


function getTicketModal() {

    let modal =
        getElement("#ticketModal");

    if (modal) {
        return modal;
    }

    modal =
        document.createElement("div");

    modal.id =
        "ticketModal";

    modal.className =
        "ticket-modal";

    modal.setAttribute("aria-hidden", "true");

    modal.innerHTML =
        `<div class="ticket-modal__overlay" data-ticket-close></div>
        <section class="ticket-modal__panel" role="dialog" aria-modal="true" aria-labelledby="ticketModalTitle">
            <button class="ticket-modal__close" type="button" aria-label="Close ticket" data-ticket-close>&times;</button>
            <div class="ticket-modal__content" id="ticketModalContent"></div>
        </section>`;

    document.body.append(modal);

    modal.querySelectorAll("[data-ticket-close]").forEach((element) => {
        element.addEventListener("click", closeTicketModal);
    });

    return modal;

}


function getPrimaryAction(model, mode) {

    if (mode === "confirm-cancel") {
        return `<button class="button button--secondary ticket-modal__keep" type="button" data-modal-keep>KEEP TICKETS</button>
        <button class="button button--primary ticket-modal__pay" type="button" data-modal-confirm-cancel>${model.kind === "reservation" ? "CANCEL RESERVATION ->" : "CANCEL PURCHASE ->"}</button>`;
    }

    if (mode === "working") {
        return `<button class="button button--primary ticket-modal__pay" type="button" disabled>PROCESSING...</button>`;
    }

    if (model.kind === "reservation") {
        return `<button class="button button--primary ticket-modal__pay" type="button" data-modal-pay>PAY TICKETS -></button>
        <button class="ticket-modal__cancel" type="button" data-modal-cancel>CANCEL RESERVATION</button>`;
    }

    return `<span class="ticket-modal__admit">ADMIT / CONFIRMED</span>
    <button class="ticket-modal__cancel" type="button" data-modal-cancel>CANCEL PURCHASE</button>`;

}


function renderModalContent(model, mode = "default", message = "") {

    const modal =
        getTicketModal();

    const content =
        modal.querySelector("#ticketModalContent");

    applyTicketPalette(modal, model);

    content.innerHTML =
        `<div class="ticket-modal__poster">
            <img src="${model.posterUrl}" alt="${escapeHtml(model.movie.title)} poster">
        </div>
        <div class="ticket-modal__details">
            <span>${model.statusLabel} / NOIR ${String(model.record.id).padStart(3, "0")}</span>
            <h2 id="ticketModalTitle">${escapeHtml(model.movie.title)}</h2>
            <p>${model.dateParts.full}</p>
            <p>${escapeHtml(model.movieFunction?.time || "TBA")}</p>
            <p>${model.room ? `${escapeHtml(model.room.name)} / ${escapeHtml(model.room.type)}` : "ROOM TBA"}</p>
            <span>SEATS</span>
            <strong>${model.seatsLabel}</strong>
            <dl>
                <div>
                    <dt>${model.record.quantity} TICKETS</dt>
                    <dd>${formatCurrency(model.record.total)}</dd>
                </div>
                <div>
                    <dt>CODE</dt>
                    <dd>${model.code}</dd>
                </div>
            </dl>
            ${mode === "confirm-cancel"
                ? `<div class="ticket-modal__confirm">
                    <strong>${model.kind === "reservation" ? "CANCEL RESERVATION?" : "CANCEL PURCHASE?"}</strong>
                    <p>THESE SEATS WILL BECOME AVAILABLE AGAIN.</p>
                    <small>${model.seatsLabel}</small>
                </div>`
                : ""}
            <p class="ticket-modal__message${message ? " is-visible" : ""}" id="ticketPaymentMessage">${message}</p>
            <div class="ticket-modal__actions">
                ${getPrimaryAction(model, mode)}
            </div>
        </div>`;

    content.querySelector("[data-modal-pay]")?.addEventListener("click", () => {
        payReservation(model).catch((error) => {
            console.error("Payment unavailable.", error);
            renderModalContent(
                model,
                "default",
                "PAYMENT COULD NOT BE COMPLETED. YOUR RESERVATION IS STILL SAFE."
            );
        });
    });

    content.querySelector("[data-modal-cancel]")?.addEventListener("click", () => {
        renderModalContent(model, "confirm-cancel");
    });

    content.querySelector("[data-modal-keep]")?.addEventListener("click", () => {
        renderModalContent(model);
    });

    content.querySelector("[data-modal-confirm-cancel]")?.addEventListener("click", () => {
        cancelTicket(model).catch((error) => {
            console.error("Ticket cancellation unavailable.", error);
            renderModalContent(
                model,
                "default",
                model.kind === "reservation"
                    ? "RESERVATION COULD NOT BE CANCELLED."
                    : "PURCHASE COULD NOT BE CANCELLED."
            );
        });
    });

}


function openTicketModal(model) {

    const modal =
        getTicketModal();

    renderModalContent(model);

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    modal.querySelector(".ticket-modal__close")?.focus();

}


function closeTicketModal() {

    const modal =
        getElement("#ticketModal");

    if (!modal) {
        return;
    }

    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

}


async function convertReservationToPurchase(model) {

    const freshReservation =
        await getReservation(model.record.id);

    if (freshReservation.status !== "reserved" && freshReservation.status !== "confirmed") {
        throw new Error("Reservation is no longer active.");
    }

    const validation =
        await revalidateReservedSeatsForReservation(freshReservation);

    if (!validation.valid) {
        throw new Error("Reservation seats are no longer reserved for this ticket.");
    }

    const existingPurchase =
        await getPurchaseByReservation(freshReservation.id);

    const purchase =
        existingPurchase ||
        await createPurchase({
                userId: freshReservation.userId,
                userName: freshReservation.userName || freshReservation.name,
                email: freshReservation.email,
                tmdbId: freshReservation.tmdbId,
                functionId: freshReservation.functionId,
                roomId: freshReservation.roomId,
                quantity: freshReservation.quantity,
                seats: freshReservation.seats,
                total: freshReservation.total,
                sourceReservationId: freshReservation.id
            });

    await Promise.all(validation.functionSeats.map((functionSeat) => {
        return updateFunctionSeatStatus(functionSeat.id, "sold", {
            reservationId: null,
            reservedByUserId: null,
            purchaseId: purchase.id
        });
    }));

    await updateReservationStatus(freshReservation.id, "paid");

    return purchase;

}


async function payReservation(model) {

    renderModalContent(model, "working", "CONFIRMING TICKETS...");

    const purchase =
        await convertReservationToPurchase(model);

    renderModalContent(model, "working", "TICKETS CONFIRMED.");

    await refreshTickets(`purchase-${purchase.id}`);

    window.setTimeout(() => {
        closeTicketModal();
    }, 900);

}


async function cancelTicket(model) {

    renderModalContent(model, "working", "UPDATING TICKETS...");

    if (model.kind === "reservation") {
        await cancelReservation(model);
        renderModalContent(model, "working", "RESERVATION CANCELLED.");
        await refreshTickets();
        window.setTimeout(closeTicketModal, 900);
        return;
    }

    await cancelPurchase(model);
    renderModalContent(model, "working", "PURCHASE CANCELLED.");
    await refreshTickets();
    window.setTimeout(closeTicketModal, 900);

}


async function cancelReservation(model) {

    const freshReservation =
        await getReservation(model.record.id);

    if (freshReservation.status !== "reserved" && freshReservation.status !== "confirmed") {
        throw new Error("Reservation is no longer active.");
    }

    const validation =
        await revalidateTicketSeatStatus(freshReservation, "reserved", "reservationId");

    if (!validation.valid) {
        throw new Error("Reservation seats are no longer reserved.");
    }

    await Promise.all(validation.functionSeats.map((functionSeat) => {
        return updateFunctionSeatStatus(functionSeat.id, "available", {
            reservationId: null,
            reservedByUserId: null
        });
    }));

    await updateReservationStatus(freshReservation.id, "cancelled");

}


async function cancelPurchase(model) {

    const freshPurchase =
        await getPurchase(model.record.id);

    if (freshPurchase.status === "cancelled") {
        throw new Error("Purchase is already cancelled.");
    }

    const validation =
        await revalidateTicketSeatStatus(freshPurchase, "sold", "purchaseId");

    if (!validation.valid) {
        throw new Error("Purchase seats are no longer sold.");
    }

    await Promise.all(validation.functionSeats.map((functionSeat) => {
        return updateFunctionSeatStatus(functionSeat.id, "available", {
            purchaseId: null,
            reservationId: null,
            reservedByUserId: null
        });
    }));

    await updatePurchaseStatus(freshPurchase.id, "cancelled");

}


async function refreshTickets(highlightId = "") {

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        return;
    }

    currentTickets =
        await getUserTickets(currentUser.id);

    getElement("#reservationCount").textContent =
        String(currentTickets.reservations.length);

    getElement("#purchaseCount").textContent =
        String(currentTickets.purchases.length);

    await Promise.all([
        renderTicketList(getElement("#reservationsList"), currentTickets.reservations, "reservation"),
        renderTicketList(getElement("#purchasesList"), currentTickets.purchases, "purchase")
    ]);

    const highlighted =
        highlightId
            ? document.getElementById(highlightId)
            : document.getElementById(getHighlightKey());

    highlighted?.classList.add("is-highlighted");
    highlighted?.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


function bindTicketModalKeyboard() {

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeTicketModal();
        }
    });

}


async function initializeTickets() {

    initializeUserNavigation();
    bindTicketModalKeyboard();

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
        const heading =
            getElement(".page-heading");

        if (!getElement("#ticketMessage")) {
            const message =
                document.createElement("p");

            message.id =
                "ticketMessage";

            message.className =
                "ticket-message";

            heading?.append(message);
        }

        await refreshTickets();
    } catch (error) {
        console.error("Tickets unavailable.", error);
        getElement("#reservationsList").innerHTML =
            '<p class="section__state">Tickets are unavailable.</p>';
        getElement("#purchasesList").innerHTML =
            '<p class="section__state">Tickets are unavailable.</p>';
    }

}


initializeTickets();
