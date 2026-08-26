import {
    JSON_SERVER_URL
} from "./json-server.js";


const USERS_URL =
    `${JSON_SERVER_URL}/users`;


const CURRENT_USER_KEY =
    "currentUser";


export const AUTH_ERROR_CODES =
    {
        DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
        DUPLICATE_EMAIL: "DUPLICATE_EMAIL",
        INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
        INVALID_USERS_RESPONSE: "INVALID_USERS_RESPONSE"
    };


function createAuthError(code, message, cause) {

    const error =
        new Error(message);

    error.code =
        code;

    if (cause) {
        error.cause =
            cause;
    }

    return error;

}


async function requestJson(url, options = {}) {

    let response;

    try {
        response =
            await fetch(url, options);
    } catch (error) {
        throw createAuthError(
            AUTH_ERROR_CODES.DATABASE_UNAVAILABLE,
            "Unable to connect to NOIR database.",
            error
        );
    }

    if (!response.ok) {
        throw createAuthError(
            AUTH_ERROR_CODES.DATABASE_UNAVAILABLE,
            `NOIR database responded with ${response.status}.`
        );
    }

    try {
        return await response.json();
    } catch (error) {
        throw createAuthError(
            AUTH_ERROR_CODES.DATABASE_UNAVAILABLE,
            "NOIR database returned an invalid response.",
            error
        );
    }

}


function normalizeEmail(email) {

    return String(email || "").trim().toLowerCase();

}


export async function findUserByEmail(email) {

    const users =
        await requestJson(USERS_URL);

    if (!Array.isArray(users)) {
        throw createAuthError(
            AUTH_ERROR_CODES.INVALID_USERS_RESPONSE,
            "NOIR users collection is not available."
        );
    }

    const normalizedEmail =
        normalizeEmail(email);

    return users.find((user) => {
        return normalizeEmail(user.email) === normalizedEmail;
    }) || null;

}


export async function registerUser({ name, email, password }) {

    const normalizedEmail =
        normalizeEmail(email);

    const normalizedName =
        String(name || "").trim();

    const existingUser =
        await findUserByEmail(normalizedEmail);

    if (existingUser) {
        throw createAuthError(
            AUTH_ERROR_CODES.DUPLICATE_EMAIL,
            "Email already exists."
        );
    }

    // Simulacion academica: JSON Server + localStorage no son auth segura de produccion.
    return requestJson(USERS_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            name: normalizedName,
            email: normalizedEmail,
            password: String(password || ""),
            createdAt: new Date().toISOString()
        })
    });

}


export function saveCurrentUser(user) {

    localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({
            id: user.id,
            name: user.name || user.email,
            email: normalizeEmail(user.email)
        })
    );

}


export function getCurrentUser() {

    try {
        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
    } catch {
        return null;
    }

}


export function logoutUser() {

    localStorage.removeItem(CURRENT_USER_KEY);

}


export async function loginUser({ email, password }) {

    const user =
        await findUserByEmail(normalizeEmail(email));

    if (!user || String(user.password || "") !== String(password || "")) {
        throw createAuthError(
            AUTH_ERROR_CODES.INVALID_CREDENTIALS,
            "Invalid credentials."
        );
    }

    saveCurrentUser(user);

    return user;

}
