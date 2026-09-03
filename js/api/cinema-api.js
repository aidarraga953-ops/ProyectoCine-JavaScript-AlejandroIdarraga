import {
    JSON_SERVER_URL
} from "./json-server.js";


const JSON_HEADERS =
    {
        "Content-Type": "application/json"
    };


async function requestJson(path, options = {}) {

    const response =
        await fetch(`${JSON_SERVER_URL}${path}`, options);

    if (!response.ok) {
        throw new Error(`JSON Server responded with ${response.status} for ${path}`);
    }

    return response.json();

}


function toDateValue(date) {

    return date.toISOString().slice(0, 10);

}


function addDays(date, days) {

    const nextDate =
        new Date(date);

    nextDate.setDate(nextDate.getDate() + days);

    return nextDate;

}


function getTodayValue() {

    return toDateValue(new Date());

}


function hasFutureFunction(functions) {

    const today =
        getTodayValue();

    return functions.some((movieFunction) => {
        return movieFunction.date >= today;
    });

}


function getDefaultSchedule(rooms) {

    const today =
        getTodayValue();

    const tomorrow =
        toDateValue(addDays(new Date(), 1));

    const standardRoom =
        rooms.find((room) => room.type === "STANDARD") || rooms[0];

    const imaxRoom =
        rooms.find((room) => room.type === "IMAX") || rooms[1] || standardRoom;

    return [
        {
            roomId: standardRoom.id,
            date: today,
            time: "16:00",
            price: standardRoom.type === "IMAX" ? 18000 : 14000
        },
        {
            roomId: standardRoom.id,
            date: today,
            time: "18:30",
            price: standardRoom.type === "IMAX" ? 18000 : 14000
        },
        {
            roomId: standardRoom.id,
            date: today,
            time: "21:00",
            price: standardRoom.type === "IMAX" ? 18000 : 14000
        },
        {
            roomId: standardRoom.id,
            date: tomorrow,
            time: "17:00",
            price: standardRoom.type === "IMAX" ? 18000 : 14000
        },
        {
            roomId: standardRoom.id,
            date: tomorrow,
            time: "20:00",
            price: standardRoom.type === "IMAX" ? 18000 : 14000
        },
        {
            roomId: imaxRoom.id,
            date: tomorrow,
            time: "19:30",
            price: imaxRoom.type === "IMAX" ? 18000 : 14000
        }
    ];

}


function getScheduleForDate(rooms, dateValue) {

    const standardRoom =
        rooms.find((room) => room.type === "STANDARD") || rooms[0];

    const imaxRoom =
        rooms.find((room) => room.type === "IMAX") || rooms[1] || standardRoom;

    return [
        {
            roomId: standardRoom.id,
            date: dateValue,
            time: "16:00",
            price: standardRoom.type === "IMAX" ? 18000 : 14000
        },
        {
            roomId: standardRoom.id,
            date: dateValue,
            time: "18:30",
            price: standardRoom.type === "IMAX" ? 18000 : 14000
        },
        {
            roomId: standardRoom.id,
            date: dateValue,
            time: "21:00",
            price: standardRoom.type === "IMAX" ? 18000 : 14000
        },
        {
            roomId: imaxRoom.id,
            date: dateValue,
            time: "19:30",
            price: imaxRoom.type === "IMAX" ? 18000 : 14000
        }
    ];

}


function findMatchingFunction(functions, draft) {

    return functions.find((movieFunction) => {
        return Number(movieFunction.roomId) === Number(draft.roomId) &&
            movieFunction.date === draft.date &&
            movieFunction.time === draft.time;
    });

}


function normalizeNumericId(value) {

    const numericId =
        Number(value);

    return Number.isFinite(numericId)
        ? numericId
        : null;

}


function matchesNumericId(recordValue, expectedValue) {

    const recordId =
        normalizeNumericId(recordValue);

    const expectedId =
        normalizeNumericId(expectedValue);

    return recordId !== null &&
        expectedId !== null &&
        recordId === expectedId;

}


function sortFunctionsByDateAndTime(functions) {

    return [...functions].sort((first, second) => {
        return `${first.date || ""}${first.time || ""}`.localeCompare(
            `${second.date || ""}${second.time || ""}`
        );
    });

}


export function formatCurrency(value) {

    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 0
    }).format(Number(value || 0));

}


export function formatDateParts(dateValue) {

    if (!dateValue) {
        return {
            day: "TBA",
            weekday: "TBA",
            month: "TBA",
            full: "DATE TBA"
        };
    }

    const date =
        new Date(`${dateValue}T12:00:00`);

    return {
        day: new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(date),
        weekday: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date).toUpperCase(),
        month: new Intl.DateTimeFormat("en-US", { month: "short" }).format(date).toUpperCase(),
        full: new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric"
        }).format(date).toUpperCase()
    };

}


export async function getMovieFunctions(tmdbId) {

    const functions =
        await requestJson("/functions?_sort=date,time&_order=asc,asc");

    return sortFunctionsByDateAndTime(
        functions.filter((movieFunction) => {
            return matchesNumericId(movieFunction.tmdbId, tmdbId);
        })
    );

}


