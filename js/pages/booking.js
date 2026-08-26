import {
    getImageUrl,
    requestCachedTMDB
} from "../api/tmdb.js";

import {
    createPurchase,
    createReservation,
    formatCurrency,
    formatDateParts,
    getBookingData,
    getFunctionSeats,
    mergeSeatStatus,
    revalidateSelectedSeats,
    updateFunctionSeatStatus
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


const selectedSeats =
    [];


const state =
    {
        movieFunction: null,
        room: null,
        movie: null,
        seats: [],
        functionSeats: []
    };


function getElement(selector) {

    return document.querySelector(selector);

}


function getFunctionId() {

    return new URLSearchParams(window.location.search).get("functionId");

}


function groupSeatsByRow(seats) {

    return seats.reduce((rows, seat) => {
        if (!rows.has(seat.row)) {
            rows.set(seat.row, []);
        }

        rows.get(seat.row).push(seat);

        return rows;
    }, new Map());

}


function getRoomLabel() {

    return `${state.room.name} / ${state.room.type}`;

}


function renderSelectedSeats() {

    const list =
        getElement("#selectedSeatsList");

    const detail =
        getElement("#selectedSeatsDetail");

    const total =
        getElement("#bookingTotal");

    const breakdown =
        getElement("#bookingBreakdown");

    if (!list || !total || !breakdown || !detail) {
        return;
    }

    list.textContent =
        selectedSeats.length
            ? selectedSeats.map((seat) => seat.seatCode).join(" · ")
            : "NO SEATS SELECTED";

    detail.replaceChildren();

    selectedSeats.forEach((seat) => {
        const item =
            document.createElement("span");

        item.textContent =
            `${seat.seatCode} - ${seat.location}`;

        detail.append(item);
    });

    const amount =
        selectedSeats.length * Number(state.movieFunction.price);

    breakdown.textContent =
        `${selectedSeats.length} x ${formatCurrency(state.movieFunction.price)}`;

    total.textContent =
        formatCurrency(amount);

}


function toggleSeat(seat, button) {

    if (seat.status !== "available") {
        return;
    }

    const existingIndex =
        selectedSeats.findIndex((selectedSeat) => {
            return Number(selectedSeat.id) === Number(seat.id);
        });

    if (existingIndex >= 0) {
        selectedSeats.splice(existingIndex, 1);
        button.classList.remove("is-selected");
        button.setAttribute("aria-pressed", "false");
    } else {
        selectedSeats.push(seat);
        button.classList.add("is-selected");
        button.setAttribute("aria-pressed", "true");
    }

    renderSelectedSeats();

}


function renderSeatMap() {

    const map =
        getElement("#seatMap");

    if (!map) {
        return;
    }

    map.replaceChildren();

    const seatsWithStatus =
        mergeSeatStatus(state.seats, state.functionSeats);

    const rows =
        groupSeatsByRow(seatsWithStatus);

    rows.forEach((rowSeats, rowName) => {
        const row =
            document.createElement("div");

        row.className =
            "seat-row";

        const label =
            document.createElement("span");

        label.className =
            "seat-row__label";

        label.textContent =
            rowName;

        const seats =
            document.createElement("div");

        seats.className =
            "seat-row__seats";

        rowSeats.forEach((seat, index) => {
            const button =
                document.createElement("button");

            button.className =
                `seat seat--${seat.status}`;

            button.type =
                "button";

            button.textContent =
                seat.seatCode;

            button.disabled =
                seat.status === "reserved" || seat.status === "sold";

            button.title =
                `${seat.seatCode} / ${seat.location} / ${seat.status}`;

            button.setAttribute(
                "aria-label",
                `${seat.seatCode}, ${seat.location}, ${seat.status}`
            );

            button.setAttribute("aria-pressed", "false");

            if (index === Math.ceil(rowSeats.length / 2)) {
                button.classList.add("seat--after-aisle");
            }

            button.addEventListener("click", () => {
                toggleSeat(seat, button);
            });

            seats.append(button);
        });

        row.append(label, seats);
        map.append(row);
    });

}


function renderBooking() {

    const container =
        getElement("#bookingPage");

    const parts =
        formatDateParts(state.movieFunction.date);

    container.style.setProperty(
        "--booking-backdrop",
        `url("${getImageUrl(state.movie.backdrop_path, "w1280")}")`
    );

    extractMoviePalette(state.movie).then((palette) => {
        applyMoviePalette(container, palette);
    });

    container.innerHTML =
        `<section class="booking-shell">
            <aside class="booking-poster">
                <img src="${getImageUrl(state.movie.poster_path, "w342")}" alt="${state.movie.title}">
                <span>NOIR / SCREEN ${String(state.room.id).padStart(2, "0")}</span>
                <strong>${state.movie.title}</strong>
                <small>${parts.full} / ${state.movieFunction.time} / ${state.room.type}</small>
            </aside>

            <section class="seat-theater" aria-labelledby="bookingTitle">
                <span class="section__eyebrow">NOIR / SCREEN ${String(state.room.id).padStart(2, "0")}</span>
                <h1 id="bookingTitle">${state.movie.title}</h1>
                <p>${parts.full} / ${state.movieFunction.time} / ${getRoomLabel()}</p>

                <div class="screen-shape" aria-hidden="true">
                    <span>SCREEN</span>
                </div>

                <div class="seat-map" id="seatMap"></div>

                <div class="seat-legend" aria-label="Seat status legend">
                    <span><i class="seat-swatch seat-swatch--available"></i>Available</span>
                    <span><i class="seat-swatch seat-swatch--selected"></i>Selected</span>
                    <span><i class="seat-swatch seat-swatch--reserved"></i>Reserved</span>
                    <span><i class="seat-swatch seat-swatch--sold"></i>Sold</span>
                </div>
            </section>

            <aside class="booking-summary" aria-live="polite">
                <span>Your Seats</span>
                <strong id="selectedSeatsList">NO SEATS SELECTED</strong>
                <div class="selected-seat-detail" id="selectedSeatsDetail"></div>
                <small id="bookingBreakdown">0 x ${formatCurrency(state.movieFunction.price)}</small>
                <p id="bookingTotal">${formatCurrency(0)}</p>
                <p class="booking-message" id="bookingMessage"></p>
                <button class="button button--secondary" type="button" id="reserveButton">Reserve</button>
                <button class="button button--primary" type="button" id="purchaseButton">Buy Tickets</button>
            </aside>
        </section>`;

    renderSeatMap();
    bindCheckout();
    renderSelectedSeats();

}


function createTicketPayload(currentUser) {

    const total =
        selectedSeats.length * Number(state.movieFunction.price);

    return {
        userId: currentUser.id,
        userName: currentUser.name,
        email: currentUser.email,
        tmdbId: state.movieFunction.tmdbId,
        functionId: state.movieFunction.id,
        roomId: state.room.id,
        quantity: selectedSeats.length,
        seats: selectedSeats.map((seat) => {
            return {
                seatId: seat.id,
                seatCode: seat.seatCode,
                location: seat.location
            };
        }),
        total
    };

}


async function refreshAvailability(message) {

    state.functionSeats =
        await getFunctionSeats(state.movieFunction.id);

    selectedSeats.splice(0, selectedSeats.length);
    renderSeatMap();
    renderSelectedSeats();

    const messageElement =
        getElement("#bookingMessage");

    if (messageElement) {
        messageElement.textContent =
            message;
    }

}


async function completeCheckout(kind) {

    const message =
        getElement("#bookingMessage");

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        window.location.href =
            "./login.html";
        return;
    }

    if (!state.movieFunction || !selectedSeats.length) {
        message.textContent =
            "SELECT AT LEAST ONE SEAT";
        return;
    }

    const stillAvailable =
        await revalidateSelectedSeats(
            state.movieFunction.id,
            selectedSeats.map((seat) => seat.id)
        );

    if (!stillAvailable) {
        await refreshAvailability(
            "ONE OR MORE SEATS ARE NO LONGER AVAILABLE. PLEASE SELECT AGAIN."
        );
        return;
    }

    const payload =
        createTicketPayload(currentUser);

    const record =
        kind === "purchase"
            ? await createPurchase(payload)
            : await createReservation(payload);

    const nextStatus =
        kind === "purchase"
            ? "sold"
            : "reserved";

    // functionSeats une functionId + seatId: por eso cada horario tiene disponibilidad independiente.
    await Promise.all(selectedSeats.map((seat) => {
        return updateFunctionSeatStatus(seat.functionSeatId, nextStatus);
    }));

    window.location.href =
        `./tickets.html?highlight=${kind}-${record.id}`;

}


function bindCheckout() {

    const reserveButton =
        getElement("#reserveButton");

    const purchaseButton =
        getElement("#purchaseButton");

    reserveButton?.addEventListener("click", () => {
        completeCheckout("reservation").catch((error) => {
            console.error("Reservation unavailable.", error);
            getElement("#bookingMessage").textContent =
                "RESERVATION COULD NOT BE COMPLETED.";
        });
    });

    purchaseButton?.addEventListener("click", () => {
        completeCheckout("purchase").catch((error) => {
            console.error("Purchase unavailable.", error);
            getElement("#bookingMessage").textContent =
                "PURCHASE COULD NOT BE COMPLETED.";
        });
    });

}


async function initializeBooking() {

    initializeUserNavigation();

    const currentUser =
        getCurrentUser();

    if (!currentUser) {
        getElement("#bookingPage").innerHTML =
            '<section class="booking-empty"><h1>SIGN IN TO CONTINUE</h1><a class="button button--primary" href="./login.html">Access NOIR</a></section>';
        window.setTimeout(() => {
            window.location.href =
                "./login.html";
        }, 1200);
        return;
    }

    const functionId =
        getFunctionId();

    if (!functionId) {
        getElement("#bookingPage").innerHTML =
            '<p class="section__state">Missing function id.</p>';
        return;
    }

    try {
        const bookingData =
            await getBookingData(functionId);

        state.movieFunction =
            bookingData.movieFunction;

        state.room =
            bookingData.room;

        state.seats =
            bookingData.seats;

        state.functionSeats =
            bookingData.functionSeats;

        state.movie =
            await requestCachedTMDB(`/movie/${state.movieFunction.tmdbId}`, {
                language: "en-US"
            });

        document.title =
            `NOIR - Booking ${state.movie.title}`;

        renderBooking();
    } catch (error) {
        console.error("Booking unavailable.", error);
        getElement("#bookingPage").innerHTML =
            '<p class="section__state">Booking is unavailable.</p>';
    }

}


initializeBooking();