export async function getMovieFunctionsByDate(tmdbId, dateValue) {

    const functions =
        await requestJson(`/functions?date=${dateValue}&_sort=time&_order=asc`);

    return sortFunctionsByDateAndTime(
        functions.filter((movieFunction) => {
            return matchesNumericId(movieFunction.tmdbId, tmdbId);
        })
    );

}


export async function createFunction(payload) {

    return requestJson("/functions", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
    });

}


export async function getRooms() {

    return requestJson("/rooms");

}


export async function getRoom(roomId) {

    return requestJson(`/rooms/${roomId}`);

}


export async function getFunction(functionId) {

    return requestJson(`/functions/${functionId}`);

}


export async function getSeatsByRoom(roomId) {

    return requestJson(`/seats?roomId=${roomId}&_sort=row,number&_order=asc,asc`);

}


export async function createFunctionSeat(payload) {

    return requestJson("/functionSeats", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify(payload)
    });

}


export async function getFunctionSeats(functionId) {

    return requestJson(`/functionSeats?functionId=${functionId}`);

}


export async function getFunctionSeatsBySeatIds(functionId, seatIds) {

    const selectedIds =
        new Set(seatIds.map(Number));

    const functionSeats =
        await getFunctionSeats(functionId);

    return functionSeats.filter((functionSeat) => {
        return selectedIds.has(Number(functionSeat.seatId));
    });

}


export async function ensureFunctionSeats(movieFunction, roomSeats = null) {

    const existingFunctionSeats =
        await getFunctionSeats(movieFunction.id);

    const seats =
        roomSeats || await getSeatsByRoom(movieFunction.roomId);

    const existingSeatIds =
        new Set(existingFunctionSeats.map((functionSeat) => {
            return Number(functionSeat.seatId);
        }));

    const missingSeats =
        seats.filter((seat) => {
            return !existingSeatIds.has(Number(seat.id));
        });

    if (!missingSeats.length) {
        return existingFunctionSeats;
    }

    // Cada functionSeat guarda el estado para una pareja concreta functionId + seatId.
    const createdFunctionSeats =
        [];

    for (const seat of missingSeats) {
        const functionSeat =
            await createFunctionSeat({
            functionId: movieFunction.id,
            seatId: seat.id,
            status: "available"
        });

        createdFunctionSeats.push(functionSeat);
    }

    return [
        ...existingFunctionSeats,
        ...createdFunctionSeats
    ];

}


export async function createDefaultFunctionsForMovie(tmdbId, existingFunctions = [], options = {}) {

    const shouldEnsureSeats =
        options.ensureSeats !== false;

    const rooms =
        await getRooms();

    if (!rooms.length) {
        return [];
    }

    const schedule =
        getDefaultSchedule(rooms);

    const createdFunctions =
        [];

    for (const draft of schedule) {
        const existingFunction =
            findMatchingFunction(existingFunctions, draft);

        if (existingFunction) {
            createdFunctions.push(existingFunction);
            continue;
        }

        const movieFunction =
            await createFunction({
                tmdbId: Number(tmdbId),
                roomId: draft.roomId,
                date: draft.date,
                time: draft.time,
                price: draft.price
            });

        if (shouldEnsureSeats) {
            await ensureFunctionSeats(movieFunction);
        }

        createdFunctions.push(movieFunction);
    }

    return createdFunctions;

}


export async function createDefaultFunctionsForDate(tmdbId, dateValue, existingFunctions = [], options = {}) {

    const shouldEnsureSeats =
        options.ensureSeats !== false;

    const rooms =
        await getRooms();

    if (!rooms.length) {
        return [];
    }

    const schedule =
        getScheduleForDate(rooms, dateValue);

    const createdFunctions =
        [];

    for (const draft of schedule) {
        const existingFunction =
            findMatchingFunction(existingFunctions, draft);

        if (existingFunction) {
            createdFunctions.push(existingFunction);
            continue;
        }

        const movieFunction =
            await createFunction({
                tmdbId: Number(tmdbId),
                roomId: draft.roomId,
                date: draft.date,
                time: draft.time,
                price: draft.price
            });

        if (shouldEnsureSeats) {
            await ensureFunctionSeats(movieFunction);
        }

        createdFunctions.push(movieFunction);
    }

    return createdFunctions;

}


export async function getOrCreateFunctionsForDate(tmdbId, dateValue) {

    let functions =
        await getMovieFunctionsByDate(tmdbId, dateValue);

    if (!functions.length) {
        await createDefaultFunctionsForDate(tmdbId, dateValue, functions, {
            ensureSeats: false
        });

        functions =
            await getMovieFunctionsByDate(tmdbId, dateValue);
    }

    return functions;

}


export async function ensureFunctionsForDate(tmdbId, dateValue) {

    let functions =
        await getMovieFunctionsByDate(tmdbId, dateValue);

    if (!functions.length) {
        await createDefaultFunctionsForDate(tmdbId, dateValue, functions);

        functions =
            await getMovieFunctionsByDate(tmdbId, dateValue);
    }

    for (const movieFunction of functions) {
        await ensureFunctionSeats(movieFunction);
    }

    return functions;

}


export async function ensureMovieFunctions(tmdbId) {

    let functions =
        await getMovieFunctions(tmdbId);

    if (!functions.length || !hasFutureFunction(functions)) {
        await createDefaultFunctionsForMovie(tmdbId, functions);

        functions =
            await getMovieFunctions(tmdbId);
    }

    for (const movieFunction of functions) {
        await ensureFunctionSeats(movieFunction);
    }

    return functions;

}


export async function getBookingData(functionId) {

    const movieFunction =
        await getFunction(functionId);

    await ensureFunctionSeats(movieFunction);

    const [
        room,
        seats,
        functionSeats
    ] =
        await Promise.all([
            getRoom(movieFunction.roomId),
            getSeatsByRoom(movieFunction.roomId),
            getFunctionSeats(movieFunction.id)
        ]);

    return {
        movieFunction,
        room,
        seats,
        functionSeats
    };

}


export function mergeSeatStatus(seats, functionSeats) {

    const statusBySeatId =
        new Map(functionSeats.map((functionSeat) => {
            return [Number(functionSeat.seatId), functionSeat];
        }));

    return seats.map((seat) => {
        const functionSeat =
            statusBySeatId.get(Number(seat.id));

        return {
            ...seat,
            functionSeatId: functionSeat?.id,
            status: functionSeat?.status || "available"
        };
    });

}


export async function revalidateSelectedSeats(functionId, seatIds) {

    const freshFunctionSeats =
        await getFunctionSeats(functionId);

    const selectedIds =
        new Set(seatIds.map(Number));

    const selectedFunctionSeats =
        freshFunctionSeats.filter((functionSeat) => {
        return selectedIds.has(Number(functionSeat.seatId));
    });

    if (selectedFunctionSeats.length !== selectedIds.size) {
        return false;
    }

    return selectedFunctionSeats.every((functionSeat) => {
        return functionSeat.status === "available";
    });

}


export async function revalidateReservedSeatsForReservation(reservation) {

    return revalidateTicketSeatStatus(reservation, "reserved", "reservationId");

}


export async function revalidateTicketSeatStatus(record, status, ownerKey = "") {

    const seatIds =
        (record.seats || []).map((seat) => {
            return Number(seat.seatId);
        });

    const expectedSeatIds =
        new Set(seatIds);

    const functionSeats =
        await getFunctionSeatsBySeatIds(record.functionId, seatIds);

    if (functionSeats.length !== expectedSeatIds.size) {
        return {
            valid: false,
            functionSeats: []
        };
    }

    const valid =
        functionSeats.every((functionSeat) => {
            const sameOwner =
                !ownerKey ||
                !functionSeat[ownerKey] ||
                Number(functionSeat[ownerKey]) === Number(record.id);

            return expectedSeatIds.has(Number(functionSeat.seatId)) &&
                functionSeat.status === status &&
                sameOwner;
        });

    return {
        valid,
        functionSeats
    };

}


export async function getReservation(reservationId) {

    return requestJson(`/reservations/${reservationId}`);

}


export async function getPurchase(purchaseId) {

    return requestJson(`/purchases/${purchaseId}`);

}


export async function getPurchaseByReservation(reservationId) {

    const purchases =
        await requestJson(`/purchases?sourceReservationId=${reservationId}`);

    return purchases.find((purchase) => {
        return purchase.status !== "cancelled";
    }) || null;

}


export async function createReservation(payload) {

    return requestJson("/reservations", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
            ...payload,
            status: "reserved",
            createdAt: new Date().toISOString()
        })
    });

}


export async function createPurchase(payload) {

    return requestJson("/purchases", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({
            ...payload,
            status: "sold",
            createdAt: new Date().toISOString()
        })
    });

}


export async function updateReservationStatus(reservationId, status) {

    return requestJson(`/reservations/${reservationId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({
            status,
            updatedAt: new Date().toISOString()
        })
    });

}


export async function updatePurchaseStatus(purchaseId, status) {

    return requestJson(`/purchases/${purchaseId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({
            status,
            updatedAt: new Date().toISOString()
        })
    });

}


export async function updateFunctionSeatStatus(functionSeatId, status, metadata = {}) {

    return requestJson(`/functionSeats/${functionSeatId}`, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({
            ...metadata,
            status
        })
    });

}


export async function getUserTickets(userId) {

    const [
        reservations,
        purchases
    ] =
        await Promise.all([
            requestJson(`/reservations?userId=${userId}&_sort=createdAt&_order=desc`),
            requestJson(`/purchases?userId=${userId}&_sort=createdAt&_order=desc`)
        ]);

    return {
        reservations: reservations.filter((reservation) => {
            return reservation.status === "reserved" ||
                reservation.status === "confirmed";
        }),
        purchases: purchases.filter((purchase) => {
            return purchase.status !== "cancelled";
        })
    };

}
